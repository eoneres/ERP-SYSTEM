import { get, post } from './client';
import type { PaginationMeta } from '@/components/ui/data-table';

export type ReportModule  = 'sales' | 'finance' | 'inventory' | 'hr' | 'general';
export type ExportFormat  = 'csv' | 'xlsx' | 'pdf';
export type ExecStatus    = 'pending' | 'processing' | 'completed' | 'failed';

export interface ReportFilterDef {
  key:       string;
  label:     string;
  type:      'date' | 'daterange' | 'select' | 'text';
  required?: boolean;
  options?:  { value: string; label: string }[];
}

export interface ReportColumnDef {
  key:   string;
  label: string;
  type:  'string' | 'number' | 'currency' | 'date' | 'datetime' | 'percent';
}

export interface ReportTemplate {
  id:          string;
  name:        string;
  module:      ReportModule;
  description?: string;
  columns:     ReportColumnDef[];
  filters:     ReportFilterDef[];
  isSystem:    boolean;
}

export interface ReportExecution {
  id:          string;
  templateId:  string;
  template?:   Pick<ReportTemplate, 'id' | 'name' | 'module'>;
  executedBy:  string;
  parameters:  Record<string, any>;
  status:      ExecStatus;
  format:      ExportFormat;
  rowCount?:   number;
  errorMessage?: string;
  completedAt?: string;
  createdAt:   string;
}

export interface GenerateResult {
  executionId: string;
  rowCount:    number;
  fileName:    string;
  mimeType:    string;
  buffer:      string; // base64
}

export const reportsApi = {
  getTemplates: (module?: ReportModule) =>
    get<ReportTemplate[]>('/reports/templates', module ? { module } : {}),

  getTemplate: (id: string) =>
    get<ReportTemplate>(`/reports/templates/${id}`),

  generate: (templateId: string, format: ExportFormat, parameters: Record<string, any>) =>
    post<GenerateResult>('/reports/generate', { templateId, format, parameters }),

  getExecutions: (page = 1, limit = 20) =>
    get<{ data: ReportExecution[]; meta: PaginationMeta }>('/reports/executions', { page, limit }),
};
