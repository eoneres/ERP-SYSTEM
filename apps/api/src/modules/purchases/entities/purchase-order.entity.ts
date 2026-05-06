import { Entity, Column, Index, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { TenantBaseEntity } from '@shared/entities/base.entity';
import { Supplier } from './supplier.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';

export enum PurchaseOrderStatus {
  DRAFT     = 'draft',      // Rascunho
  CONFIRMED = 'confirmed',  // Confirmado — gera conta a pagar
  RECEIVED  = 'received',   // Recebido — dá entrada no estoque
  PAID      = 'paid',       // Pago
  CANCELLED = 'cancelled',
}

export enum PurchasePaymentMethod {
  CASH        = 'cash',
  CREDIT_CARD = 'credit_card',
  BOLETO      = 'boleto',
  TRANSFER    = 'transfer',
  PIX         = 'pix',
  OTHER       = 'other',
}

@Entity('purchase_orders')
@Index(['tenantId', 'status'])
@Index(['tenantId', 'supplierId'])
@Index(['tenantId', 'orderDate'])
export class PurchaseOrder extends TenantBaseEntity {
  @Column({ name: 'order_number', length: 50 })
  orderNumber: string;

  @Column({ name: 'supplier_id', type: 'uuid', nullable: true })
  supplierId?: string;

  @ManyToOne(() => Supplier, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'supplier_id' })
  supplier?: Supplier;

  @Column({ type: 'enum', enum: PurchaseOrderStatus, default: PurchaseOrderStatus.DRAFT })
  status: PurchaseOrderStatus;

  @Column({ name: 'payment_method', type: 'enum', enum: PurchasePaymentMethod, nullable: true })
  paymentMethod?: PurchasePaymentMethod;

  @Column({ name: 'order_date', type: 'timestamptz' })
  orderDate: Date;

  @Column({ name: 'expected_date', type: 'date', nullable: true })
  expectedDate?: Date;

  @Column({ name: 'received_date', type: 'date', nullable: true })
  receivedDate?: Date;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  shipping: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  total: number;

  // FK para finance_transactions (conta a pagar criada ao confirmar)
  @Column({ name: 'finance_transaction_id', type: 'uuid', nullable: true })
  financeTransactionId?: string;

  @Column({ name: 'reference_number', length: 100, nullable: true })
  referenceNumber?: string; // NF do fornecedor

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate?: Date;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @OneToMany(() => PurchaseOrderItem, (item) => item.order, { cascade: true })
  items: PurchaseOrderItem[];
}
