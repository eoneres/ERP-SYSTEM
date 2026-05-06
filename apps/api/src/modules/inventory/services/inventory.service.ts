import {
  Injectable, NotFoundException, BadRequestException, Logger, Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

import { Product, ProductStatus } from '../entities/product.entity';
import { Warehouse } from '../entities/warehouse.entity';
import { StockMovement, MovementType, MovementReason } from '../entities/stock-movement.entity';
import {
  CreateProductDto, UpdateProductDto,
  CreateWarehouseDto, UpdateWarehouseDto,
  CreateMovementDto,
  ProductFilterDto, MovementFilterDto,
} from '../dto/inventory.dto';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    @InjectRepository(Product)       private readonly productRepo:   Repository<Product>,
    @InjectRepository(Warehouse)     private readonly warehouseRepo: Repository<Warehouse>,
    @InjectRepository(StockMovement) private readonly movementRepo:  Repository<StockMovement>,
    private readonly dataSource:   DataSource,
    private readonly eventEmitter: EventEmitter2,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  // ─── Cache helpers ──────────────────────────────────────────────────────────

  private cacheKey(tenantId: string, suffix: string) {
    return `inventory:${tenantId}:${suffix}`;
  }

  private async bust(tenantId: string, ...suffixes: string[]) {
    await Promise.all(suffixes.map((s) => this.cache.del(this.cacheKey(tenantId, s))));
  }

  // ─── Products ───────────────────────────────────────────────────────────────

  async getProducts(tenantId: string, filter: ProductFilterDto) {
    const { page, limit, search, sortBy, sortOrder, status, category, lowStock } = filter;

    const qb = this.productRepo
      .createQueryBuilder('p')
      .where('p.tenantId = :tenantId', { tenantId })
      .andWhere('p.deletedAt IS NULL');

    if (search) {
      qb.andWhere(
        '(p.name ILIKE :s OR p.sku ILIKE :s OR p.barcode ILIKE :s OR p.brand ILIKE :s)',
        { s: `%${search}%` },
      );
    }
    if (status)   qb.andWhere('p.status = :status',         { status });
    if (category) qb.andWhere('p.category ILIKE :cat',      { cat: `%${category}%` });
    if (lowStock) qb.andWhere('p.stockQuantity <= p.minStock AND p.minStock > 0');

    const validSort: Record<string, string> = {
      name:          'p.name',
      sku:           'p.sku',
      stockQuantity: 'p.stockQuantity',
      costPrice:     'p.costPrice',
      salePrice:     'p.salePrice',
      createdAt:     'p.createdAt',
      category:      'p.category',
    };
    const orderCol = validSort[sortBy ?? ''] ?? 'p.name';
    qb.orderBy(orderCol, sortOrder ?? 'ASC');

    const skip = (page - 1) * limit;
    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async getProduct(id: string, tenantId: string) {
    const product = await this.productRepo.findOne({ where: { id, tenantId } });
    if (!product) throw new NotFoundException('Produto não encontrado');
    return product;
  }

  async createProduct(tenantId: string, userId: string, dto: CreateProductDto) {
    if (dto.sku) {
      const exists = await this.productRepo.findOne({ where: { sku: dto.sku, tenantId } });
      if (exists) throw new BadRequestException(`SKU '${dto.sku}' já está em uso`);
    }

    const product = this.productRepo.create({
      ...dto,
      tenantId,
      createdBy: userId,
      stockQuantity: dto.stockQuantity ?? 0,
    });
    const saved = await this.productRepo.save(product);

    if ((dto.stockQuantity ?? 0) > 0) {
      await this.movementRepo.save(
        this.movementRepo.create({
          tenantId,
          createdBy: userId,
          productId: saved.id,
          type: MovementType.IN,
          reason: MovementReason.ADJUSTMENT,
          quantity: dto.stockQuantity!,
          stockBefore: 0,
          stockAfter: dto.stockQuantity!,
          unitCost: dto.costPrice,
          movementDate: new Date(),
          notes: 'Estoque inicial',
        }),
      );
    }

    await this.bust(tenantId, 'summary', 'categories');
    this.eventEmitter.emit('inventory.product.created', { tenantId, productId: saved.id });
    return saved;
  }

  async updateProduct(id: string, tenantId: string, userId: string, dto: UpdateProductDto) {
    const product = await this.getProduct(id, tenantId);

    if (dto.sku && dto.sku !== product.sku) {
      const exists = await this.productRepo.findOne({ where: { sku: dto.sku, tenantId } });
      if (exists) throw new BadRequestException(`SKU '${dto.sku}' já está em uso`);
    }

    Object.assign(product, { ...dto, updatedBy: userId });
    const saved = await this.productRepo.save(product);
    await this.bust(tenantId, 'summary');
    return saved;
  }

  async deleteProduct(id: string, tenantId: string) {
    const product = await this.getProduct(id, tenantId);
    await this.productRepo.softRemove(product);
    await this.bust(tenantId, 'summary', 'categories');
  }

  async getCategories(tenantId: string): Promise<string[]> {
    const cacheKey = this.cacheKey(tenantId, 'categories');
    const cached = await this.cache.get<string[]>(cacheKey);
    if (cached) return cached;

    const result = await this.productRepo
      .createQueryBuilder('p')
      .select('DISTINCT p.category', 'category')
      .where('p.tenantId = :tenantId', { tenantId })
      .andWhere('p.category IS NOT NULL')
      .andWhere('p.deletedAt IS NULL')
      .getRawMany();

    const categories = result.map((r) => r.category).filter(Boolean).sort();
    await this.cache.set(cacheKey, categories, 60 * 5 * 1000);
    return categories;
  }

  // ─── Warehouses ─────────────────────────────────────────────────────────────

  async getWarehouses(tenantId: string) {
    return this.warehouseRepo.find({
      where: { tenantId, isActive: true },
      order: { isDefault: 'DESC', name: 'ASC' },
    });
  }

  async createWarehouse(tenantId: string, userId: string, dto: CreateWarehouseDto) {
    if (dto.isDefault) {
      await this.warehouseRepo.update({ tenantId }, { isDefault: false });
    }
    const wh = this.warehouseRepo.create({ ...dto, tenantId, createdBy: userId });
    return this.warehouseRepo.save(wh);
  }

  async updateWarehouse(id: string, tenantId: string, dto: UpdateWarehouseDto) {
    const wh = await this.warehouseRepo.findOne({ where: { id, tenantId } });
    if (!wh) throw new NotFoundException('Depósito não encontrado');
    if (dto.isDefault) {
      await this.warehouseRepo.update({ tenantId }, { isDefault: false });
    }
    Object.assign(wh, dto);
    return this.warehouseRepo.save(wh);
  }

  async deleteWarehouse(id: string, tenantId: string) {
    const wh = await this.warehouseRepo.findOne({ where: { id, tenantId } });
    if (!wh) throw new NotFoundException('Depósito não encontrado');
    wh.isActive = false;
    await this.warehouseRepo.save(wh);
  }

  // ─── Stock Movements ────────────────────────────────────────────────────────

  async getMovements(tenantId: string, filter: MovementFilterDto) {
    const { page, limit, productId, warehouseId, type, dateFrom, dateTo } = filter;

    const qb = this.movementRepo
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.product', 'product')
      .leftJoinAndSelect('m.warehouse', 'warehouse')
      .where('m.tenantId = :tenantId', { tenantId });

    if (productId)   qb.andWhere('m.productId = :productId',     { productId });
    if (warehouseId) qb.andWhere('m.warehouseId = :warehouseId', { warehouseId });
    if (type)        qb.andWhere('m.type = :type',               { type });
    if (dateFrom)    qb.andWhere('m.movementDate >= :dateFrom',  { dateFrom });
    if (dateTo)      qb.andWhere('m.movementDate <= :dateTo',    { dateTo });

    qb.orderBy('m.movementDate', 'DESC').addOrderBy('m.createdAt', 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async createMovement(tenantId: string, userId: string, dto: CreateMovementDto) {
    return this.dataSource.transaction(async (em) => {
      const product = await em.findOne(Product, {
        where: { id: dto.productId, tenantId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!product) throw new NotFoundException('Produto não encontrado');

      const stockBefore = Number(product.stockQuantity);
      let stockAfter: number;

      switch (dto.type) {
        case MovementType.IN:
        case MovementType.RETURN:
          stockAfter = stockBefore + dto.quantity;
          break;
        case MovementType.OUT:
        case MovementType.LOSS:
          if (stockBefore < dto.quantity) {
            throw new BadRequestException(
              `Estoque insuficiente. Disponível: ${stockBefore}, Solicitado: ${dto.quantity}`,
            );
          }
          stockAfter = stockBefore - dto.quantity;
          break;
        case MovementType.ADJUST:
          stockAfter = dto.quantity;
          break;
        case MovementType.TRANSFER:
          if (stockBefore < dto.quantity) {
            throw new BadRequestException('Estoque insuficiente para transferência');
          }
          stockAfter = stockBefore - dto.quantity;
          break;
        default:
          stockAfter = stockBefore;
      }

      product.stockQuantity = stockAfter;
      await em.save(Product, product);

      const movement = em.create(StockMovement, {
        ...dto,
        tenantId,
        createdBy: userId,
        stockBefore,
        stockAfter,
        movementDate: dto.movementDate ? new Date(dto.movementDate) : new Date(),
        reason: dto.reason ?? MovementReason.OTHER,
      });
      const saved = await em.save(StockMovement, movement);

      this.eventEmitter.emit('inventory.movement.created', {
        tenantId, movementId: saved.id, productId: product.id,
      });

      if (product.isLowStock) {
        this.eventEmitter.emit('inventory.low_stock', { tenantId, productId: product.id });
        this.logger.warn(`[Low Stock] ${product.name} — qty: ${stockAfter}, min: ${product.minStock}`);
      }

      await this.bust(tenantId, 'summary');
      return saved;
    });
  }

  // ─── Summary / Dashboard ────────────────────────────────────────────────────

  async getSummary(tenantId: string) {
    const cacheKey = this.cacheKey(tenantId, 'summary');
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const [
      totalProducts,
      activeProducts,
      lowStockProducts,
      outOfStockCount,
      stockValueResult,
      movementsToday,
    ] = await Promise.all([
      this.productRepo.count({ where: { tenantId } }),
      this.productRepo.count({ where: { tenantId, status: ProductStatus.ACTIVE } }),
      this.productRepo
        .createQueryBuilder('p')
        .where('p.tenantId = :tenantId', { tenantId })
        .andWhere('p.stockQuantity <= p.minStock')
        .andWhere('p.minStock > 0')
        .andWhere('p.deletedAt IS NULL')
        .getCount(),
      this.productRepo
        .createQueryBuilder('p')
        .where('p.tenantId = :tenantId', { tenantId })
        .andWhere('p.stockQuantity = 0')
        .andWhere('p.deletedAt IS NULL')
        .getCount(),
      this.productRepo
        .createQueryBuilder('p')
        .select('SUM(p.stockQuantity * p.costPrice)', 'total')
        .where('p.tenantId = :tenantId', { tenantId })
        .andWhere('p.deletedAt IS NULL')
        .getRawOne(),
      this.movementRepo
        .createQueryBuilder('m')
        .where('m.tenantId = :tenantId', { tenantId })
        .andWhere('DATE(m.movementDate) = CURRENT_DATE')
        .getCount(),
    ]);

    const summary = {
      totalProducts,
      activeProducts,
      lowStockProducts,
      outOfStockCount,
      totalStockValue: Number(stockValueResult?.total ?? 0),
      movementsToday,
    };

    await this.cache.set(cacheKey, summary, 60 * 2 * 1000);
    return summary;
  }

  async getLowStockProducts(tenantId: string) {
    return this.productRepo
      .createQueryBuilder('p')
      .where('p.tenantId = :tenantId', { tenantId })
      .andWhere('p.stockQuantity <= p.minStock')
      .andWhere('p.minStock > 0')
      .andWhere('p.status = :status', { status: ProductStatus.ACTIVE })
      .andWhere('p.deletedAt IS NULL')
      .orderBy('p.stockQuantity', 'ASC')
      .limit(20)
      .getMany();
  }
}
