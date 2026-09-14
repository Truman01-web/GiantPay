import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CheckoutFlow } from './CheckoutFlow';
import { usePaymentStatusPolling } from './usePaymentStatusPolling';

// Only the polling hook is mocked — session load and submit go through the
// real MSW handlers/fixtures (demo_token_ready). This isolates the render
// branch that used to cause an indefinite spinner (CheckoutFlow used to
// render nothing but a bare loader once `submittedReference` was set,
// regardless of whether polling was still running or had already given
// up) from the hook's own (separately, thoroughly tested) polling
// lifecycle — no real timers/network races involved here.
vi.mock('./usePaymentStatusPolling', () => ({ usePaymentStatusPolling: vi.fn() }));

const mockedUsePolling = vi.mocked(usePaymentStatusPolling);

function renderCheckout() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/checkout/demo_token_ready']}>
        <Routes>
          <Route path="/checkout/:token" element={<CheckoutFlow />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function submitPayment() {
  await waitFor(() => expect(screen.getByText(/paying kambaza traders/i)).toBeInTheDocument());
  await userEvent.click(screen.getByText('Mobile money'));
  await userEvent.type(screen.getByLabelText(/full name/i), 'Grace Phiri');
  await userEvent.type(screen.getByLabelText(/phone number/i), '991234567');
  await userEvent.click(screen.getByRole('button', { name: /^pay/i }));
}

describe('CheckoutFlow — submitted payment status rendering', () => {
  beforeEach(() => {
    mockedUsePolling.mockReset();
  });

  it('shows the checking-status loader while polling is still in progress', async () => {
    mockedUsePolling.mockReturnValue({ status: null, error: null, polling: true, refresh: vi.fn() });
    renderCheckout();
    await submitPayment();

    expect(await screen.findByText(/checking payment status/i)).toBeInTheDocument();
  });

  it('shows a recoverable error — not an indefinite spinner — once polling has given up without a status', async () => {
    const refresh = vi.fn();
    mockedUsePolling.mockReturnValue({
      status: null,
      error: "We couldn't confirm your payment status automatically. Please check again.",
      polling: false,
      refresh,
    });
    renderCheckout();
    await submitPayment();

    expect(await screen.findByText(/^we couldn't confirm your payment$/i)).toBeInTheDocument();
    expect(screen.queryByText(/checking payment status/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('shows the success result once the backend confirms a status', async () => {
    mockedUsePolling.mockReturnValue({
      status: {
        reference: 'GP-900001',
        status: 'SUCCESS',
        amount: { amountMinor: 4550000, currency: 'MWK' },
        merchantDisplayName: 'Kambaza Traders',
        merchantReference: 'INV-4821',
        confirmedAt: new Date().toISOString(),
      },
      error: null,
      polling: false,
      refresh: vi.fn(),
    });
    renderCheckout();
    await submitPayment();

    expect(await screen.findByText(/payment successful/i)).toBeInTheDocument();
  });
});
