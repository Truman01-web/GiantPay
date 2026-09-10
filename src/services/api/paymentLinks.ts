import type { Paginated } from '@/types/common';
import type { PaymentLink, PaymentLinkMode } from '@/types/payments';
import { apiClient } from './client';

export interface CreatePaymentLinkRequest {
  name: string;
  mode: PaymentLinkMode;
  amountMinor?: number;
  currency: string;
  description?: string;
  customerReference?: string;
  expiresAt?: string;
  reusable: boolean;
  maxSuccessfulPayments?: number;
  redirectUrl?: string;
}

export const paymentLinksApi = {
  list: (params: { page: number; pageSize: number; search?: string }, options?: { signal?: AbortSignal }) => {
    const search = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
      ...(params.search ? { search: params.search } : {}),
    });
    return apiClient.get<Paginated<PaymentLink>>(`/payment-links?${search.toString()}`, options);
  },

  getById: (id: string, options?: { signal?: AbortSignal }) =>
    apiClient.get<PaymentLink>(`/payment-links/${id}`, options),

  create: (payload: CreatePaymentLinkRequest, idempotencyKey: string) =>
    apiClient.post<PaymentLink>('/payment-links', payload, { idempotencyKey }),

  disable: (id: string) => apiClient.patch<PaymentLink>(`/payment-links/${id}`, { status: 'DISABLED' }),
};
