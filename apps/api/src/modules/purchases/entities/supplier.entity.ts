import { Entity, Column, Index } from 'typeorm';
import { TenantBaseEntity } from '@shared/entities/base.entity';

export enum SupplierType {
  INDIVIDUAL = 'individual',
  COMPANY    = 'company',
}

@Entity('purchase_suppliers')
@Index(['tenantId', 'document'], { unique: true, where: '"deleted_at" IS NULL AND document IS NOT NULL' })
export class Supplier extends TenantBaseEntity {
  @Column({ length: 200 })
  name: string;

  @Column({ type: 'enum', enum: SupplierType, default: SupplierType.COMPANY })
  type: SupplierType;

  @Column({ length: 30, nullable: true })
  document?: string; // CNPJ ou CPF

  @Column({ length: 150, nullable: true })
  email?: string;

  @Column({ length: 30, nullable: true })
  phone?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ length: 100, nullable: true })
  city?: string;

  @Column({ length: 2, nullable: true })
  state?: string;

  @Column({ length: 10, nullable: true })
  zipCode?: string;

  @Column({ name: 'contact_name', length: 150, nullable: true })
  contactName?: string;

  @Column({ name: 'payment_terms', length: 100, nullable: true })
  paymentTerms?: string; // Ex: "30/60/90 dias"

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  notes?: string;
}
