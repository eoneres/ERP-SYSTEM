import {
  Injectable, NotFoundException, BadRequestException, Logger, Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

import { Customer } from '../entities/customer.entity';
import { Order, OrderStatus, PaymentStatus, PaymentMethod } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import {
  CreateCustomerDto, UpdateCustomerDto, CustomerFilterDto,
  CreateOrderDto, UpdateOrderDto,
  ConfirmOrderDto, InvoiceOrderDto, MarkPaidDto,
  OrderFilterDto,
} from '../dto/sales.dto';

// Inventory entities (cross-module via DataSource — sem circular dependency)
import { Product } from '@modules/inventory/entities/product.entity';
import { StockMovement, MovementType, MovementReason } from '@modules/inventory/entities/stock-movement.entity';

// Finance entities (cross-module via DataSource)
import { Transaction, TransactionType, TransactionStatus } from '@modules/finance/entities/transaction.entity';

@Injectable()
export class SalesService {
  private readonly logger = new Logger(SalesService.name);

  constructor(
    @InjectRepository(Customer)  private readonly customerRepo: Repository<Customer>,
    @InjectRepository(Order)     private readonly orderRepo:    Repository<Order>,
    @InjectRepository(OrderItem) private readonly itemRepo:     Repository<OrderItem>,
    private readonly dataSource:   DataSource,
    private readonly eventEmitter: EventEmitter2,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  // ─── Cache ──────────────────────────────────────────────────────────────────

  private ck(tenantId: string, s: string) { return `sales:${tenantId}:${s}`; }
  private async bust(tenantId: string, ...keys: string[]) {
    await Promise.all(keys.map((k) => this.cache.del(this.ck(tenantId, k))));
  }

  private orderNumber() {
    return `PED-${Date.now().toString(36).toUpperCase()}`;
  }

  // ─── Customers ──────────────────────────────────────────────────────────────

  async getCustomers(tenantId: string, filter: CustomerFilterDto) {
    const { page, limit, search, sortBy, sortOrder, type, isActive } = filter;
    const qb = this.customerRepo.createQueryBuilder('c')
      .where('c.tenantId = :tenantId', { tenantId })
      .andWhere('c.deletedAt IS NULL');

    if (search)            qb.andWhere('(c.name ILIKE :s OR c.email ILIKE :s OR c.document ILIKE :s OR c.phone ILIKE :s)', { s: `%${search}%` });
    if (type !== undefined)     qb.andWhere('c.type = :type',         { type });
    if (isActive !== undefined) qb.andWhere('c.isActive = :isActive', { isActive });

    const sortMap: Record<string, string> = { name: 'c.name', email: 'c.email', createdAt: 'c.createdAt' };
    qb.orderBy(sortMap[sortBy ?? ''] ?? 'c.name', sortOrder ?? 'ASC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async getCustomer(id: string, tenantId: string) {
    const c = await this.customerRepo.findOne({ where: { id, tenantId } });
    if (!c) throw new NotFoundException('Cliente não encontrado');
    return c;
  }

  async createCustomer(tenantId: string, userId: string, dto: CreateCustomerDto) {
    if (dto.email) {
      const exists = await this.customerRepo.findOne({ where: { email: dto.email, tenantId } });
      if (exists) throw new BadRequestException(`E-mail '${dto.email}' já cadastrado`);
    }
    const saved = await this.customerRepo.save(
      this.customerRepo.create({ ...dto, tenantId, createdBy: userId }),
    );
    await this.bust(tenantId, 'summary');
    return saved;
  }

  async updateCustomer(id: string, tenantId: string, userId: string, dto: UpdateCustomerDto) {
    const c = await this.getCustomer(id, tenantId);
    if (dto.email && dto.email !== c.email) {
      const exists = await this.customerRepo.findOne({ where: { email: dto.email, tenantId } });
      if (exists) throw new BadRequestException(`E-mail '${dto.email}' já cadastrado`);
    }
    Object.assign(c, { ...dto, updatedBy: userId });
    return this.customerRepo.save(c);
  }

  async deleteCustomer(id: string, tenantId: string) {
    const c = await this.getCustomer(id, tenantId);
    await this.customerRepo.softRemove(c);
    await this.bust(tenantId, 'summary');
  }

  // ─── Orders — CRUD ──────────────────────────────────────────────────────────

  async getOrders(tenantId: string, filter: OrderFilterDto) {
    const { page, limit, search, sortBy, sortOrder, status, paymentStatus, customerId, dateFrom, dateTo } = filter;
    const qb = this.orderRepo.createQueryBuilder('o')
      .leftJoinAndSelect('o.customer', 'customer')
      .where('o.tenantId = :tenantId', { tenantId })
      .andWhere('o.deletedAt IS NULL');

    if (search)        qb.andWhere('(o.orderNumber ILIKE :s OR o.referenceNumber ILIKE :s OR customer.name ILIKE :s)', { s: `%${search}%` });
    if (status)        qb.andWhere('o.status = :status',               { status });
    if (paymentStatus) qb.andWhere('o.paymentStatus = :paymentStatus', { paymentStatus });
    if (customerId)    qb.andWhere('o.customerId = :customerId',        { customerId });
    if (dateFrom)      qb.andWhere('o.orderDate >= :dateFrom',          { dateFrom });
    if (dateTo)        qb.andWhere('o.orderDate <= :dateTo',            { dateTo });

    const sortMap: Record<string, string> = { orderDate: 'o.orderDate', total: 'o.total', orderNumber: 'o.orderNumber', createdAt: 'o.createdAt' };
    qb.orderBy(sortMap[sortBy ?? ''] ?? 'o.orderDate', sortOrder ?? 'DESC');
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  async getOrder(id: string, tenantId: string) {
    const order = await this.orderRepo.findOne({ where: { id, tenantId }, relations: ['customer', 'items'] });
    if (!order) throw new NotFoundException('Pedido não encontrado');
    return order;
  }

  async createOrder(tenantId: string, userId: string, dto: CreateOrderDto) {
    if (!dto.items?.length) throw new BadRequestException('O pedido deve ter pelo menos 1 item');

    return this.dataSource.transaction(async (em) => {
      // Valida produtos existentes
      for (const item of dto.items) {
        if (item.productId) {
          const product = await em.findOne(Product, { where: { id: item.productId, tenantId } });
          if (!product) throw new BadRequestException(`Produto '${item.productName}' não encontrado`);
          if (Number(item.quantity) < 0) throw new BadRequestException('Quantidade não pode ser negativa');
        }
      }

      const subtotal = dto.items.reduce((s, i) => s + i.quantity * i.unitPrice * (1 - (i.discount ?? 0) / 100), 0);
      const discount = dto.discount ?? 0;
      const shipping = dto.shipping ?? 0;

      const order = em.create(Order, {
        tenantId, createdBy: userId,
        orderNumber:  this.orderNumber(),
        customerId:   dto.customerId,
        status:       OrderStatus.DRAFT,
        paymentMethod: dto.paymentMethod,
        paymentStatus: PaymentStatus.PENDING,
        stockReserved: false,
        orderDate:    dto.orderDate ? new Date(dto.orderDate) : new Date(),
        deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : undefined,
        subtotal, discount, shipping,
        total: subtotal - discount + shipping,
        paidAmount: 0,
        shippingAddress: dto.shippingAddress,
        referenceNumber: dto.referenceNumber,
        notes: dto.notes,
      });

      const savedOrder = await em.save(Order, order);

      const items = dto.items.map((i) => em.create(OrderItem, {
        tenantId, createdBy: userId,
        orderId:     savedOrder.id,
        productId:   i.productId,
        productName: i.productName,
        productSku:  i.productSku,
        quantity:    i.quantity,
        unitPrice:   i.unitPrice,
        discount:    i.discount ?? 0,
        total:       i.quantity * i.unitPrice * (1 - (i.discount ?? 0) / 100),
        notes:       i.notes,
      }));
      await em.save(OrderItem, items);

      this.eventEmitter.emit('sales.ORDER_CREATED', { tenantId, orderId: savedOrder.id });
      await this.bust(tenantId, 'summary');
      return { ...savedOrder, items };
    });
  }

  async updateOrder(id: string, tenantId: string, userId: string, dto: UpdateOrderDto) {
    const order = await this.getOrder(id, tenantId);

    if (order.status !== OrderStatus.DRAFT) {
      throw new BadRequestException(`Apenas pedidos em rascunho podem ser editados. Cancele e recrie se necessário.`);
    }

    return this.dataSource.transaction(async (em) => {
      if (dto.items) {
        await em.delete(OrderItem, { orderId: id });

        const subtotal = dto.items.reduce((s, i) => s + i.quantity * i.unitPrice * (1 - (i.discount ?? 0) / 100), 0);
        const discount = dto.discount ?? Number(order.discount);
        const shipping = dto.shipping ?? Number(order.shipping);

        Object.assign(order, {
          ...dto, updatedBy: userId, subtotal, discount, shipping,
          total: subtotal - discount + shipping,
          orderDate:    dto.orderDate    ? new Date(dto.orderDate)    : order.orderDate,
          deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : order.deliveryDate,
        });
        delete (order as any).items;

        const savedOrder = await em.save(Order, order);
        const items = dto.items.map((i) => em.create(OrderItem, {
          tenantId, createdBy: userId,
          orderId: savedOrder.id, productId: i.productId,
          productName: i.productName, productSku: i.productSku,
          quantity: i.quantity, unitPrice: i.unitPrice,
          discount: i.discount ?? 0,
          total: i.quantity * i.unitPrice * (1 - (i.discount ?? 0) / 100),
          notes: i.notes,
        }));
        await em.save(OrderItem, items);
        await this.bust(tenantId, 'summary');
        return { ...savedOrder, items };
      }

      Object.assign(order, {
        ...dto, updatedBy: userId,
        orderDate:    dto.orderDate    ? new Date(dto.orderDate)    : order.orderDate,
        deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : order.deliveryDate,
      });
      const saved = await em.save(Order, order);
      await this.bust(tenantId, 'summary');
      return saved;
    });
  }

  // ─── Orders — Fluxo de negócio ──────────────────────────────────────────────

  /**
   * CONFIRMAR: DRAFT → CONFIRMED
   * Valida estoque disponível e reserva (decrementa stockQuantity).
   * Estoque reservado = estoque já decrementado mas sem movimentação de SAÍDA ainda.
   */
  async confirmOrder(id: string, tenantId: string, userId: string, dto: ConfirmOrderDto) {
    const order = await this.getOrder(id, tenantId);

    if (order.status !== OrderStatus.DRAFT) {
      throw new BadRequestException(`Pedido não pode ser confirmado no status '${order.status}'`);
    }
    if (!order.items?.length) {
      throw new BadRequestException('O pedido deve ter pelo menos 1 item');
    }

    return this.dataSource.transaction(async (em) => {
      // Valida e reserva estoque para cada item com productId
      for (const item of order.items) {
        if (!item.productId) continue;

        const product = await em.findOne(Product, {
          where: { id: item.productId, tenantId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!product) throw new NotFoundException(`Produto '${item.productName}' não encontrado`);

        const available = Number(product.stockQuantity);
        const needed    = Number(item.quantity);

        if (available < needed) {
          throw new BadRequestException(
            `Estoque insuficiente para "${product.name}". Disponível: ${available}, Necessário: ${needed}`,
          );
        }

        // Reserva: decrementa stockQuantity (sem criar movimentação ainda)
        product.stockQuantity = available - needed;
        await em.save(Product, product);
      }

      order.status        = OrderStatus.CONFIRMED;
      order.stockReserved = true;
      order.updatedBy     = userId;
      if (dto.paymentMethod) order.paymentMethod = dto.paymentMethod;

      const saved = await em.save(Order, order);
      this.eventEmitter.emit('sales.ORDER_CONFIRMED', { tenantId, orderId: id });
      await this.bust(tenantId, 'summary');
      return saved;
    });
  }

  /**
   * FATURAR: CONFIRMED → INVOICED
   * 1. Cria movimentação de SAÍDA no estoque (registra o histórico)
   * 2. Cria Transaction de INCOME (conta a receber) no financeiro
   * 3. Salva invoiceTransactionId no pedido
   */
  async invoiceOrder(id: string, tenantId: string, userId: string, dto: InvoiceOrderDto) {
    const order = await this.getOrder(id, tenantId);

    if (order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException(`Pedido deve estar CONFIRMADO para ser faturado. Status atual: '${order.status}'`);
    }

    return this.dataSource.transaction(async (em) => {
      // 1. Registra movimentação de SAÍDA para cada item com produto
      for (const item of order.items) {
        if (!item.productId) continue;

        const product = await em.findOne(Product, { where: { id: item.productId, tenantId } });
        if (!product) continue;

        const stockBefore = Number(product.stockQuantity); // já foi decrementado na reserva
        const movement = em.create(StockMovement, {
          tenantId, createdBy: userId,
          productId:       item.productId,
          type:            MovementType.OUT,
          reason:          MovementReason.SALE,
          quantity:        Number(item.quantity),
          stockBefore:     stockBefore + Number(item.quantity), // antes da reserva
          stockAfter:      stockBefore,                          // após reserva (já decrementado)
          unitCost:        Number(item.unitPrice),
          movementDate:    new Date(),
          referenceNumber: order.orderNumber,
          counterpartName: order.customer?.name,
          notes:           `Venda — Pedido ${order.orderNumber}`,
        });
        await em.save(StockMovement, movement);
      }

      // 2. Cria conta a receber no financeiro
      const description = dto.description
        ?? `Venda — Pedido ${order.orderNumber}${order.customer ? ` — ${order.customer.name}` : ''}`;

      const transaction = em.create(Transaction, {
        tenantId, createdBy: userId,
        description,
        amount:          Number(order.total),
        type:            TransactionType.INCOME,
        status:          TransactionStatus.PENDING,
        dueDate:         dto.dueDate ? new Date(dto.dueDate) : new Date(),
        counterpartName: order.customer?.name,
        referenceNumber: order.orderNumber,
        tags:            ['venda'],
      });
      const savedTx = await em.save(Transaction, transaction);

      // 3. Atualiza pedido
      order.status                 = OrderStatus.INVOICED;
      order.paymentMethod          = dto.paymentMethod;
      order.invoiceTransactionId   = savedTx.id;
      order.updatedBy              = userId;

      const saved = await em.save(Order, order);

      this.eventEmitter.emit('sales.ORDER_INVOICED', { tenantId, orderId: id, transactionId: savedTx.id });
      // Invalida cache do financeiro também
      await this.cache.del(`finance:summary:${tenantId}`);
      await this.bust(tenantId, 'summary');
      return saved;
    });
  }

  /**
   * MARCAR COMO PAGO: só disponível quando INVOICED
   * Delega para a transaction financeira existente.
   */
  async markPaid(id: string, tenantId: string, userId: string, dto: MarkPaidDto) {
    const order = await this.getOrder(id, tenantId);

    if (order.status !== OrderStatus.INVOICED) {
      throw new BadRequestException('Apenas pedidos faturados podem ser marcados como pagos');
    }
    if (!order.invoiceTransactionId) {
      throw new BadRequestException('Pedido não possui fatura vinculada');
    }

    return this.dataSource.transaction(async (em) => {
      const tx = await em.findOne(Transaction, {
        where: { id: order.invoiceTransactionId!, tenantId },
      });
      if (!tx) throw new NotFoundException('Fatura não encontrada');
      if (tx.status === TransactionStatus.PAID) {
        throw new BadRequestException('Fatura já foi paga');
      }

      const paidAmount = dto.paidAmount ?? Number(order.total);

      tx.status      = TransactionStatus.PAID;
      tx.paymentDate = dto.paymentDate ? new Date(dto.paymentDate) : new Date();
      tx.paidAmount  = paidAmount;
      tx.updatedBy   = userId;
      await em.save(Transaction, tx);

      // Atualiza pedido
      order.paymentStatus = paidAmount >= Number(order.total) ? PaymentStatus.PAID : PaymentStatus.PARTIAL;
      order.paidAmount    = paidAmount;
      order.updatedBy     = userId;
      const saved = await em.save(Order, order);

      this.eventEmitter.emit('sales.PAYMENT_RECEIVED', { tenantId, orderId: id, amount: paidAmount });
      await this.cache.del(`finance:summary:${tenantId}`);
      await this.bust(tenantId, 'summary');
      return saved;
    });
  }

  /**
   * CANCELAR: qualquer status → CANCELLED
   * - Se CONFIRMED (estoque reservado): devolve estoque
   * - Se INVOICED: devolve estoque + cancela transaction financeira
   */
  async cancelOrder(id: string, tenantId: string, userId: string) {
    const order = await this.getOrder(id, tenantId);

    if ([OrderStatus.CANCELLED, OrderStatus.RETURNED].includes(order.status)) {
      throw new BadRequestException('Pedido já está cancelado');
    }
    if ([OrderStatus.DELIVERED, OrderStatus.SHIPPED].includes(order.status)) {
      throw new BadRequestException('Pedido entregue/enviado não pode ser cancelado. Use devolução.');
    }

    return this.dataSource.transaction(async (em) => {
      // Devolve estoque se estava reservado
      if (order.stockReserved) {
        for (const item of order.items) {
          if (!item.productId) continue;

          const product = await em.findOne(Product, {
            where: { id: item.productId, tenantId },
            lock: { mode: 'pessimistic_write' },
          });
          if (!product) continue;

          const stockBefore = Number(product.stockQuantity);
          product.stockQuantity = stockBefore + Number(item.quantity);
          await em.save(Product, product);

          // Registra movimentação de devolução ao estoque
          await em.save(StockMovement, em.create(StockMovement, {
            tenantId, createdBy: userId,
            productId:       item.productId,
            type:            MovementType.RETURN,
            reason:          MovementReason.RETURN_IN,
            quantity:        Number(item.quantity),
            stockBefore,
            stockAfter:      stockBefore + Number(item.quantity),
            movementDate:    new Date(),
            referenceNumber: order.orderNumber,
            notes:           `Cancelamento — Pedido ${order.orderNumber}`,
          }));
        }
      }

      // Cancela transaction financeira se existir
      if (order.invoiceTransactionId) {
        const tx = await em.findOne(Transaction, {
          where: { id: order.invoiceTransactionId, tenantId },
        });
        if (tx && tx.status !== TransactionStatus.PAID) {
          tx.status    = TransactionStatus.CANCELLED;
          tx.updatedBy = userId;
          await em.save(Transaction, tx);
        }
      }

      order.status        = OrderStatus.CANCELLED;
      order.stockReserved = false;
      order.updatedBy     = userId;
      const saved = await em.save(Order, order);

      this.eventEmitter.emit('sales.ORDER_CANCELLED', { tenantId, orderId: id });
      await this.cache.del(`finance:summary:${tenantId}`);
      await this.bust(tenantId, 'summary');
      return saved;
    });
  }

  async deleteOrder(id: string, tenantId: string) {
    const order = await this.getOrder(id, tenantId);
    if (order.status !== OrderStatus.DRAFT) {
      throw new BadRequestException('Apenas rascunhos podem ser excluídos. Cancele o pedido primeiro.');
    }
    await this.orderRepo.softRemove(order);
    await this.bust(tenantId, 'summary');
  }

  // ─── Dashboard ──────────────────────────────────────────────────────────────

  async getSummary(tenantId: string) {
    const cacheKey = this.ck(tenantId, 'summary');
    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const [totalOrders, pendingOrders, totalCustomers, revenueResult, pendingRevenueResult, ordersThisMonth] =
      await Promise.all([
        this.orderRepo.count({ where: { tenantId } }),
        this.orderRepo.count({ where: { tenantId, status: OrderStatus.CONFIRMED } }),
        this.customerRepo.count({ where: { tenantId, isActive: true } }),
        this.orderRepo.createQueryBuilder('o').select('SUM(o.total)', 'total')
          .where('o.tenantId = :tenantId', { tenantId })
          .andWhere('o.paymentStatus = :ps', { ps: PaymentStatus.PAID })
          .andWhere('o.deletedAt IS NULL').getRawOne(),
        this.orderRepo.createQueryBuilder('o').select('SUM(o.total)', 'total')
          .where('o.tenantId = :tenantId', { tenantId })
          .andWhere('o.status = :s', { s: OrderStatus.INVOICED })
          .andWhere('o.paymentStatus = :ps', { ps: PaymentStatus.PENDING })
          .andWhere('o.deletedAt IS NULL').getRawOne(),
        this.orderRepo.createQueryBuilder('o')
          .where('o.tenantId = :tenantId', { tenantId })
          .andWhere(`DATE_TRUNC('month', o.orderDate) = DATE_TRUNC('month', NOW())`)
          .andWhere('o.deletedAt IS NULL').getCount(),
      ]);

    const summary = {
      totalOrders, pendingOrders, totalCustomers,
      totalRevenue:   Number(revenueResult?.total ?? 0),
      pendingRevenue: Number(pendingRevenueResult?.total ?? 0),
      ordersThisMonth,
    };

    await this.cache.set(cacheKey, summary, 60 * 2 * 1000);
    return summary;
  }

  async getRecentOrders(tenantId: string, limit = 10) {
    return this.orderRepo.find({
      where: { tenantId },
      relations: ['customer'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
