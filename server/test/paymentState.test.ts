import { describe, expect, it } from 'vitest';
import { decidePaymentTransition } from '../src/payments/paymentState.js';

describe('payment state machine', () => {
  it('allows documented forward transitions', () => {
    expect(decidePaymentTransition('CREATED', 'PROCESSING')).toBe('APPLY');
    expect(decidePaymentTransition('PROCESSING', 'PENDING')).toBe('APPLY');
    expect(decidePaymentTransition('PENDING', 'SUCCEEDED')).toBe('APPLY');
    expect(decidePaymentTransition('SUCCEEDED', 'PARTIALLY_REFUNDED')).toBe('APPLY');
  });

  it('treats a duplicate status as idempotent', () => {
    expect(decidePaymentTransition('SUCCEEDED', 'SUCCEEDED')).toBe('IDEMPOTENT');
  });

  it('rejects invalid and out-of-order transitions', () => {
    expect(decidePaymentTransition('CREATED', 'SUCCEEDED')).toBe('REJECT');
    expect(decidePaymentTransition('SUCCEEDED', 'PENDING')).toBe('REJECT');
    expect(decidePaymentTransition('FAILED', 'SUCCEEDED')).toBe('REJECT');
  });
});
