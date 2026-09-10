import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/services/api/dashboard';
import type { DateRange } from '@/types/common';

export function useDashboardSummary(range: DateRange) {
  return useQuery({
    queryKey: ['dashboard', 'summary', range.from, range.to],
    queryFn: ({ signal }) => dashboardApi.getSummary({ from: range.from, to: range.to }, { signal }),
  });
}

export function useDashboardVolume(range: DateRange) {
  return useQuery({
    queryKey: ['dashboard', 'volume', range.from, range.to],
    queryFn: ({ signal }) => dashboardApi.getVolume({ from: range.from, to: range.to }, { signal }),
  });
}
