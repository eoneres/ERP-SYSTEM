import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fiscalApi, type FiscalDocumentFilter } from '@/lib/api/fiscal.api';
import toast from 'react-hot-toast';

export const fiscalKeys = {
  series:    () => ['fiscal', 'series'] as const,
  documents: (f: FiscalDocumentFilter = {}) => ['fiscal', 'documents', JSON.stringify(f)] as const,
  document:  (id: string) => ['fiscal', 'document', id] as const,
};

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  return qc.invalidateQueries({ queryKey: ['fiscal'] });
}

export function useFiscalSeries() {
  return useQuery({ queryKey: fiscalKeys.series(), queryFn: fiscalApi.getSeries, staleTime: 5 * 60 * 1000 });
}

export function useFiscalDocuments(filter: FiscalDocumentFilter = {}) {
  return useQuery({
    queryKey: fiscalKeys.documents(filter),
    queryFn:  () => fiscalApi.getDocuments(filter),
    staleTime: 0,
    placeholderData: (prev: any) => prev,
  });
}

export function useFiscalDocument(id: string) {
  return useQuery({ queryKey: fiscalKeys.document(id), queryFn: () => fiscalApi.getDocument(id), enabled: !!id });
}

export function useCreateSeries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fiscalApi.createSeries,
    onSuccess: () => { invalidate(qc); toast.success('Série criada!'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao criar série'),
  });
}

export function useUpdateSeries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => fiscalApi.updateSeries(id, data),
    onSuccess: () => { invalidate(qc); toast.success('Série atualizada!'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao atualizar série'),
  });
}

export function useDeleteSeries() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fiscalApi.deleteSeries,
    onSuccess: () => { invalidate(qc); toast.success('Série excluída'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao excluir série'),
  });
}

export function useIssueDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fiscalApi.issueDocument,
    onSuccess: () => { invalidate(qc); toast.success('Documento fiscal emitido!'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao emitir documento'),
  });
}

export function useCancelDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fiscalApi.cancelDocument,
    onSuccess: () => { invalidate(qc); toast.success('Documento cancelado'); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao cancelar documento'),
  });
}
