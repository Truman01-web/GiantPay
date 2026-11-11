import type { CheckoutSession, CheckoutStatus, PaymentChannel } from '@/types/payments';
import { apiClient } from './client';
import { z } from 'zod';
import { ApiError, GENERIC_ERROR_MESSAGE } from './errors';

const submitResultSchema = z.object({
  reference: z.string().min(1),
  status: z.string().optional(),
  checkoutUrl: z.string().refine((value) => {
    try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'checkout.flutterwave.com' && !url.port && !url.username && !url.password; } catch { return false; }
  }).nullish(),
});

export function validateCheckoutSubmitResult(value: unknown) {
  const parsed = submitResultSchema.safeParse(value);
  if (!parsed.success) throw new ApiError({ status: 502, code: 'INVALID_RESPONSE', message: GENERIC_ERROR_MESSAGE });
  return parsed.data;
}

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
    apiClient.post<unknown>(`/checkout/${token}/submit`, payload, { idempotencyKey }).then(validateCheckoutSubmitResult),

  // The ONLY source of truth for a payment outcome. Never inferred from
  // redirect params, provider callbacks, or client timers.
  getTrustedStatus: (reference: string, options?: { signal?: AbortSignal }) =>
    apiClient.get<TrustedPaymentStatus>(`/payment-status/${reference}`, options),
};
