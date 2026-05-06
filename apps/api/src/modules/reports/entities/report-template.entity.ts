import { Entity, Column, Index } from 'typeorm';
import { TenantBaseEntity } from '@shared/entities/base.entity';

export enum ReportModule {
  SALES     = 'sales',
  FINANCE   = 'finance',
  INVENTORY = 'inventory',
  HR        = 'hr',
  GENERAL   = 'general',
}

export interface ReportColumnDef {
  key:    string;
  label:  string;
  type:   'string' | 'number' | 'currency' | 'date' | 'datetime' | 'percent';
  width?: number;
}

export interface ReportFilterDef {
  key:       string;
  label:     string;
  type:      'date' | 'daterange' | 'select' | 'text';
  required?: boolean;
  options?:  { value: string; label: string }[];
}

export interface QueryDefinition {
  sql:    string;   // SQL parametrizado com :tenantId e filtros opcionais
  params: string[]; // nomes dos parâmetros esperados além de tenantId
}

@Entity('report_templates')
@Index(['tenantId', 'module'])
export class ReportTemplate extends TenantBaseEntity {
  @Column({ length: 150 })
  name: string;

  @Column({ type: 'enum', enum: ReportModule })
  module: ReportModule;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb' })
  queryDefinition: QueryDefinition;

  @Column({ type: 'jsonb' })
  columns: ReportColumnDef[];

  @Column({ type: 'jsonb', default: '[]' })
  filters: ReportFilterDef[];

  @Column({ name: 'is_system', default: false })
  isSystem: boolean; // templates padrão do sistema (não editáveis)

  @Column({ name: 'is_active', default: true })
  isActive: boolean;
}
