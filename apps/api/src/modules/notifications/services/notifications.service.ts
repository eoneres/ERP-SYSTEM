import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { Subject } from 'rxjs';
import { Notification, NotificationType } from '../entities/notification.entity';

interface CreateNotificationPayload {
  tenantId:     string;
  userId?:      string;
  title:        string;
  message:      string;
  type?:        NotificationType;
  resourceUrl?: string;
  resourceType?: string;
  resourceId?:  string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  // SSE subjects per tenant — key: tenantId
  private readonly streams = new Map<string, Subject<Notification>>();

  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  async getForUser(tenantId: string, userId: string, onlyUnread = false) {
    const qb = this.repo.createQueryBuilder('n')
      .where('n.tenantId = :tenantId', { tenantId })
      .andWhere('(n.userId = :userId OR n.userId IS NULL)', { userId })
      .orderBy('n.createdAt', 'DESC')
      .take(50);

    if (onlyUnread) qb.andWhere('n.read = false');

    return qb.getMany();
  }

  async countUnread(tenantId: string, userId: string): Promise<number> {
    return this.repo.count({
      where: [
        { tenantId, userId, read: false },
        { tenantId, userId: undefined, read: false },
      ],
    });
  }

  async markRead(id: string, tenantId: string): Promise<void> {
    await this.repo.update({ id, tenantId }, { read: true });
  }

  async markAllRead(tenantId: string, userId: string): Promise<void> {
    await this.repo
      .createQueryBuilder()
      .update(Notification)
      .set({ read: true })
      .where('tenantId = :tenantId', { tenantId })
      .andWhere('(userId = :userId OR userId IS NULL)', { userId })
      .andWhere('read = false')
      .execute();
  }

  async create(payload: CreateNotificationPayload): Promise<Notification> {
    const notif = this.repo.create({
      tenantId:     payload.tenantId,
      userId:       payload.userId,
      title:        payload.title,
      message:      payload.message,
      type:         payload.type ?? NotificationType.INFO,
      resourceUrl:  payload.resourceUrl,
      resourceType: payload.resourceType,
      resourceId:   payload.resourceId,
      read:         false,
    });

    const saved = await this.repo.save(notif);
    this.push(payload.tenantId, saved);
    return saved;
  }

  // ─── SSE ───────────────────────────────────────────────────────────────────

  getStream(tenantId: string): Subject<Notification> {
    if (!this.streams.has(tenantId)) {
      this.streams.set(tenantId, new Subject<Notification>());
    }
    return this.streams.get(tenantId)!;
  }

  private push(tenantId: string, notif: Notification) {
    this.streams.get(tenantId)?.next(notif);
  }

  // ─── Event Listeners ───────────────────────────────────────────────────────

  @OnEvent('inventory.low_stock')
  async onLowStock({ tenantId, productId }: { tenantId: string; productId: string }) {
    await this.create({
      tenantId,
      title:        'Estoque Baixo',
      message:      'Um produto atingiu o nível mínimo de estoque.',
      type:         NotificationType.WARNING,
      resourceUrl:  '/inventory/products?lowStock=true',
      resourceType: 'product',
      resourceId:   productId,
    });
  }

  @OnEvent('sales.ORDER_CONFIRMED')
  async onOrderConfirmed({ tenantId, orderId }: { tenantId: string; orderId: string }) {
    await this.create({
      tenantId,
      title:        'Pedido Confirmado',
      message:      'Um pedido foi confirmado e o estoque foi reservado.',
      type:         NotificationType.SUCCESS,
      resourceUrl:  '/sales/orders',
      resourceType: 'order',
      resourceId:   orderId,
    });
  }

  @OnEvent('sales.ORDER_INVOICED')
  async onOrderInvoiced({ tenantId, orderId }: { tenantId: string; orderId: string }) {
    await this.create({
      tenantId,
      title:        'Pedido Faturado',
      message:      'Pedido faturado. Conta a receber criada no financeiro.',
      type:         NotificationType.SUCCESS,
      resourceUrl:  '/sales/invoices',
      resourceType: 'order',
      resourceId:   orderId,
    });
  }

  @OnEvent('sales.PAYMENT_RECEIVED')
  async onPaymentReceived({ tenantId, orderId, amount }: { tenantId: string; orderId: string; amount: number }) {
    await this.create({
      tenantId,
      title:        'Pagamento Recebido',
      message:      `Pagamento de R$ ${Number(amount).toFixed(2)} registrado com sucesso.`,
      type:         NotificationType.SUCCESS,
      resourceUrl:  '/sales/invoices',
      resourceType: 'order',
      resourceId:   orderId,
    });
  }

  @OnEvent('sales.ORDER_CANCELLED')
  async onOrderCancelled({ tenantId, orderId }: { tenantId: string; orderId: string }) {
    await this.create({
      tenantId,
      title:        'Pedido Cancelado',
      message:      'Um pedido foi cancelado. Estoque liberado.',
      type:         NotificationType.DANGER,
      resourceUrl:  '/sales/orders',
      resourceType: 'order',
      resourceId:   orderId,
    });
  }

  @OnEvent('hr.EMPLOYEE_CREATED')
  async onEmployeeCreated({ tenantId, employeeId }: { tenantId: string; employeeId: string }) {
    await this.create({
      tenantId,
      title:        'Novo Colaborador',
      message:      'Um novo colaborador foi cadastrado no sistema.',
      type:         NotificationType.INFO,
      resourceUrl:  '/hr/employees',
      resourceType: 'employee',
      resourceId:   employeeId,
    });
  }

  @OnEvent('hr.USER_CREATED')
  async onUserCreated({ tenantId, userId }: { tenantId: string; userId: string }) {
    await this.create({
      tenantId,
      title:        'Novo Usuário',
      message:      'Um novo usuário do sistema foi criado.',
      type:         NotificationType.INFO,
      resourceUrl:  '/hr/users',
      resourceType: 'user',
      resourceId:   userId,
    });
  }

  @OnEvent('finance.transaction.paid')
  async onTransactionPaid({ tenantId, transaction }: { tenantId: string; transaction: any }) {
    if (transaction?.type !== 'expense') return;
    await this.create({
      tenantId,
      title:        'Pagamento Realizado',
      message:      `Despesa "${transaction.description}" marcada como paga.`,
      type:         NotificationType.INFO,
      resourceUrl:  '/finance/payable',
      resourceType: 'transaction',
      resourceId:   transaction.id,
    });
  }
}
