import { Entity, Column, OneToMany } from 'typeorm';
import { TenantBaseEntity } from '@shared/entities/base.entity';
import { StockMovement } from './stock-movement.entity';

@Entity('inventory_warehouses')
export class Warehouse extends TenantBaseEntity {
  @Column({ length: 150 })
  name: string;

  @Column({ length: 100, nullable: true })
  code?: string;

  @Column({ type: 'text', nullable: true })
  address?: string;

  @Column({ length: 100, nullable: true })
  city?: string;

  @Column({ length: 2, nullable: true })
  state?: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'is_default', default: false })
  isDefault: boolean;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @OneToMany(() => StockMovement, (m) => m.warehouse)
  movements: StockMovement[];
}
