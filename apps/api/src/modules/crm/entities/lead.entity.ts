import { Entity, Column, Index } from 'typeorm';
import { TenantBaseEntity } from '@shared/entities/base.entity';

export enum LeadStage {
  NEW         = 'new',
  CONTACTED   = 'contacted',
  PROPOSAL    = 'proposal',
  NEGOTIATION = 'negotiation',
  CONVERTED   = 'converted',
  LOST        = 'lost',
}

export enum LeadSource {
  WEBSITE  = 'website',
  REFERRAL = 'referral',
  SOCIAL   = 'social',
  EMAIL    = 'email',
  PHONE    = 'phone',
  EVENT    = 'event',
  OTHER    = 'other',
}

@Entity('crm_leads')
@Index(['tenantId', 'stage'])
@Index(['tenantId', 'email'], { unique: true, where: '"deleted_at" IS NULL AND email IS NOT NULL' })
export class Lead extends TenantBaseEntity {
  @Column({ length: 200 })
  name: string;

  @Column({ length: 150, nullable: true })
  email?: string;

  @Column({ length: 30, nullable: true })
  phone?: string;

  @Column({ length: 200, nullable: true })
  company?: string;

  @Column({ length: 100, nullable: true })
  position?: string;

  @Column({ type: 'enum', enum: LeadStage, default: LeadStage.NEW })
  stage: LeadStage;

  @Column({ type: 'enum', enum: LeadSource, nullable: true })
  source?: LeadSource;

  @Column({ name: 'estimated_value', type: 'decimal', precision: 15, scale: 2, nullable: true })
  estimatedValue?: number;

  @Column({ type: 'int', default: 0 })
  probability: number;

  @Column({ name: 'expected_close_date', type: 'date', nullable: true })
  expectedCloseDate?: Date;

  @Column({ name: 'owner_id', type: 'uuid', nullable: true })
  ownerId?: string;

  @Column({ name: 'converted_customer_id', type: 'uuid', nullable: true })
  convertedCustomerId?: string;

  @Column({ name: 'converted_at', type: 'timestamptz', nullable: true })
  convertedAt?: Date;

  @Column({ name: 'lost_reason', type: 'text', nullable: true })
  lostReason?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'kanban_order', type: 'int', default: 0 })
  kanbanOrder: number;
}
