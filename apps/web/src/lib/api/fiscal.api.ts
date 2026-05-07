import { get, post, put, patch, del } from './client';
import type { PaginationMeta } from '@/components/ui/data-table';

export type DocumentType       = 'nfe' | 'nfce' | 'nfse' | 'other';
export type FiscalDocumentStatus = 'draft' | 'pending' | 'authorized' | 'cancelled' | 'rejected';

export interface InvoiceSeries {
  id: string; series: string; documentType: DocumentType;
  lastNumber: number; isActive: boolean; description?: string; createdAt: string;
}

export interface FiscalDocument {
  id: string; seriesId: string; series?: InvoiceSeries;
  documentType: DocumentType; number: number;
  accessKey?: string; orderId?: string; status: FiscalDocumentStatus;
  xmlContent?: string; issueDate: string; totalAmount: number;
  recipientDocument?: string; recipientName?: string;
  notes?: string; authorizationProtocol?: string; authorizedAt?: string; createdAt: string;
}

export interface FiscalDocumentFilter {
  page?: number; limit?: number; orderId?: string; seriesId?: string;
  [key: string]: unknown;
}

export const fiscalApi = {
  // Series
  getSeries:    ()                                         => get<InvoiceSeries[]>('/fiscal/series'),
  createSeries: (data: Partial<InvoiceSeries>)             => post<InvoiceSeries>('/fiscal/series', data),
  updateSeries: (id: string, data: Partial<InvoiceSeries>) => put<InvoiceSeries>(`/fiscal/series/${id}`, data),
  deleteSeries: (id: string)                               => del<void>(`/fiscal/series/${id}`),

  // Documents
  getDocuments:   (f: FiscalDocumentFilter = {})      => get<{ data: FiscalDocument[]; meta: PaginationMeta }>('/fiscal/documents', f),
  getDocument:    (id: string)                         => get<FiscalDocument>(`/fiscal/documents/${id}`),
  issueDocument:  (data: Partial<FiscalDocument> & { seriesId: string }) => post<FiscalDocument>('/fiscal/documents', data),
  cancelDocument: (id: string)                         => patch<FiscalDocument>(`/fiscal/documents/${id}/cancel`, {}),
};
