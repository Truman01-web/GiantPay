import type { Paginated } from '@/types/common';
import type { Settlement, SettlementListItem } from '@/types/settlements';
import { apiClient } from './client';

export const settlementsApi = {
  list: (params: { page: number; pageSize: number }, options?: { signal?: AbortSignal }) => {
    const search = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
    return apiClient.get<Paginated<SettlementListItem>>(`/settlements?${search}`, options);
  },
  getById: (id: string, options?: { signal?: AbortSignal }) => apiClient.get<Settlement>(`/settlements/${id}`, options),
  create: (payload: { currency: string; periodStart: string; periodEnd: string }) =>
    apiClient.post<Settlement>('/settlements', payload, { idempotencyKey: crypto.randomUUID() }),
  submit: (id: string) => apiClient.post<Settlement>(`/settlements/${id}/submit`, {}),
  approve: (id: string) => apiClient.post<Settlement>(`/settlements/${id}/approve`, {}),
  cancel: (id: string) => apiClient.post<Settlement>(`/settlements/${id}/cancel`, {}, { idempotencyKey: crypto.randomUUID() }),
  exportBatch: (id: string) => apiClient.post<unknown>(`/settlements/${id}/export`, {}),
};
