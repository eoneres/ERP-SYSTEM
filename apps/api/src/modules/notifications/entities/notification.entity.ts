import { Entity, Column, Index } from 'typeorm';
import { TenantBaseEntity } from '@shared/entities/base.entity';

export enum NotificationType {
  INFO    = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  DANGER  = 'danger',
}

@Entity('notifications')
@Index(['tenantId', 'userId', 'read'])
@Index(['tenantId', 'createdAt'])
export class Notification extends TenantBaseEntity {
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string; // null = broadcast para todo o tenant

  @Column({ length: 150 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'enum', enum: NotificationType, default: NotificationType.INFO })
  type: NotificationType;

  @Column({ default: false })
  read: boolean;

  @Column({ name: 'resource_url', length: 255, nullable: true })
  resourceUrl?: string; // link para o recurso relacionado

  @Column({ name: 'resource_type', length: 50, nullable: true })
  resourceType?: string; // 'order', 'transaction', 'employee', etc.

  @Column({ name: 'resource_id', type: 'uuid', nullable: true })
  resourceId?: string;
}
