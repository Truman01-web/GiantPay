import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QrCheckoutFlow } from './QrCheckoutFlow';

const state = vi.hoisted(() => ({
  qrStatus: 'READY',
  paymentStatus: null as string | null,
  submit: vi.fn(),
}));
vi.mock('./useScanToPayQueries', () => ({
  useQrCheckoutInfo: () => ({
    data: {
      token: 'synthetic-token',
      merchantDisplayName: 'Synthetic Merchant',
      mode: 'FIXED',
      amountMinor: 10000,
      currency: 'MWK',
      availableChannels: ['CARD'],
      status: state.qrStatus,
    },
    isPending: false,
    isError: false,
  }),
  useSubmitQrCheckout: () => ({ mutateAsync: state.submit, isPending: false, error: null }),
}));
vi.mock('@/features/checkout/usePaymentStatusPolling', () => ({
  usePaymentStatusPolling: (reference: string | undefined) => ({
    status:
      reference && state.paymentStatus
        ? {
            status: state.paymentStatus,
            reference,
            merchantDisplayName: 'Synthetic Merchant',
            amount: { amountMinor: 10000, currency: 'MWK' },
            merchantReference: null,
            confirmedAt: null,
          }
        : null,
    polling: true,
    refresh: vi.fn(),
  }),
}));

describe('QR confirmation precedence', () => {
  beforeEach(() => {
    state.qrStatus = 'READY';
    state.paymentStatus = null;
    state.submit
      .mockReset()
      .mockResolvedValue({
        reference: 'synthetic-reference',
        status: 'SUCCESS',
        checkoutUrl: null,
      });
  });
  it('ignores optimistic submit status and retains authoritative success after the QR expires', async () => {
    const view = render(
      <MemoryRouter>
        <QrCheckoutFlow />
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByText('Card (Visa / Mastercard)'));
    await userEvent.click(screen.getByRole('button', { name: /Pay Now/ }));
    expect(screen.queryByText('Backend-confirmed payment receipt')).toBeNull();
    expect(screen.getByText(/Verifying payment/)).toBeVisible();
    state.qrStatus = 'EXPIRED';
    state.paymentStatus = 'SUCCESS';
    view.rerender(
      <MemoryRouter>
        <QrCheckoutFlow />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: 'Payment successful' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'QR Code Expired' })).toBeNull();
  });
});
