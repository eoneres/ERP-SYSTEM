import { useQuery } from '@tanstack/react-query';
import { auditApi, type AuditFilter } from '@/lib/api/audit.api';

export function useAuditLogs(filter: AuditFilter = {}) {
  return useQuery({
    queryKey: ['audit', 'logs', JSON.stringify(filter)],
    queryFn:  () => auditApi.getLogs(filter),
    staleTime: 30 * 1000,
    placeholderData: (prev: any) => prev,
  });
}

export function useAuditModules() {
  return useQuery({
    queryKey: ['audit', 'modules'],
    queryFn:  auditApi.getModules,
    staleTime: 5 * 60 * 1000,
  });
}
