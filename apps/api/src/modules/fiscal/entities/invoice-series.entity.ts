import { Entity, Column, Index } from 'typeorm';
import { TenantBaseEntity } from '@shared/entities/base.entity';

export enum DocumentType {
  NFE   = 'nfe',   // Nota Fiscal Eletrônica
  NFCE  = 'nfce',  // NFC-e (consumidor)
  NFSE  = 'nfse',  // Nota Fiscal de Serviço
  OTHER = 'other',
}

@Entity('fiscal_invoice_series')
@Index(['tenantId', 'series', 'documentType'], { unique: true })
export class InvoiceSeries extends TenantBaseEntity {
  /** Ex: "A", "001", "1" */
  @Column({ length: 10 })
  series: string;

  @Column({ type: 'enum', enum: DocumentType, name: 'document_type', default: DocumentType.NFE })
  documentType: DocumentType;

  /** Último número emitido — incrementado atomicamente */
  @Column({ name: 'last_number', type: 'int', default: 0 })
  lastNumber: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  description?: string;
}
