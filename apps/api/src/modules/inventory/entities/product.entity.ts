import { Entity, Column, Index, OneToMany } from 'typeorm';
import { TenantBaseEntity } from '@shared/entities/base.entity';
import { StockMovement } from './stock-movement.entity';

export enum ProductStatus {
  ACTIVE   = 'active',
  INACTIVE = 'inactive',
  DRAFT    = 'draft',
}

export enum ProductUnit {
  UNIT = 'unit',
  KG   = 'kg',
  G    = 'g',
  L    = 'l',
  ML   = 'ml',
  M    = 'm',
  CM   = 'cm',
  BOX  = 'box',
  PACK = 'pack',
}

@Entity('inventory_products')
@Index(['tenantId', 'sku'], { unique: true, where: '"deleted_at" IS NULL' })
@Index(['tenantId', 'status'])
@Index(['tenantId', 'category'])
export class Product extends TenantBaseEntity {
  @Column({ length: 255 })
  name: string;

  @Column({ length: 100, nullable: true })
  sku?: string;

  @Column({ length: 100, nullable: true })
  barcode?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ length: 100, nullable: true })
  category?: string;

  @Column({ length: 100, nullable: true })
  brand?: string;

  @Column({ type: 'enum', enum: ProductUnit, default: ProductUnit.UNIT })
  unit: ProductUnit;

  @Column({ type: 'enum', enum: ProductStatus, default: ProductStatus.ACTIVE })
  status: ProductStatus;

  // Preços
  @Column({ name: 'cost_price', type: 'decimal', precision: 15, scale: 2, default: 0 })
  costPrice: number;

  @Column({ name: 'sale_price', type: 'decimal', precision: 15, scale: 2, default: 0 })
  salePrice: number;

  // Estoque
  @Column({ name: 'stock_quantity', type: 'decimal', precision: 15, scale: 3, default: 0 })
  stockQuantity: number;

  @Column({ name: 'min_stock', type: 'decimal', precision: 15, scale: 3, default: 0 })
  minStock: number;

  @Column({ name: 'max_stock', type: 'decimal', precision: 15, scale: 3, nullable: true })
  maxStock?: number;

  @Column({ name: 'location', length: 100, nullable: true })
  location?: string;

  @Column({ name: 'image_url', nullable: true })
  imageUrl?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'text', array: true, default: '{}' })
  tags: string[];

  @OneToMany(() => StockMovement, (m) => m.product)
  movements: StockMovement[];

  get isLowStock(): boolean {
    return this.stockQuantity <= this.minStock && this.minStock > 0;
  }

  get stockValue(): number {
    return Number(this.stockQuantity) * Number(this.costPrice);
  }
}
