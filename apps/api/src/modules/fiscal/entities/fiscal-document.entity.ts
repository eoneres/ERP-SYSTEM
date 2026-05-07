import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { TenantBaseEntity } from '@shared/entities/base.entity';
import { InvoiceSeries, DocumentType } from './invoice-series.entity';

export enum FiscalDocumentStatus {
  DRAFT     = 'draft',      // XML gerado, não transmitido
  PENDING   = 'pending',    // Aguardando transmissão (futuro SEFAZ)
  AUTHORIZED = 'authorized', // Autorizado (futuro)
  CANCELLED = 'cancelled',
  REJECTED  = 'rejected',
}

@Entity('fiscal_documents')
@Index(['tenantId', 'orderId'])
@Index(['tenantId', 'seriesId', 'number'], { unique: true })
export class FiscalDocument extends TenantBaseEntity {
  @Column({ name: 'series_id', type: 'uuid' })
  seriesId: string;

  @ManyToOne(() => InvoiceSeries, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'series_id' })
  series: InvoiceSeries;

  @Column({ type: 'enum', enum: DocumentType, name: 'document_type' })
  documentType: DocumentType;

  /** Número sequencial dentro da série */
  @Column({ type: 'int' })
  number: number;

  /** Chave de acesso 44 dígitos (preenchida futuramente pela SEFAZ) */
  @Column({ name: 'access_key', length: 44, nullable: true })
  accessKey?: string;

  /** FK para sales_orders — nullable para emissão avulsa */
  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  orderId?: string;

  @Column({ type: 'enum', enum: FiscalDocumentStatus, default: FiscalDocumentStatus.DRAFT })
  status: FiscalDocumentStatus;

  /** XML base gerado localmente (sem assinatura digital) */
  @Column({ name: 'xml_content', type: 'text', nullable: true })
  xmlContent?: string;

  @Column({ name: 'issue_date', type: 'timestamptz' })
  issueDate: Date;

  /** Valor total do documento */
  @Column({ name: 'total_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
  totalAmount: number;

  /** CNPJ/CPF do destinatário — armazenado para rastreabilidade fiscal */
  @Column({ name: 'recipient_document', length: 20, nullable: true })
  recipientDocument?: string;

  @Column({ name: 'recipient_name', length: 200, nullable: true })
  recipientName?: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  /** Protocolo de autorização SEFAZ (preenchido futuramente) */
  @Column({ name: 'authorization_protocol', length: 100, nullable: true })
  authorizationProtocol?: string;

  @Column({ name: 'authorized_at', type: 'timestamptz', nullable: true })
  authorizedAt?: Date;
}
