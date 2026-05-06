import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportsApi, type ReportModule, type ExportFormat } from '@/lib/api/reports.api';
import toast from 'react-hot-toast';

export const reportKeys = {
  templates:  (m?: ReportModule) => ['reports', 'templates', m ?? 'all'] as const,
  executions: (p: number) => ['reports', 'executions', p] as const,
};

export function useReportTemplates(module?: ReportModule) {
  return useQuery({
    queryKey: reportKeys.templates(module),
    queryFn:  () => reportsApi.getTemplates(module),
    staleTime: 10 * 60 * 1000,
  });
}

export function useGenerateReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      templateId, format, parameters,
    }: { templateId: string; format: ExportFormat; parameters: Record<string, any> }) =>
      reportsApi.generate(templateId, format, parameters),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['reports', 'executions'] });
      toast.success(`Relatório gerado — ${data.rowCount} registros`);
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message ?? 'Erro ao gerar relatório'),
  });
}

export function useReportExecutions(page = 1) {
  return useQuery({
    queryKey: reportKeys.executions(page),
    queryFn:  () => reportsApi.getExecutions(page),
    staleTime: 30 * 1000,
    placeholderData: (prev: any) => prev,
  });
}

// Helper: triggers browser download from base64 buffer
export function downloadReport(buffer: string, fileName: string, mimeType: string) {
  const bytes  = Uint8Array.from(atob(buffer), (c) => c.charCodeAt(0));
  const blob   = new Blob([bytes], { type: mimeType });
  const url    = URL.createObjectURL(blob);
  const a      = document.createElement('a');
  a.href       = url;
  a.download   = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
