import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { TenantBaseEntity } from '@shared/entities/base.entity';
import { Account } from './account.entity';

export enum LedgerEntryType {
  CREDIT = 'credit', // Entrada (receita, depósito)
  DEBIT  = 'debit',  // Saída (despesa, saque)
}

/**
 * AccountLedger — registro imutável de cada movimentação de saldo.
 * NUNCA deve ser atualizado ou deletado (soft-delete desabilitado).
 * O saldo atual da conta é sempre: initialBalance + SUM(credits) - SUM(debits).
 */
@Entity('finance_account_ledger')
@Index(['tenantId', 'accountId', 'createdAt'])
@Index(['tenantId', 'transactionId'], { unique: true })
export class AccountLedger extends TenantBaseEntity {
  @Column({ name: 'account_id', type: 'uuid' })
  accountId: string;

  @ManyToOne(() => Account, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @Column({ name: 'transaction_id', type: 'uuid', nullable: true })
  transactionId?: string;

  @Column({ type: 'enum', enum: LedgerEntryType })
  type: LedgerEntryType;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: number;

  /** Saldo da conta imediatamente após este lançamento */
  @Column({ name: 'balance_after', type: 'decimal', precision: 15, scale: 2 })
  balanceAfter: number;

  @Column({ length: 255 })
  description: string;

  @Column({ name: 'reference_date', type: 'date' })
  referenceDate: Date;
}
