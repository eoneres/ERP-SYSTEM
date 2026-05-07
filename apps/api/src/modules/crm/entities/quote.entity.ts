import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { TenantBaseEntity } from '@shared/entities/base.entity';
import { Lead } from './lead.entity';

export enum QuoteStatus {
  DRAFT    = 'draft',
  SENT     = 'sent',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  EXPIRED  = 'expired',
}

@Entity('crm_quotes')
@Index(['tenantId', 'leadId'])
export class Quote extends TenantBaseEntity {
  @Column({ name: 'quote_number', length: 50 })
  quoteNumber: string;

  @Column({ name: 'lead_id', type: 'uuid' })
  leadId: string;

  @ManyToOne(() => Lead, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @Column({ type: 'enum', enum: QuoteStatus, default: QuoteStatus.DRAFT })
  status: QuoteStatus;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  amount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  discount: number;

  @Column({ name: 'valid_until', type: 'date', nullable: true })
  validUntil?: Date;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'text', nullable: true })
  terms?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;
}
