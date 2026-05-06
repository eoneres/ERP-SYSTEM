import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '@/lib/api/settings.api';
import toast from 'react-hot-toast';

const KEY = ['settings'] as const;

export function useTenantSettings() {
  return useQuery({
    queryKey: KEY,
    queryFn:  settingsApi.getSettings,
    staleTime: 5 * 60 * 1000,
  });
}

function useSettingsMutation<T>(fn: (data: T) => Promise<any>, successMsg: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      qc.setQueryData(KEY, data);
      toast.success(successMsg);
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Erro ao salvar'),
  });
}

export function useUpdateCompany() {
  return useSettingsMutation(settingsApi.updateCompany, 'Dados da empresa salvos!');
}
export function useUpdateBranding() {
  return useSettingsMutation(settingsApi.updateBranding, 'Branding atualizado!');
}
export function useUpdateSystemSettings() {
  return useSettingsMutation(settingsApi.updateSystemSettings, 'Configurações salvas!');
}
export function useUpdateFeatureFlags() {
  return useSettingsMutation(
    (flags: Record<string, boolean>) => settingsApi.updateFeatureFlags(flags),
    'Feature flags atualizadas!',
  );
}
