import type { Paginated } from '@/types/common';
import type { Settlement, SettlementListItem } from '@/types/settlements';
import { apiClient } from './client';

export const settlementsApi = {
  list: (params: { page: number; pageSize: number }, options?: { signal?: AbortSignal }) => {
    const search = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
    return apiClient.get<Paginated<SettlementListItem>>(`/settlements?${search}`, options);
  },
  getById: (id: string, options?: { signal?: AbortSignal }) => apiClient.get<Settlement>(`/settlements/${id}`, options),
  create: (payload: { currency: string; periodStart: string; periodEnd: string }, idempotencyKey: string) =>
    apiClient.post<Settlement>('/settlements', payload, { idempotencyKey }),
  submit: (id: string) => apiClient.post<Settlement>(`/settlements/${id}/submit`, {}),
  approve: (id: string) => apiClient.post<Settlement>(`/settlements/${id}/approve`, {}),
  cancel: (id: string, idempotencyKey: string) => apiClient.post<Settlement>(`/settlements/${id}/cancel`, {}, { idempotencyKey }),
  exportBatch: (id: string) => apiClient.postDownload(`/settlements/${id}/export`),
};
