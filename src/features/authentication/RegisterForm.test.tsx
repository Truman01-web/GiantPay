import { StrictMode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { env } from '@/app/config/env';
import { server } from '@/mocks/server';
import { RegisterForm } from './RegisterForm';

function renderForm(strict = false) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const form = (
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <RegisterForm />
      </MemoryRouter>
    </QueryClientProvider>
  );
  return render(strict ? <StrictMode>{form}</StrictMode> : form);
}

function queuedRegistration(challengeId = 'queued-registration-challenge-000001') {
  return {
    accepted: true as const,
    verificationRequired: true as const,
    challengeId,
    maskedDestination: 'm***@example.invalid',
    expiresAt: new Date(Date.now() + 600_000).toISOString(),
    resendAvailableAt: new Date(Date.now() + 60_000).toISOString(),
    delivery: { available: true, queued: true },
  };
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

  it('matches the twelve-character registration password requirement', () => {
    renderForm();
    expect(screen.getByText('At least 12 characters')).toBeInTheDocument();
  });

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

  it('shows an accurate success state after OTP verification', async () => {
    sessionStorage.setItem(
      'giantpay.registration.verification',
      JSON.stringify(queuedRegistration()),
    );
    renderForm();
    await userEvent.type(screen.getByLabelText(/verification code/i), '123456');
    await userEvent.click(screen.getByRole('button', { name: /verify email/i }));
    expect(await screen.findByRole('heading', { name: /email verified/i })).toBeInTheDocument();
    expect(screen.queryByText(/verification link/i)).not.toBeInTheDocument();
    expect(sessionStorage.getItem('giantpay.registration.verification')).toBeNull();
  });

  it('shows the normalized expired-code response and keeps recovery available', async () => {
    sessionStorage.setItem(
      'giantpay.registration.verification',
      JSON.stringify(queuedRegistration()),
    );
    server.use(
      http.post(`${env.apiUrl}/v1/auth/registration/verify`, () =>
        HttpResponse.json(
          {
            error: {
              code: 'REGISTRATION_OTP_EXPIRED',
              message: 'This verification code has expired.',
            },
          },
          { status: 410 },
        ),
      ),
    );
    renderForm();
    await userEvent.type(screen.getByLabelText(/verification code/i), '123456');
    await userEvent.click(screen.getByRole('button', { name: /verify email/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/expired/i);
    expect(screen.getByRole('button', { name: /request another code in/i })).toBeDisabled();
  });

  it('does not duplicate registration requests under React StrictMode', async () => {
    let requests = 0;
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.post(`${env.apiUrl}/v1/auth/register`, async () => {
        requests += 1;
        await pending;
        return HttpResponse.json(queuedRegistration());
      }),
    );
    renderForm(true);
    await userEvent.type(screen.getByLabelText(/business name/i), 'Safe Merchant');
    await userEvent.type(screen.getByLabelText(/work email/i), 'merchant@example.invalid');
    await userEvent.type(screen.getByLabelText(/phone number/i), '+265991234567');
    await userEvent.type(screen.getByLabelText(/^password/i), 'correct horse battery');
    await userEvent.type(screen.getByLabelText(/confirm password/i), 'correct horse battery');
    await userEvent.click(screen.getByRole('checkbox'));
    const form = screen.getByRole('button', { name: /create account/i }).closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    await waitFor(() => expect(requests).toBe(1));
    release();
    expect(await screen.findByText(/sent to m\*\*\*@example\.invalid/i)).toBeInTheDocument();
  });

  it('does not duplicate verification or resend requests under React StrictMode', async () => {
    let verificationRequests = 0;
    let resendRequests = 0;
    let releaseVerification!: () => void;
    let releaseResend!: () => void;
    const verificationPending = new Promise<void>((resolve) => {
      releaseVerification = resolve;
    });
    const resendPending = new Promise<void>((resolve) => {
      releaseResend = resolve;
    });
    sessionStorage.setItem(
      'giantpay.registration.verification',
      JSON.stringify({ ...queuedRegistration(), resendAvailableAt: new Date(0).toISOString() }),
    );
    server.use(
      http.post(`${env.apiUrl}/v1/auth/registration/verify`, async () => {
        verificationRequests += 1;
        await verificationPending;
        return HttpResponse.json({ verified: true });
      }),
      http.post(`${env.apiUrl}/v1/auth/registration/resend`, async () => {
        resendRequests += 1;
        await resendPending;
        return HttpResponse.json(queuedRegistration('replacement-challenge-000001'));
      }),
    );
    renderForm(true);
    const resend = screen.getByRole('button', { name: /^request another code$/i });
    fireEvent.click(resend);
    fireEvent.click(resend);
    await waitFor(() => expect(resendRequests).toBe(1));
    releaseResend();
    await screen.findByRole('button', { name: /request another code in/i });
    await userEvent.type(screen.getByLabelText(/verification code/i), '123456');
    const verificationForm = screen.getByRole('button', { name: /verify email/i }).closest('form')!;
    fireEvent.submit(verificationForm);
    fireEvent.submit(verificationForm);
    await waitFor(() => expect(verificationRequests).toBe(1));
    releaseVerification();
  });
});
