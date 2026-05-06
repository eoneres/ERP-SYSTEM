import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { TenantBaseEntity } from '@shared/entities/base.entity';
import { Customer } from './customer.entity';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
  DRAFT       = 'draft',       // Rascunho — sem impacto em nada
  CONFIRMED   = 'confirmed',   // Confirmado — estoque reservado
  PROCESSING  = 'processing',  // Mantido para compatibilidade com banco existente
  INVOICED    = 'invoiced',    // Faturado — estoque baixado + conta a receber criada
  SHIPPED     = 'shipped',     // Mantido para compatibilidade com banco existente
  DELIVERED   = 'delivered',   // Entregue
  CANCELLED   = 'cancelled',   // Cancelado — reserva liberada + financeiro cancelado
  RETURNED    = 'returned',    // Devolvido
}

export enum PaymentMethod {
  CASH        = 'cash',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD  = 'debit_card',
  PIX         = 'pix',
  BOLETO      = 'boleto',
  TRANSFER    = 'transfer',
  OTHER       = 'other',
}

export enum PaymentStatus {
  PENDING  = 'pending',   // Aguardando pagamento
  PAID     = 'paid',      // Pago
  PARTIAL  = 'partial',   // Parcialmente pago
  REFUNDED = 'refunded',  // Estornado
}

@Entity('sales_orders')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'orderDate'])
@Index(['tenantId', 'customerId'])
export class Order extends TenantBaseEntity {
  @Column({ name: 'order_number', length: 50 })
  orderNumber: string;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId?: string;

  @ManyToOne(() => Customer, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customer_id' })
  customer?: Customer;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.DRAFT })
  status: OrderStatus;

  @Column({ name: 'payment_method', type: 'enum', enum: PaymentMethod, nullable: true })
  paymentMethod?: PaymentMethod;

  @Column({ name: 'payment_status', type: 'enum', enum: PaymentStatus, default: PaymentStatus.PENDING })
  paymentStatus: PaymentStatus;

  // FK para finance_transactions — criada ao faturar
  @Column({ name: 'invoice_transaction_id', type: 'uuid', nullable: true })
  invoiceTransactionId?: string;

  // Flag: estoque foi reservado (CONFIRMED) mas ainda não baixado (INVOICED)
  @Column({ name: 'stock_reserved', default: false })
  stockReserved: boolean;

  @Column({ name: 'order_date', type: 'timestamptz' })
  orderDate: Date;

  @Column({ name: 'delivery_date', type: 'date', nullable: true })
  deliveryDate?: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  shipping: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total: number;

  @Column({ name: 'paid_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  paidAmount: number;

  @Column({ name: 'shipping_address', type: 'text', nullable: true })
  shippingAddress?: string;

  @Column({ name: 'reference_number', length: 100, nullable: true })
  referenceNumber?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
  items: OrderItem[];
}
