import { useQuery } from '@tanstack/react-query';
import { settlementsApi } from '@/services/api/settlements';

export function useSettlementsList(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: ['settlements', 'list', params],
    queryFn: ({ signal }) => settlementsApi.list(params, { signal }),
    placeholderData: (previous) => previous,
  });
}

export function useSettlementDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['settlements', 'detail', id],
    queryFn: ({ signal }) => settlementsApi.getById(id!, { signal }),
    enabled: Boolean(id),
  });
}
