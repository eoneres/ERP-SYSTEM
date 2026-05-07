import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { crmApi, type LeadFilter, type LeadStage } from '@/lib/api/crm.api';
import toast from 'react-hot-toast';

export const crmKeys = {
  all:          ['crm'] as const,
  summary:      () => ['crm', 'summary'] as const,
  kanban:       () => ['crm', 'kanban'] as const,
  leads:        (f: LeadFilter = {}) => ['crm', 'leads', JSON.stringify(f)] as const,
  lead:         (id: string) => ['crm', 'lead', id] as const,
  quotes:       (leadId: string) => ['crm', 'quotes', leadId] as const,
  interactions: (leadId: string) => ['crm', 'interactions', leadId] as const,
};

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  return qc.invalidateQueries({ queryKey: ['crm'] });
}

// ─── Summary / Kanban ─────────────────────────────────────────────────────────

export function useCrmSummary() {
  return useQuery({ queryKey: crmKeys.summary(), queryFn: crmApi.getSummary, staleTime: 2 * 60 * 1000 });
}

export function useCrmKanban() {
  return useQuery({ queryKey: crmKeys.kanban(), queryFn: crmApi.getKanban, staleTime: 0, refetchOnWindowFocus: true });
}

// ─── Leads ────────────────────────────────────────────────────────────────────

export function useLeads(filter: LeadFilter = {}) {
  return useQuery({
    queryKey: crmKeys.leads(filter),
    queryFn:  () => crmApi.getLeads(filter),
    staleTime: 60 * 1000,
    placeholderData: (prev: any) => prev,
  });
}

export function useLead(id: string) {
  return useQuery({ queryKey: crmKeys.lead(id), queryFn: () => crmApi.getLead(id), enabled: !!id });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: crmApi.createLead,
    onSuccess: () => { invalidateAll(qc); toast.success('Lead criado!'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao criar lead'),
  });
}

export function useUpdateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => crmApi.updateLead(id, data),
    onSuccess: () => { invalidateAll(qc); toast.success('Lead atualizado!'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao atualizar lead'),
  });
}

export function useMoveLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stage, kanbanOrder }: { id: string; stage: LeadStage; kanbanOrder?: number }) =>
      crmApi.moveLead(id, stage, kanbanOrder),
    onSuccess: () => invalidateAll(qc),
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao mover lead'),
  });
}

export function useConvertLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, customerName }: { id: string; customerName?: string }) =>
      crmApi.convertLead(id, customerName),
    onSuccess: (result) => {
      invalidateAll(qc);
      qc.invalidateQueries({ queryKey: ['sales'] });
      toast.success(result.created ? 'Lead convertido — cliente criado!' : 'Lead convertido — cliente já existia');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao converter lead'),
  });
}

export function useDeleteLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: crmApi.deleteLead,
    onSuccess: () => { invalidateAll(qc); toast.success('Lead removido'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao remover lead'),
  });
}

// ─── Quotes ───────────────────────────────────────────────────────────────────

export function useQuotes(leadId: string) {
  return useQuery({ queryKey: crmKeys.quotes(leadId), queryFn: () => crmApi.getQuotes(leadId), enabled: !!leadId });
}

export function useCreateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: crmApi.createQuote,
    onSuccess: () => { invalidateAll(qc); toast.success('Proposta criada!'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao criar proposta'),
  });
}

export function useUpdateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => crmApi.updateQuote(id, data),
    onSuccess: () => { invalidateAll(qc); toast.success('Proposta atualizada!'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao atualizar proposta'),
  });
}

export function useDeleteQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: crmApi.deleteQuote,
    onSuccess: () => { invalidateAll(qc); toast.success('Proposta removida'); },
    onError: () => toast.error('Erro ao remover proposta'),
  });
}

// ─── Interactions ─────────────────────────────────────────────────────────────

export function useInteractions(leadId: string) {
  return useQuery({ queryKey: crmKeys.interactions(leadId), queryFn: () => crmApi.getInteractions(leadId), enabled: !!leadId });
}

export function useCreateInteraction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: crmApi.createInteraction,
    onSuccess: () => { invalidateAll(qc); toast.success('Interação registrada!'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao registrar interação'),
  });
}

export function useDeleteInteraction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: crmApi.deleteInteraction,
    onSuccess: () => { invalidateAll(qc); toast.success('Interação removida'); },
    onError: () => toast.error('Erro ao remover interação'),
  });
}
