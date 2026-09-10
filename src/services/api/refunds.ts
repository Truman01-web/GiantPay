import type { Paginated } from '@/types/common';
import type { Refund } from '@/types/payments';
import { apiClient } from './client';

export interface CreateRefundRequest {
  paymentId: string;
  amountMinor: number;
  reason: string;
}

export const refundsApi = {
  list: (params: { page: number; pageSize: number; status?: string[] }, options?: { signal?: AbortSignal }) => {
    const search = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
    if (params.status?.length) search.set('status', params.status.join(','));
    return apiClient.get<Paginated<Refund>>(`/refunds?${search.toString()}`, options);
  },

  getById: (id: string, options?: { signal?: AbortSignal }) =>
    apiClient.get<Refund>(`/refunds/${id}`, options),

  create: (payload: CreateRefundRequest, idempotencyKey: string) =>
    apiClient.post<Refund>('/refunds', payload, { idempotencyKey }),
};
