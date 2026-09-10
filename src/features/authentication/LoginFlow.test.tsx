import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSessionStore } from '@/services/auth/sessionStore';
import { LoginFlow } from './LoginFlow';

function renderLoginFlow() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/login']}>
        <LoginFlow />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('LoginFlow', () => {
  beforeEach(() => {
    useSessionStore.setState({ status: 'unauthenticated', session: null });
  });

  it('rejects an invalid credential pair with a safe error message', async () => {
    renderLoginFlow();
    await userEvent.type(screen.getByLabelText(/email address/i), 'nobody@example.mw');
    await userEvent.type(screen.getByLabelText(/^password/i), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/incorrect/i)).toBeInTheDocument();
  });

  it('requires an MFA code for an account with two-factor enabled, then authenticates on a correct code', async () => {
    renderLoginFlow();
    await userEvent.type(screen.getByLabelText(/email address/i), 'chikondi.banda@kambazapay.mw');
    await userEvent.type(screen.getByLabelText(/^password/i), 'GiantPay!Demo1');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/verify it's you/i)).toBeInTheDocument();

    const digitInputs = screen.getAllByLabelText(/digit \d of 6/i);
    for (const [i, digit] of '123456'.split('').entries()) {
      await userEvent.type(digitInputs[i], digit);
    }
    await userEvent.click(screen.getByRole('button', { name: /^verify$/i }));

    await waitFor(() => {
      expect(useSessionStore.getState().status).toBe('authenticated');
    });
    expect(useSessionStore.getState().session?.user.email).toBe('chikondi.banda@kambazapay.mw');
  });
});
