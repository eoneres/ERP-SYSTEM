import {
  Injectable, NotFoundException, BadRequestException,
  ConflictException, Logger, Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

import { Supplier } from '../entities/supplier.entity';
import { PurchaseOrder, PurchaseOrderStatus } from '../entities/purchase-order.entity';
import { PurchaseOrderItem } from '../entities/purchase-order-item.entity';
import {
  CreateSupplierDto, UpdateSupplierDto, SupplierFilterDto,
  CreatePurchaseOrderDto, UpdatePurchaseOrderDto,
  ConfirmPurchaseDto, ReceivePurchaseDto, OrderFilterDto,
} from '../dto/purchases.dto';

// Cross-module entities via DataSource
import { Product } from '@modules/inventory/entities/product.entity';
import { StockMovement, MovementType, MovementReason } from '@modules/inventory/entities/stock-movement.entity';
import { Transaction, TransactionType, TransactionStatus } from '@modules/finance/entities/transaction.entity';

@Injectable()
export class PurchasesService {
  private readonly logger = new Logger(PurchasesService.name);

  constructor(
    @InjectRepository(Supplier)           private readonly supplierRepo: Repository<Supplier>,
    @InjectRepository(PurchaseOrder)      private readonly orderRepo:    Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderItem)  private readonly itemRepo:     Repository<PurchaseOrderItem>,
    private readonly dataSource:   DataSource,
    private readonly eventEmitter: EventEmitter2,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  private ck(tenantId: string, s: string) { return `purchases:${tenantId}:${s}`; }
  private async bust(tenantId: string) {
    await this.cache.del(this.ck(tenantId, 'summary'));
  }

  private orderNumber() {
    return `OC-${Date.now().toString(36).toUpperCase()}`;
  }

  // ─── Suppliers ──────────────────────────────────────────────────────────────

  async getSuppliers(tenantId: string, filter: SupplierFilterDto) {
    const { page, limit, search, sortBy, sortOrder, type, isActive } = filter;
    const qb = this.supplierRepo.createQueryBuilder('s')
      .where('s.tenantId = :tenantId', { tenantId })
      .andWhere('s.deletedAt IS NULL');

    if (search)            qb.andWhere('(s.name ILIKE :s OR s.document ILIKE :s OR s.email ILIKE :s)', { s: `%${search}%` });
    if (type !== undefined)     qb.andWhere('s.type = :type',         { type });
    if (isActive !== undefined) qb.andWhere('s.isActive = :isActive', { isActive });

    const sortMap: Record<string, string> = { name: 's.name', createdAt: 's.createdAt' };
    qb.orderBy(sortMap[sortBy ?? ''] ?? 's.name', sortOrder ?? 'ASC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async getSupplier(id: string, tenantId: string) {
    const s = await this.supplierRepo.findOne({ where: { id, tenantId } });
    if (!s) throw new NotFoundException('Fornecedor não encontrado');
    return s;
  }

  async createSupplier(tenantId: string, userId: string, dto: CreateSupplierDto) {
    if (dto.document) {
      const exists = await this.supplierRepo.findOne({ where: { document: dto.document, tenantId } });
      if (exists) throw new ConflictException(`Documento '${dto.document}' já cadastrado`);
    }
    const saved = await this.supplierRepo.save(
      this.supplierRepo.create({ ...dto, tenantId, createdBy: userId }),
    );
    await this.bust(tenantId);
    return saved;
  }

  async updateSupplier(id: string, tenantId: string, userId: string, dto: UpdateSupplierDto) {
    const s = await this.getSupplier(id, tenantId);
    if (dto.document && dto.document !== s.document) {
      const exists = await this.supplierRepo.findOne({ where: { document: dto.document, tenantId } });
      if (exists) throw new ConflictException(`Documento '${dto.document}' já cadastrado`);
    }
    Object.assign(s, { ...dto, updatedBy: userId });
    return this.supplierRepo.save(s);
  }

  async deleteSupplier(id: string, tenantId: string) {
    const s = await this.getSupplier(id, tenantId);
    await this.supplierRepo.softRemove(s);
    await this.bust(tenantId);
  }

  // ─── Orders — CRUD ──────────────────────────────────────────────────────────

  async getOrders(tenantId: string, filter: OrderFilterDto) {
    const { page, limit, search, sortBy, sortOrder, status, supplierId, dateFrom, dateTo } = filter;
    const qb = this.orderRepo.createQueryBuilder('o')
      .leftJoinAndSelect('o.supplier', 'supplier')
      .where('o.tenantId = :tenantId', { tenantId })
      .andWhere('o.deletedAt IS NULL');

    if (search)     qb.andWhere('(o.orderNumber ILIKE :s OR supplier.name ILIKE :s)', { s: `%${search}%` });
    if (status)     qb.andWhere('o.status = :status',         { status });
    if (supplierId) qb.andWhere('o.supplierId = :supplierId', { supplierId });
    if (dateFrom)   qb.andWhere('o.orderDate >= :dateFrom',   { dateFrom });
    if (dateTo)     qb.andWhere('o.orderDate <= :dateTo',     { dateTo });

    const sortMap: Record<string, string> = {
      orderDate: 'o.orderDate', total: 'o.total', orderNumber: 'o.orderNumber',
    };
    qb.orderBy(sortMap[sortBy ?? ''] ?? 'o.orderDate', sortOrder ?? 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async getOrder(id: string, tenantId: string) {
    const order = await this.orderRepo.findOne({
      where: { id, tenantId },
      relations: ['supplier', 'items'],
    });
    if (!order) throw new NotFoundException('Ordem de compra não encontrada');
    return order;
  }

  async createOrder(tenantId: string, userId: string, dto: CreatePurchaseOrderDto) {
    if (!dto.items?.length) throw new BadRequestException('A ordem deve ter pelo menos 1 item');

    return this.dataSource.transaction(async (em) => {
      const subtotal = dto.items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
      const discount = dto.discount ?? 0;
      const shipping = dto.shipping ?? 0;

      const order = em.create(PurchaseOrder, {
        tenantId, createdBy: userId,
        orderNumber:   this.orderNumber(),
        supplierId:    dto.supplierId,
        status:        PurchaseOrderStatus.DRAFT,
        paymentMethod: dto.paymentMethod,
        orderDate:     dto.orderDate    ? new Date(dto.orderDate)    : new Date(),
        expectedDate:  dto.expectedDate ? new Date(dto.expectedDate) : undefined,
        dueDate:       dto.dueDate      ? new Date(dto.dueDate)      : undefined,
        subtotal, discount, shipping,
        total: subtotal - discount + shipping,
        referenceNumber: dto.referenceNumber,
        notes: dto.notes,
      });

      const savedOrder = await em.save(PurchaseOrder, order);

      const items = dto.items.map((i) => em.create(PurchaseOrderItem, {
        tenantId, createdBy: userId,
        orderId:     savedOrder.id,
        productId:   i.productId,
        productName: i.productName,
        productSku:  i.productSku,
        quantity:    i.quantity,
        unitCost:    i.unitCost,
        total:       i.quantity * i.unitCost,
        notes:       i.notes,
      }));
      await em.save(PurchaseOrderItem, items);

      this.eventEmitter.emit('purchases.ORDER_CREATED', { tenantId, orderId: savedOrder.id });
      await this.bust(tenantId);
      return { ...savedOrder, items };
    });
  }

  async updateOrder(id: string, tenantId: string, userId: string, dto: UpdatePurchaseOrderDto) {
    const order = await this.getOrder(id, tenantId);
    if (order.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException('Apenas rascunhos podem ser editados');
    }

    return this.dataSource.transaction(async (em) => {
      if (dto.items) {
        await em.delete(PurchaseOrderItem, { orderId: id });

        const subtotal = dto.items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
        const discount = dto.discount ?? Number(order.discount);
        const shipping = dto.shipping ?? Number(order.shipping);

        Object.assign(order, {
          ...dto, updatedBy: userId, subtotal, discount, shipping,
          total: subtotal - discount + shipping,
          orderDate:    dto.orderDate    ? new Date(dto.orderDate)    : order.orderDate,
          expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : order.expectedDate,
          dueDate:      dto.dueDate      ? new Date(dto.dueDate)      : order.dueDate,
        });
        delete (order as any).items;

        const savedOrder = await em.save(PurchaseOrder, order);
        const items = dto.items.map((i) => em.create(PurchaseOrderItem, {
          tenantId, createdBy: userId,
          orderId: savedOrder.id, productId: i.productId,
          productName: i.productName, productSku: i.productSku,
          quantity: i.quantity, unitCost: i.unitCost,
          total: i.quantity * i.unitCost, notes: i.notes,
        }));
        await em.save(PurchaseOrderItem, items);
        await this.bust(tenantId);
        return { ...savedOrder, items };
      }

      Object.assign(order, {
        ...dto, updatedBy: userId,
        orderDate:    dto.orderDate    ? new Date(dto.orderDate)    : order.orderDate,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : order.expectedDate,
        dueDate:      dto.dueDate      ? new Date(dto.dueDate)      : order.dueDate,
      });
      const saved = await em.save(PurchaseOrder, order);
      await this.bust(tenantId);
      return saved;
    });
  }

  // ─── Orders — Fluxo de negócio ──────────────────────────────────────────────

  /**
   * CONFIRMAR: DRAFT → CONFIRMED
   * Cria conta a pagar no financeiro.
   */
  async confirmOrder(id: string, tenantId: string, userId: string, dto: ConfirmPurchaseDto) {
    const order = await this.getOrder(id, tenantId);
    if (order.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException(`Ordem não pode ser confirmada no status '${order.status}'`);
    }

    return this.dataSource.transaction(async (em) => {
      // Cria conta a pagar no financeiro
      const description = `Compra ${order.orderNumber}${order.supplier ? ` — ${order.supplier.name}` : ''}`;
      const tx = em.create(Transaction, {
        tenantId, createdBy: userId,
        description,
        amount:          Number(order.total),
        type:            TransactionType.EXPENSE,
        status:          TransactionStatus.PENDING,
        dueDate:         dto.dueDate ? new Date(dto.dueDate) : (order.dueDate ?? new Date()),
        counterpartName: order.supplier?.name,
        referenceNumber: order.orderNumber,
        tags:            ['compra'],
      });
      const savedTx = await em.save(Transaction, tx);

      if (dto.paymentMethod) order.paymentMethod = dto.paymentMethod;
      if (dto.dueDate)       order.dueDate        = new Date(dto.dueDate);
      order.status                = PurchaseOrderStatus.CONFIRMED;
      order.financeTransactionId  = savedTx.id;
      order.updatedBy             = userId;

      const saved = await em.save(PurchaseOrder, order);
      this.eventEmitter.emit('purchases.ORDER_CONFIRMED', { tenantId, orderId: id });
      await this.cache.del(`finance:summary:${tenantId}`);
      await this.bust(tenantId);
      return saved;
    });
  }

  /**
   * RECEBER: CONFIRMED → RECEIVED
   * Dá entrada no estoque para cada item com productId.
   */
  async receiveOrder(id: string, tenantId: string, userId: string, dto: ReceivePurchaseDto) {
    const order = await this.getOrder(id, tenantId);
    if (order.status !== PurchaseOrderStatus.CONFIRMED) {
      throw new BadRequestException(`Ordem deve estar CONFIRMADA para ser recebida. Status: '${order.status}'`);
    }

    return this.dataSource.transaction(async (em) => {
      for (const item of order.items) {
        if (!item.productId) continue;

        const product = await em.findOne(Product, {
          where: { id: item.productId, tenantId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!product) continue;

        const stockBefore = Number(product.stockQuantity);
        const qty         = Number(item.quantity);
        product.stockQuantity = stockBefore + qty;

        // Atualiza custo médio do produto
        if (Number(item.unitCost) > 0) {
          product.costPrice = Number(item.unitCost);
        }

        await em.save(Product, product);

        await em.save(StockMovement, em.create(StockMovement, {
          tenantId, createdBy: userId,
          productId:       item.productId,
          type:            MovementType.IN,
          reason:          MovementReason.PURCHASE,
          quantity:        qty,
          stockBefore,
          stockAfter:      stockBefore + qty,
          unitCost:        Number(item.unitCost),
          movementDate:    new Date(),
          referenceNumber: order.orderNumber,
          counterpartName: order.supplier?.name,
          notes:           `Recebimento — ${order.orderNumber}`,
        }));

        item.receivedQuantity = qty;
        await em.save(PurchaseOrderItem, item);
      }

      order.status       = PurchaseOrderStatus.RECEIVED;
      order.receivedDate = dto.receivedDate ? new Date(dto.receivedDate) : new Date();
      order.updatedBy    = userId;
      if (dto.notes) order.notes = dto.notes;

      const saved = await em.save(PurchaseOrder, order);
      this.eventEmitter.emit('purchases.ORDER_RECEIVED', { tenantId, orderId: id });
      await this.cache.del(`inventory:${tenantId}:summary`);
      await this.bust(tenantId);
      return saved;
    });
  }

  /**
   * MARCAR COMO PAGO: RECEIVED → PAID
   * Marca a transaction financeira como paga.
   */
  async markPaid(id: string, tenantId: string, userId: string) {
    const order = await this.getOrder(id, tenantId);
    if (order.status !== PurchaseOrderStatus.RECEIVED) {
      throw new BadRequestException('Apenas ordens recebidas podem ser marcadas como pagas');
    }
    if (!order.financeTransactionId) {
      throw new BadRequestException('Ordem não possui transação financeira vinculada');
    }

    return this.dataSource.transaction(async (em) => {
      const tx = await em.findOne(Transaction, {
        where: { id: order.financeTransactionId!, tenantId },
      });
      if (tx && tx.status !== TransactionStatus.PAID) {
        tx.status      = TransactionStatus.PAID;
        tx.paymentDate = new Date();
        tx.paidAmount  = Number(order.total);
        tx.updatedBy   = userId;
        await em.save(Transaction, tx);
      }

      order.status    = PurchaseOrderStatus.PAID;
      order.updatedBy = userId;
      const saved = await em.save(PurchaseOrder, order);

      this.eventEmitter.emit('purchases.ORDER_PAID', { tenantId, orderId: id });
      await this.cache.del(`finance:summary:${tenantId}`);
      await this.bust(tenantId);
      return saved;
    });
  }

  /**
   * CANCELAR: qualquer status → CANCELLED
   * Cancela a transaction financeira se existir.
   */
  async cancelOrder(id: string, tenantId: string, userId: string) {
    const order = await this.getOrder(id, tenantId);
    if ([PurchaseOrderStatus.CANCELLED, PurchaseOrderStatus.PAID].includes(order.status)) {
      throw new BadRequestException('Ordem não pode ser cancelada neste status');
    }

    return this.dataSource.transaction(async (em) => {
      if (order.financeTransactionId) {
        const tx = await em.findOne(Transaction, {
          where: { id: order.financeTransactionId, tenantId },
        });
        if (tx && tx.status !== TransactionStatus.PAID) {
          tx.status    = TransactionStatus.CANCELLED;
          tx.updatedBy = userId;
          await em.save(Transaction, tx);
        }
      }

      order.status    = PurchaseOrderStatus.CANCELLED;
      order.updatedBy = userId;
      const saved = await em.save(PurchaseOrder, order);

      this.eventEmitter.emit('purchases.ORDER_CANCELLED', { tenantId, orderId: id });
      await this.cache.del(`finance:summary:${tenantId}`);
      await this.bust(tenantId);
      return saved;
    });
  }

  async deleteOrder(id: string, tenantId: string) {
    const order = await this.getOrder(id, tenantId);
    if (order.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException('Apenas rascunhos podem ser excluídos');
    }
    await this.orderRepo.softRemove(order);
    await this.bust(tenantId);
  }

  // ─── Dashboard ──────────────────────────────────────────────────────────────

  async getSummary(tenantId: string) {
    const cacheKey = this.ck(tenantId, 'summary');
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const [totalOrders, pendingOrders, totalSuppliers, spendResult] = await Promise.all([
      this.orderRepo.count({ where: { tenantId } }),
      this.orderRepo.count({ where: { tenantId, status: PurchaseOrderStatus.CONFIRMED } }),
      this.supplierRepo.count({ where: { tenantId, isActive: true } }),
      this.orderRepo.createQueryBuilder('o')
        .select('SUM(o.total)', 'total')
        .where('o.tenantId = :tenantId', { tenantId })
        .andWhere('o.status NOT IN (:...s)', { s: ['draft', 'cancelled'] })
        .andWhere('o.deletedAt IS NULL')
        .getRawOne(),
    ]);

    const summary = {
      totalOrders, pendingOrders, totalSuppliers,
      totalSpend: Number(spendResult?.total ?? 0),
    };

    await this.cache.set(cacheKey, summary, 60 * 2 * 1000);
    return summary;
  }
}
