import type { CheckoutSession } from '@/types/payments';

export const MOCK_CHECKOUT_SESSIONS: Record<string, CheckoutSession> = {
  demo_token_ready: {
    token: 'demo_token_ready',
    reference: 'GP-900001',
    merchantDisplayName: 'Kambaza Traders',
    description: 'Order #4821 — assorted hardware',
    merchantReference: 'INV-4821',
    amount: { amountMinor: 4550000, currency: 'MWK' },
    availableChannels: ['MOBILE_MONEY', 'CARD'],
    requiredCustomerFields: ['name', 'phone'],
    status: 'READY',
    expiresAt: new Date(Date.now() + 1000 * 60 * 15).toISOString(),
  },
  demo_token_expired: {
    token: 'demo_token_expired',
    reference: 'GP-900002',
    merchantDisplayName: 'Kambaza Traders',
    description: 'Order #4790',
    merchantReference: 'INV-4790',
    amount: { amountMinor: 1200000, currency: 'MWK' },
    availableChannels: ['MOBILE_MONEY'],
    requiredCustomerFields: ['name', 'phone'],
    status: 'EXPIRED',
    expiresAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
};

/** In-memory outcome map so the mock backend can simulate a delayed,
 * trusted status transition after `submit` is called — the frontend still
 * only ever learns the outcome by asking this "backend" for the truth. */
export const submittedReferences = new Map<
  string,
  { status: 'PROCESSING' | 'SUCCESS' | 'FAILED'; submittedAt: number }
>();
