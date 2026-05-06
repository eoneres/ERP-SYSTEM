import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { TenantBaseEntity } from '@shared/entities/base.entity';
import { PurchaseOrder } from './purchase-order.entity';

@Entity('purchase_order_items')
@Index(['tenantId', 'orderId'])
export class PurchaseOrderItem extends TenantBaseEntity {
  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @ManyToOne(() => PurchaseOrder, (o) => o.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: PurchaseOrder;

  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId?: string;

  @Column({ name: 'product_name', length: 255 })
  productName: string;

  @Column({ name: 'product_sku', length: 100, nullable: true })
  productSku?: string;

  @Column({ type: 'decimal', precision: 15, scale: 3 })
  quantity: number;

  @Column({ name: 'unit_cost', type: 'decimal', precision: 15, scale: 2 })
  unitCost: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  total: number;

  // Quantidade efetivamente recebida (pode ser parcial)
  @Column({ name: 'received_quantity', type: 'decimal', precision: 15, scale: 3, default: 0 })
  receivedQuantity: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;
}
