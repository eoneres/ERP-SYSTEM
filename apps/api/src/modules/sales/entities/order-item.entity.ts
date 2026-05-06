import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { TenantBaseEntity } from '@shared/entities/base.entity';
import { Order } from './order.entity';

@Entity('sales_order_items')
@Index(['tenantId', 'orderId'])
export class OrderItem extends TenantBaseEntity {
  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @ManyToOne(() => Order, (o) => o.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId?: string;

  @Column({ name: 'product_name', length: 255 })
  productName: string;

  @Column({ name: 'product_sku', length: 100, nullable: true })
  productSku?: string;

  @Column({ type: 'decimal', precision: 15, scale: 3 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 15, scale: 2 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  discount: number; // percentual

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  total: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;
}
