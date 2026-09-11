export const PAYMENT_STATUSES = [
  'CREATED',
  'PROCESSING',
  'PENDING',
  'SUCCEEDED',
  'FAILED',
  'EXPIRED',
  'CANCELLED',
  'REFUND_PENDING',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
] as const;

export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

const transitions: Record<PaymentStatus, ReadonlySet<PaymentStatus>> = {
  CREATED: new Set(['PROCESSING']),
  PROCESSING: new Set(['PENDING', 'SUCCEEDED', 'FAILED', 'EXPIRED', 'CANCELLED']),
  PENDING: new Set(['SUCCEEDED', 'FAILED', 'EXPIRED', 'CANCELLED']),
  SUCCEEDED: new Set(['REFUND_PENDING', 'PARTIALLY_REFUNDED', 'REFUNDED']),
  FAILED: new Set(),
  EXPIRED: new Set(),
  CANCELLED: new Set(),
  REFUND_PENDING: new Set(['PARTIALLY_REFUNDED', 'REFUNDED']),
  PARTIALLY_REFUNDED: new Set(['REFUND_PENDING', 'REFUNDED']),
  REFUNDED: new Set(),
};

export type TransitionDecision = 'APPLY' | 'IDEMPOTENT' | 'REJECT';

export function decidePaymentTransition(current: PaymentStatus, next: PaymentStatus): TransitionDecision {
  if (current === next) return 'IDEMPOTENT';
  return transitions[current].has(next) ? 'APPLY' : 'REJECT';
}
