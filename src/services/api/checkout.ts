import type { CheckoutSession, CheckoutStatus, PaymentChannel } from '@/types/payments';
import { apiClient } from './client';

export interface CheckoutSubmitRequest {
  channel: PaymentChannel;
  customer: { name?: string; email?: string; phone?: string };
}

export interface TrustedPaymentStatus {
  reference: string;
  status: CheckoutStatus;
  amount: { amountMinor: number; currency: string };
  merchantDisplayName: string;
  merchantReference: string | null;
  confirmedAt: string | null;
}

export const checkoutApi = {
  getSession: (token: string, options?: { signal?: AbortSignal }) =>
    apiClient.get<CheckoutSession>(`/checkout/${token}`, options),

  submit: (token: string, payload: CheckoutSubmitRequest, idempotencyKey: string) =>
    apiClient.post<{ reference: string }>(`/checkout/${token}/submit`, payload, { idempotencyKey }),

  // The ONLY source of truth for a payment outcome. Never inferred from
  // redirect params, provider callbacks, or client timers.
  getTrustedStatus: (reference: string, options?: { signal?: AbortSignal }) =>
    apiClient.get<TrustedPaymentStatus>(`/payment-status/${reference}`, options),
};
