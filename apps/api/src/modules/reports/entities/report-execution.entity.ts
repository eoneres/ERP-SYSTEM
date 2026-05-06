import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { TenantBaseEntity } from '@shared/entities/base.entity';
import { ReportTemplate } from './report-template.entity';

export enum ExecutionStatus {
  PENDING    = 'pending',
  PROCESSING = 'processing',
  COMPLETED  = 'completed',
  FAILED     = 'failed',
}

export enum ExportFormat {
  CSV  = 'csv',
  XLSX = 'xlsx',
  PDF  = 'pdf',
}

@Entity('report_executions')
@Index(['tenantId', 'createdAt'])
@Index(['tenantId', 'templateId'])
export class ReportExecution extends TenantBaseEntity {
  @Column({ name: 'template_id', type: 'uuid' })
  templateId: string;

  @ManyToOne(() => ReportTemplate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template: ReportTemplate;

  @Column({ name: 'executed_by', type: 'uuid' })
  executedBy: string;

  @Column({ type: 'jsonb', default: '{}' })
  parameters: Record<string, any>;

  @Column({ type: 'enum', enum: ExecutionStatus, default: ExecutionStatus.PENDING })
  status: ExecutionStatus;

  @Column({ type: 'enum', enum: ExportFormat })
  format: ExportFormat;

  @Column({ name: 'file_url', nullable: true })
  fileUrl?: string;

  @Column({ name: 'row_count', type: 'int', nullable: true })
  rowCount?: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt?: Date;
}
