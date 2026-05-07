import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { TenantBaseEntity } from '@shared/entities/base.entity';
import { Lead } from './lead.entity';

export enum InteractionType {
  CALL    = 'call',
  EMAIL   = 'email',
  MEETING = 'meeting',
  NOTE    = 'note',
  TASK    = 'task',
  OTHER   = 'other',
}

@Entity('crm_interactions')
@Index(['tenantId', 'leadId'])
export class Interaction extends TenantBaseEntity {
  @Column({ name: 'lead_id', type: 'uuid' })
  leadId: string;

  @ManyToOne(() => Lead, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lead_id' })
  lead: Lead;

  @Column({ type: 'enum', enum: InteractionType, default: InteractionType.NOTE })
  type: InteractionType;

  @Column({ length: 255 })
  subject: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'interaction_date', type: 'timestamptz' })
  interactionDate: Date;

  /** Próxima ação agendada */
  @Column({ name: 'next_action_date', type: 'date', nullable: true })
  nextActionDate?: Date;

  @Column({ name: 'next_action_note', type: 'text', nullable: true })
  nextActionNote?: string;
}
