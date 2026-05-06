import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@shared/entities/base.entity';

@Entity('audit_logs')
@Index(['tenantId', 'createdAt'])
@Index(['tenantId', 'userId'])
@Index(['tenantId', 'module'])
export class AuditLog extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'uuid', nullable: true })
  tenantId?: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string;

  @Column({ name: 'user_email', length: 255, nullable: true })
  userEmail?: string;

  @Column({ name: 'user_name', length: 200, nullable: true })
  userName?: string;

  // Ex: 'POST /api/v1/sales/orders'
  @Column({ length: 20 })
  method: string;

  @Column({ length: 500 })
  url: string;

  // Módulo inferido da URL: 'sales', 'finance', 'inventory', etc.
  @Column({ length: 50, nullable: true })
  module?: string;

  // Ação inferida: 'create', 'update', 'delete', 'login', etc.
  @Column({ length: 50, nullable: true })
  action?: string;

  @Column({ name: 'resource_id', length: 100, nullable: true })
  resourceId?: string;

  @Column({ name: 'status_code', type: 'int', nullable: true })
  statusCode?: number;

  @Column({ name: 'duration_ms', type: 'int', nullable: true })
  durationMs?: number;

  @Column({ name: 'ip_address', length: 50, nullable: true })
  ipAddress?: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string;

  @Column({ name: 'request_body', type: 'jsonb', nullable: true })
  requestBody?: Record<string, any>;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ default: true })
  success: boolean;
}
