import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { TenantBaseEntity } from '@shared/entities/base.entity';

export enum CategoryType {
  INCOME = 'income',   // Receita
  EXPENSE = 'expense', // Despesa
  BOTH = 'both',
}

@Entity('finance_categories')
export class Category extends TenantBaseEntity {
  @Column({ length: 100 })
  name: string;

  @Column({ type: 'enum', enum: CategoryType, default: CategoryType.EXPENSE })
  type: CategoryType;

  @Column({ length: 7, default: '#6D28D9' })
  color: string;

  @Column({ length: 50, nullable: true })
  icon?: string;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId?: string;

  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_id' })
  parent?: Category;

  @OneToMany(() => Category, (c) => c.parent)
  children?: Category[];

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  description?: string;
}
