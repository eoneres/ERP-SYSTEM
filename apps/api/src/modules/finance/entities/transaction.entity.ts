import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { TenantBaseEntity } from '@shared/entities/base.entity';
import { Account } from './account.entity';
import { Category } from './category.entity';

export enum TransactionType {
  INCOME = 'income',   // Receita / Contas a receber
  EXPENSE = 'expense', // Despesa / Contas a pagar
  TRANSFER = 'transfer',
}

export enum TransactionStatus {
  PENDING = 'pending',       // Pendente
  PAID = 'paid',             // Pago / Recebido
  OVERDUE = 'overdue',       // Vencido
  CANCELLED = 'cancelled',
  SCHEDULED = 'scheduled',   // Agendado
}

export enum RecurrenceType {
  NONE = 'none',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

@Entity('finance_transactions')
@Index(['tenantId', 'dueDate'])
@Index(['tenantId', 'status'])
@Index(['tenantId', 'type'])
export class Transaction extends TenantBaseEntity {
  @Column({ length: 255 })
  description: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.PENDING })
  status: TransactionStatus;

  @Column({ name: 'due_date', type: 'date' })
  dueDate: Date;

  @Column({ name: 'payment_date', type: 'date', nullable: true })
  paymentDate?: Date;

  @Column({ name: 'paid_amount', type: 'decimal', precision: 15, scale: 2, nullable: true })
  paidAmount?: number;

  // Conta bancária
  @Column({ name: 'account_id', type: 'uuid', nullable: true })
  accountId?: string;

  @ManyToOne(() => Account, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'account_id' })
  account?: Account;

  // Categoria
  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId?: string;

  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'category_id' })
  category?: Category;

  // Para transferências — conta destino
  @Column({ name: 'destination_account_id', type: 'uuid', nullable: true })
  destinationAccountId?: string;

  @ManyToOne(() => Account, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'destination_account_id' })
  destinationAccount?: Account;

  // Recorrência
  @Column({ type: 'enum', enum: RecurrenceType, default: RecurrenceType.NONE })
  recurrence: RecurrenceType;

  @Column({ name: 'recurrence_end_date', type: 'date', nullable: true })
  recurrenceEndDate?: Date;

  @Column({ name: 'recurrence_parent_id', type: 'uuid', nullable: true })
  recurrenceParentId?: string;

  // Referência externa (NF, boleto, etc.)
  @Column({ name: 'reference_number', length: 100, nullable: true })
  referenceNumber?: string;

  @Column({ name: 'document_url', nullable: true })
  documentUrl?: string;

  // Terceiro (cliente/fornecedor)
  @Column({ name: 'counterpart_name', length: 200, nullable: true })
  counterpartName?: string;

  @Column({ name: 'counterpart_document', length: 20, nullable: true })
  counterpartDocument?: string;

  // Tags para filtragem
  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  @Column({ type: 'text', nullable: true })
  notes?: string;

  // Computed
  get isOverdue(): boolean {
    if (this.status === TransactionStatus.PAID) return false;
    return new Date() > new Date(this.dueDate);
  }

  get effectiveAmount(): number {
    return this.paidAmount ?? this.amount;
  }
}
