import type { Paginated } from '@/types/common';
import type {
  ScanToPayCode,
  CreateScanToPayInput,
  QrCheckoutInfo,
  QrCheckoutSubmitInput,
  QrCheckoutSubmitResult,
  QrPaymentItem,
} from '@/types/scanToPay';
import { apiClient } from './client';
import { validateCheckoutSubmitResult } from './checkout';

export const scanToPayApi = {
  list: (params: { page: number; pageSize: number }, options?: { signal?: AbortSignal }) => {
    const search = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
    });
    return apiClient.get<Paginated<ScanToPayCode>>(`/qr?${search.toString()}`, options);
  },

  getById: (id: string, options?: { signal?: AbortSignal }) =>
    apiClient.get<ScanToPayCode>(`/qr/${id}`, options),

  create: (payload: CreateScanToPayInput, idempotencyKey: string) =>
    apiClient.post<ScanToPayCode>('/qr', payload, { idempotencyKey }),

  disable: (id: string) =>
    apiClient.patch<ScanToPayCode>(`/qr/${id}`, { status: 'DISABLED' }),

  getCheckoutInfo: (token: string, options?: { signal?: AbortSignal }) =>
    apiClient.get<QrCheckoutInfo>(`/checkout/qr/${token}`, options),

  submitPayment: (token: string, payload: QrCheckoutSubmitInput, idempotencyKey: string) =>
    apiClient.post<QrCheckoutSubmitResult>(`/checkout/qr/${token}/submit`, { ...payload, customer: payload.customer ?? {} }, { idempotencyKey }).then(validateCheckoutSubmitResult),

  getPayments: (id: string, params: { page: number; pageSize: number }, options?: { signal?: AbortSignal }) => {
    const search = new URLSearchParams({
      page: String(params.page),
      pageSize: String(params.pageSize),
    });
    return apiClient.get<Paginated<QrPaymentItem>>(`/qr/${id}/payments?${search.toString()}`, options);
  },
};
