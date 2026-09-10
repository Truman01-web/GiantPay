import type { Paginated } from '@/types/common';
import type { Payment, PaymentEvent, PaymentListItem, PaymentStatus, PaymentChannel } from '@/types/payments';
import { apiClient } from './client';

export interface PaymentListParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: PaymentStatus[];
  channel?: PaymentChannel[];
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  sort?: string;
}

function toQuery(params: PaymentListParams): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params) as Array<[string, unknown]>) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      search.set(key, value.join(','));
    } else {
      search.set(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const paymentsApi = {
  list: (params: PaymentListParams, options?: { signal?: AbortSignal }) =>
    apiClient.get<Paginated<PaymentListItem>>(`/payments${toQuery(params)}`, options),

  getById: (id: string, options?: { signal?: AbortSignal }) =>
    apiClient.get<Payment>(`/payments/${id}`, options),

  getEvents: (id: string, options?: { signal?: AbortSignal }) =>
    apiClient.get<PaymentEvent[]>(`/payments/${id}/events`, options),
};
