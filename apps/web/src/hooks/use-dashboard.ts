import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api/dashboard.api';

const REFETCH_INTERVAL = 60 * 1000; // 60s

export function useDashboardSummary() {
  return useQuery({
    queryKey:       ['dashboard', 'summary'],
    queryFn:        dashboardApi.getSummary,
    staleTime:      0,
    refetchInterval: REFETCH_INTERVAL,
    refetchOnWindowFocus: true,
  });
}

export function useDashboardActivity() {
  return useQuery({
    queryKey:       ['dashboard', 'activity'],
    queryFn:        dashboardApi.getActivity,
    staleTime:      0,
    refetchInterval: 30 * 1000,
  });
}

export function useDashboardAlerts() {
  return useQuery({
    queryKey:       ['dashboard', 'alerts'],
    queryFn:        dashboardApi.getAlerts,
    staleTime:      0,
    refetchInterval: REFETCH_INTERVAL,
  });
}
