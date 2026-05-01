import { Entity, Column, OneToMany } from 'typeorm';
import { TenantBaseEntity } from '@shared/entities/base.entity';

export enum AccountType {
  CHECKING = 'checking',       // Conta corrente
  SAVINGS = 'savings',         // Poupança
  CASH = 'cash',               // Caixa
  CREDIT_CARD = 'credit_card', // Cartão de crédito
  INVESTMENT = 'investment',   // Investimento
  OTHER = 'other',
}

@Entity('finance_accounts')
export class Account extends TenantBaseEntity {
  @Column({ length: 150 })
  name: string;

  @Column({ type: 'enum', enum: AccountType, default: AccountType.CHECKING })
  type: AccountType;

  @Column({ name: 'initial_balance', type: 'decimal', precision: 15, scale: 2, default: 0 })
  initialBalance: number;

  @Column({ name: 'current_balance', type: 'decimal', precision: 15, scale: 2, default: 0 })
  currentBalance: number;

  @Column({ length: 3, default: 'BRL' })
  currency: string;

  @Column({ name: 'bank_name', length: 100, nullable: true })
  bankName?: string;

  @Column({ name: 'account_number', length: 50, nullable: true })
  accountNumber?: string;

  @Column({ name: 'agency_number', length: 20, nullable: true })
  agencyNumber?: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'color', length: 7, default: '#1D4ED8' })
  color: string;

  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string;
}
