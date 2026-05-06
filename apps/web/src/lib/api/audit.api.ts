import { get } from './client';
import type { PaginationMeta } from '@/components/ui/data-table';

export interface AuditLog {
  id: string;
  tenantId?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  method: string;
  url: string;
  module?: string;
  action?: string;
  resourceId?: string;
  statusCode?: number;
  durationMs?: number;
  ipAddress?: string;
  userAgent?: string;
  errorMessage?: string;
  success: boolean;
  createdAt: string;
}

export interface AuditFilter {
  module?:   string;
  userId?:   string;
  action?:   string;
  dateFrom?: string;
  dateTo?:   string;
  success?:  boolean;
  page?:     number;
  limit?:    number;
}

export const auditApi = {
  getLogs:    (f: AuditFilter = {}) =>
    get<{ data: AuditLog[]; meta: PaginationMeta }>('/audit', f as any),
  getModules: () => get<string[]>('/audit/modules'),
};
