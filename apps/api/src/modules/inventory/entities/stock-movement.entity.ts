import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { TenantBaseEntity } from '@shared/entities/base.entity';
import { Product } from './product.entity';
import { Warehouse } from './warehouse.entity';

export enum MovementType {
  IN       = 'in',        // Entrada
  OUT      = 'out',       // Saída
  TRANSFER = 'transfer',  // Transferência entre depósitos
  ADJUST   = 'adjust',    // Ajuste de inventário
  RETURN   = 'return',    // Devolução
  LOSS     = 'loss',      // Perda/Quebra
}

export enum MovementReason {
  PURCHASE    = 'purchase',    // Compra
  SALE        = 'sale',        // Venda
  RETURN_IN   = 'return_in',   // Devolução de cliente
  RETURN_OUT  = 'return_out',  // Devolução ao fornecedor
  TRANSFER    = 'transfer',
  ADJUSTMENT  = 'adjustment',  // Ajuste/inventário
  LOSS        = 'loss',
  PRODUCTION  = 'production',
  OTHER       = 'other',
}

@Entity('inventory_movements')
@Index(['tenantId', 'productId'])
@Index(['tenantId', 'movementDate'])
@Index(['tenantId', 'type'])
export class StockMovement extends TenantBaseEntity {
  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => Product, (p) => p.movements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ name: 'warehouse_id', type: 'uuid', nullable: true })
  warehouseId?: string;

  @ManyToOne(() => Warehouse, (w) => w.movements, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'warehouse_id' })
  warehouse?: Warehouse;

  @Column({ name: 'destination_warehouse_id', type: 'uuid', nullable: true })
  destinationWarehouseId?: string;

  @Column({ type: 'enum', enum: MovementType })
  type: MovementType;

  @Column({ type: 'enum', enum: MovementReason, default: MovementReason.OTHER })
  reason: MovementReason;

  @Column({ type: 'decimal', precision: 15, scale: 3 })
  quantity: number;

  // Saldo anterior e posterior para auditoria
  @Column({ name: 'stock_before', type: 'decimal', precision: 15, scale: 3 })
  stockBefore: number;

  @Column({ name: 'stock_after', type: 'decimal', precision: 15, scale: 3 })
  stockAfter: number;

  @Column({ name: 'unit_cost', type: 'decimal', precision: 15, scale: 2, nullable: true })
  unitCost?: number;

  @Column({ name: 'movement_date', type: 'timestamptz' })
  movementDate: Date;

  @Column({ name: 'reference_number', length: 100, nullable: true })
  referenceNumber?: string;

  @Column({ name: 'counterpart_name', length: 200, nullable: true })
  counterpartName?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;
}
