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

  // ─── Eventos sem listener anterior ────────────────────────────────────────

  @OnEvent('purchases.ORDER_CREATED')
  async onPurchaseCreated({ tenantId, orderId }: { tenantId: string; orderId: string }) {
    await this.create({
      tenantId,
      title:        'Nova Ordem de Compra',
      message:      'Uma nova ordem de compra foi criada.',
      type:         NotificationType.INFO,
      resourceUrl:  '/purchases/orders',
      resourceType: 'purchase_order',
      resourceId:   orderId,
    });
  }

  @OnEvent('purchases.ORDER_CONFIRMED')
  async onPurchaseConfirmed({ tenantId, orderId }: { tenantId: string; orderId: string }) {
    await this.create({
      tenantId,
      title:        'Ordem de Compra Confirmada',
      message:      'Ordem confirmada. Conta a pagar criada no financeiro.',
      type:         NotificationType.SUCCESS,
      resourceUrl:  '/purchases/orders',
      resourceType: 'purchase_order',
      resourceId:   orderId,
    });
  }

  @OnEvent('purchases.ORDER_RECEIVED')
  async onPurchaseReceived({ tenantId, orderId }: { tenantId: string; orderId: string }) {
    await this.create({
      tenantId,
      title:        'Mercadoria Recebida',
      message:      'Recebimento registrado. Estoque atualizado automaticamente.',
      type:         NotificationType.SUCCESS,
      resourceUrl:  '/purchases/orders',
      resourceType: 'purchase_order',
      resourceId:   orderId,
    });
  }

  @OnEvent('purchases.ORDER_PAID')
  async onPurchasePaid({ tenantId, orderId }: { tenantId: string; orderId: string }) {
    await this.create({
      tenantId,
      title:        'Compra Paga',
      message:      'Pagamento da ordem de compra registrado.',
      type:         NotificationType.SUCCESS,
      resourceUrl:  '/purchases/orders',
      resourceType: 'purchase_order',
      resourceId:   orderId,
    });
  }

  @OnEvent('purchases.ORDER_CANCELLED')
  async onPurchaseCancelled({ tenantId, orderId }: { tenantId: string; orderId: string }) {
    await this.create({
      tenantId,
      title:        'Ordem de Compra Cancelada',
      message:      'Uma ordem de compra foi cancelada.',
      type:         NotificationType.DANGER,
      resourceUrl:  '/purchases/orders',
      resourceType: 'purchase_order',
      resourceId:   orderId,
    });
  }

  @OnEvent('finance.transaction.created')
  async onTransactionCreated({ tenantId, transaction }: { tenantId: string; transaction: any }) {
    // Notifica apenas contas a pagar vencendo em 3 dias ou menos
    if (transaction?.type !== 'expense') return;
    const due = transaction.dueDate ? new Date(transaction.dueDate) : null;
    if (!due) return;
    const daysUntilDue = Math.ceil((due.getTime() - Date.now()) / 86_400_000);
    if (daysUntilDue > 3 || daysUntilDue < 0) return;
    await this.create({
      tenantId,
      title:        'Conta a Pagar Próxima do Vencimento',
      message:      `"${transaction.description}" vence em ${daysUntilDue <= 0 ? 'hoje' : `${daysUntilDue} dia(s)`}.`,
      type:         NotificationType.WARNING,
      resourceUrl:  '/finance/payable',
      resourceType: 'transaction',
      resourceId:   transaction.id,
    });
  }

  @OnEvent('inventory.product.created')
  async onProductCreated({ tenantId, productId }: { tenantId: string; productId: string }) {
    await this.create({
      tenantId,
      title:        'Novo Produto Cadastrado',
      message:      'Um novo produto foi adicionado ao estoque.',
      type:         NotificationType.INFO,
      resourceUrl:  '/inventory/products',
      resourceType: 'product',
      resourceId:   productId,
    });
  }

  @OnEvent('inventory.movement.created')
  async onMovementCreated({ tenantId, movementId, productId }: { tenantId: string; movementId: string; productId: string }) {
    // Silencioso — movimentações são frequentes e poluiriam as notificações
    // Apenas registra no log para rastreabilidade
    this.logger.debug(`[Notifications] Movimentação ${movementId} criada para produto ${productId} (tenant ${tenantId})`);
  }

  @OnEvent('hr.ROLE_ASSIGNED')
  async onRoleAssigned({ tenantId, userId, role }: { tenantId: string; userId: string; role: string }) {
    if (!role) return;
    await this.create({
      tenantId,
      userId,
      title:        'Permissões Atualizadas',
      message:      `Seu perfil de acesso foi atualizado para: ${role}.`,
      type:         NotificationType.INFO,
      resourceUrl:  '/hr/users',
      resourceType: 'user',
      resourceId:   userId,
    });
  }

  @OnEvent('sales.ORDER_CREATED')
  async onSalesOrderCreated({ tenantId, orderId }: { tenantId: string; orderId: string }) {
    await this.create({
      tenantId,
      title:        'Novo Pedido Criado',
      message:      'Um novo pedido de venda foi criado.',
      type:         NotificationType.INFO,
      resourceUrl:  '/sales/orders',
      resourceType: 'order',
      resourceId:   orderId,
    });
  }
}
