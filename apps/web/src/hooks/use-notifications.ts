import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api/notifications.api';
import toast from 'react-hot-toast';

const KEYS = {
  all:   ['notifications'] as const,
  count: ['notifications', 'count'] as const,
};

export function useNotifications(unread?: boolean) {
  return useQuery({
    queryKey: [...KEYS.all, { unread }],
    queryFn:  () => notificationsApi.getAll(unread),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: KEYS.count,
    queryFn:  notificationsApi.getUnreadCount,
    staleTime: 0,
    refetchInterval: 30 * 1000,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.markRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Todas as notificações marcadas como lidas');
    },
  });
}

// ─── SSE substituído por polling ────────────────────────────────────────────
// EventSource não suporta refresh de token — usamos polling via TanStack Query
// que já tem o interceptor Axios com refresh automático.
export function useNotificationStream() {
  // Polling a cada 15s via useUnreadCount já existente — nada adicional necessário
  // O badge e a lista atualizam automaticamente via refetchInterval
}
