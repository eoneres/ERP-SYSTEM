import { get, post, put, patch, del } from './client';
import type { PaginationMeta } from '@/components/ui/data-table';

// ─── Types ────────────────────────────────────────────────────────────────────

export type LeadStage   = 'new' | 'contacted' | 'proposal' | 'negotiation' | 'converted' | 'lost';
export type LeadSource  = 'website' | 'referral' | 'social' | 'email' | 'phone' | 'event' | 'other';
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
export type InteractionType = 'call' | 'email' | 'meeting' | 'note' | 'task' | 'other';

export interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  stage: LeadStage;
  source?: LeadSource;
  estimatedValue?: number;
  probability: number;
  expectedCloseDate?: string;
  ownerId?: string;
  convertedCustomerId?: string;
  convertedAt?: string;
  lostReason?: string;
  notes?: string;
  kanbanOrder: number;
  createdAt: string;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  leadId: string;
  status: QuoteStatus;
  amount: number;
  discount: number;
  validUntil?: string;
  description?: string;
  terms?: string;
  notes?: string;
  createdAt: string;
}

export interface Interaction {
  id: string;
  leadId: string;
  type: InteractionType;
  subject: string;
  description?: string;
  interactionDate: string;
  nextActionDate?: string;
  nextActionNote?: string;
  createdAt: string;
}

export interface CrmSummary {
  total: number;
  byStage: Record<LeadStage, { count: number; value: number }>;
  pipelineValue: number;
}

export interface KanbanData {
  [stage: string]: Lead[];
}

export interface LeadFilter {
  page?: number; limit?: number; search?: string;
  stage?: LeadStage; source?: LeadSource; ownerId?: string;
  [key: string]: unknown;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const crmApi = {
  // Leads
  getLeads:   (f: LeadFilter = {}) => get<{ data: Lead[]; meta: PaginationMeta }>('/crm/leads', f),
  getLead:    (id: string)          => get<Lead>(`/crm/leads/${id}`),
  createLead: (data: Partial<Lead>) => post<Lead>('/crm/leads', data),
  updateLead: (id: string, data: Partial<Lead>) => put<Lead>(`/crm/leads/${id}`, data),
  moveLead:   (id: string, stage: LeadStage, kanbanOrder?: number) =>
    patch<Lead>(`/crm/leads/${id}/move`, { stage, kanbanOrder }),
  convertLead: (id: string, customerName?: string) =>
    patch<{ lead: Lead; customer: any; created: boolean }>(`/crm/leads/${id}/convert`, { customerName }),
  deleteLead: (id: string) => del<void>(`/crm/leads/${id}`),

  // Quotes
  getQuotes:   (leadId: string)                  => get<Quote[]>(`/crm/quotes/lead/${leadId}`),
  createQuote: (data: Partial<Quote>)            => post<Quote>('/crm/quotes', data),
  updateQuote: (id: string, data: Partial<Quote>) => put<Quote>(`/crm/quotes/${id}`, data),
  deleteQuote: (id: string)                      => del<void>(`/crm/quotes/${id}`),

  // Interactions
  getInteractions:   (leadId: string)                        => get<Interaction[]>(`/crm/interactions/lead/${leadId}`),
  createInteraction: (data: Partial<Interaction>)            => post<Interaction>('/crm/interactions', data),
  updateInteraction: (id: string, data: Partial<Interaction>) => put<Interaction>(`/crm/interactions/${id}`, data),
  deleteInteraction: (id: string)                            => del<void>(`/crm/interactions/${id}`),

  // Dashboard
  getSummary: () => get<CrmSummary>('/crm/dashboard/summary'),
  getKanban:  () => get<KanbanData>('/crm/dashboard/kanban'),
};
