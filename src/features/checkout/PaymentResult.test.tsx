import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PaymentResult } from './PaymentResult';
import type { TrustedPaymentStatus } from '@/services/api/checkout';

describe('trusted payment result presentation', () => {
  const base = {
    reference: 'synthetic-reference',
    amount: { amountMinor: 10000, currency: 'MWK' },
    merchantDisplayName: 'Synthetic Merchant',
    merchantReference: null,
    confirmedAt: null,
  };
  it.each([
    ['PENDING', 'Payment pending'],
    ['PROCESSING', 'Confirming your payment'],
    ['SUCCESS', 'Payment successful'],
    ['FAILED', 'Payment failed'],
    ['CANCELLED', 'Payment cancelled'],
    ['EXPIRED', 'This payment session expired'],
  ] as const)(
    'renders %s distinctly and gives a receipt only for backend SUCCESS',
    (status, title) => {
      render(
        <PaymentResult
          status={{ ...base, status } as TrustedPaymentStatus}
          polling={false}
          onRefresh={vi.fn()}
        />,
      );
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(title);
      if (status === 'SUCCESS')
        expect(screen.getByText('Backend-confirmed payment receipt')).toBeVisible();
      else expect(screen.queryByText('Backend-confirmed payment receipt')).toBeNull();
      if (['FAILED', 'CANCELLED', 'EXPIRED'].includes(status))
        expect(screen.queryByRole('button', { name: 'Check status again' })).toBeNull();
    },
  );
});
