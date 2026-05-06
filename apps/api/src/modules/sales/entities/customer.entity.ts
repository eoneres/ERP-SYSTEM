import { Entity, Column, Index } from 'typeorm';
import { TenantBaseEntity } from '@shared/entities/base.entity';

export enum CustomerType {
  INDIVIDUAL = 'individual',
  COMPANY    = 'company',
}

@Entity('sales_customers')
@Index(['tenantId', 'email'],    { unique: true, where: '"deleted_at" IS NULL AND email IS NOT NULL' })
@Index(['tenantId', 'document'], { unique: true, where: '"deleted_at" IS NULL AND document IS NOT NULL' })
export class Customer extends TenantBaseEntity {
  @Column({ length: 200 })
  name: string;

  @Column({ type: 'enum', enum: CustomerType, default: CustomerType.INDIVIDUAL })
  type: CustomerType;

  @Column({ length: 150, nullable: true })
  email?: string;

  @Column({ length: 30, nullable: true })
  phone?: string;

  @Column({ length: 30, nullable: true })
  document?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ length: 100, nullable: true })
  city?: string;

  @Column({ length: 2, nullable: true })
  state?: string;

  @Column({ length: 10, nullable: true })
  zipCode?: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  notes?: string;
}
