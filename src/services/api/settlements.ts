import type { Paginated } from '@/types/common';
import type { Settlement, SettlementListItem } from '@/types/settlements';
import { apiClient } from './client';

export const settlementsApi = {
  list: (params: { page: number; pageSize: number }, options?: { signal?: AbortSignal }) => {
    const search = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
    return apiClient.get<Paginated<SettlementListItem>>(`/settlements?${search.toString()}`, options);
  },

  getById: (id: string, options?: { signal?: AbortSignal }) => apiClient.get<Settlement>(`/settlements/${id}`, options),
};
