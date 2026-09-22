import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { env } from '@/app/config/env';
import { server } from '@/mocks/server';
import { RegisterForm } from './RegisterForm';

function renderForm() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter><RegisterForm /></MemoryRouter>
    </QueryClientProvider>,
  );
}

async function submitRegistration() {
  await userEvent.type(screen.getByLabelText(/business name/i), 'Safe Merchant');
  await userEvent.type(screen.getByLabelText(/work email/i), 'merchant@example.invalid');
  await userEvent.type(screen.getByLabelText(/phone number/i), '+265991234567');
  await userEvent.type(screen.getByLabelText(/^password/i), 'correct horse battery');
  await userEvent.type(screen.getByLabelText(/confirm password/i), 'correct horse battery');
  await userEvent.click(screen.getByRole('checkbox'));
  await userEvent.click(screen.getByRole('button', { name: /create account/i }));
}

describe('registration email verification', () => {
  beforeEach(() => sessionStorage.clear());

  it('never claims delivery when the backend reports it unavailable and retains recovery', async () => {
    renderForm();
    await submitRegistration();
    expect(await screen.findByText(/email delivery is currently unavailable/i)).toBeInTheDocument();
    expect(screen.queryByText(/email sent/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /request another code in/i })).toBeDisabled();
    const recovery = sessionStorage.getItem('giantpay.registration.verification');
    expect(recovery).toContain('mock-registration-challenge');
    expect(recovery).not.toMatch(/"code"|\b\d{6}\b/);
  });

  it('shows the masked destination and OTP form only after delivery is queued', async () => {
    server.use(
      http.post(`${env.apiUrl}/v1/auth/register`, () =>
        HttpResponse.json({
          accepted: true,
          verificationRequired: true,
          challengeId: 'queued-registration-challenge-000001',
          maskedDestination: 'm***@example.invalid',
          expiresAt: new Date(Date.now() + 600_000).toISOString(),
          resendAvailableAt: new Date(Date.now() + 60_000).toISOString(),
          delivery: { available: true, queued: true },
        }),
      ),
    );
    renderForm();
    await submitRegistration();
    expect(await screen.findByText(/sent to m\*\*\*@example\.invalid/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
  });

  it('shows safe retry guidance after a provider rejection', async () => {
    server.use(
      http.post(`${env.apiUrl}/v1/auth/register`, () =>
        HttpResponse.json({
          accepted: true,
          verificationRequired: true,
          challengeId: 'failed-registration-challenge-000001',
          maskedDestination: 'm***@example.invalid',
          expiresAt: new Date(Date.now() + 600_000).toISOString(),
          resendAvailableAt: new Date(Date.now() + 60_000).toISOString(),
          delivery: { available: true, queued: false, errorCode: 'DELIVERY_REJECTED' },
        }),
      ),
    );
    renderForm();
    await submitRegistration();
    expect(await screen.findByText(/could not send a code/i)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('DELIVERY_REJECTED');
  });
});
