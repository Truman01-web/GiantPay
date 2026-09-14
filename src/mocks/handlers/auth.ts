import { http, HttpResponse } from 'msw';
import { env } from '@/app/config/env';
import { DEMO_ACCOUNTS } from '../fixtures/session';
import type { Session } from '@/types/auth';

const base = `${env.apiUrl}/v1`;

// In-memory mock session store, keyed by a fake cookie value. This is
// intentionally not localStorage — it models a server-side session and
// disappears on full page reload, same as a real HttpOnly cookie would
// behave from the frontend's point of view (nothing to read/write client-side).
let activeSession: Session | null = null;
let pendingMfa: { email: string; challengeId: string } | null = null;

/** Called between tests — this module-level state otherwise persists
 * across test *files* under this project's `isolate: false` vitest config
 * (worker reuse shares the module registry), so an earlier file's login
 * can otherwise leak a session into an unrelated, later test. */
export function resetAuthMockState(): void {
  activeSession = null;
  pendingMfa = null;
}

export const authHandlers = [
  http.post(`${base}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    const account = DEMO_ACCOUNTS.find((a) => a.email === body.email && a.password === body.password);

    if (!account) {
      return HttpResponse.json(
        { error: { code: 'INVALID_CREDENTIALS', message: 'That email or password is incorrect.' } },
        { status: 401 },
      );
    }

    if (account.session.user.mfaEnabled) {
      const challengeId = `chal_${Math.random().toString(36).slice(2, 10)}`;
      pendingMfa = { email: account.email, challengeId };
      return HttpResponse.json({
        status: 'MFA_REQUIRED',
        mfaChallenge: {
          challengeId,
          method: 'TOTP',
          codeLength: 6,
          expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
          resendAvailableAt: new Date(Date.now() + 30_000).toISOString(),
        },
      });
    }

    activeSession = account.session;
    return HttpResponse.json({ status: 'AUTHENTICATED', session: account.session });
  }),

  http.post(`${base}/auth/mfa/verify`, async ({ request }) => {
    const body = (await request.json()) as { challengeId: string; code: string };
    if (!pendingMfa || pendingMfa.challengeId !== body.challengeId) {
      return HttpResponse.json(
        { error: { code: 'CHALLENGE_EXPIRED', message: 'This verification session has expired.' } },
        { status: 400 },
      );
    }
    if (body.code !== '123456') {
      return HttpResponse.json(
        { error: { code: 'INVALID_CODE', message: 'That code is incorrect. Please try again.' } },
        { status: 400 },
      );
    }
    const account = DEMO_ACCOUNTS.find((a) => a.email === pendingMfa!.email)!;
    activeSession = account.session;
    pendingMfa = null;
    return HttpResponse.json({ session: account.session });
  }),

  http.post(`${base}/auth/mfa/resend`, async () => {
    if (!pendingMfa) {
      return HttpResponse.json({ error: { code: 'NO_CHALLENGE', message: 'No pending verification.' } }, { status: 400 });
    }
    return HttpResponse.json({
      mfaChallenge: {
        challengeId: pendingMfa.challengeId,
        method: 'TOTP',
        codeLength: 6,
        expiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
        resendAvailableAt: new Date(Date.now() + 30_000).toISOString(),
      },
    });
  }),

  http.post(`${base}/auth/logout`, () => {
    activeSession = null;
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${base}/auth/session`, () => {
    return HttpResponse.json({ session: activeSession });
  }),

  http.post(`${base}/auth/password/forgot`, () => {
    // Deliberately does not reveal whether the email exists.
    return HttpResponse.json({ accepted: true });
  }),

  http.post(`${base}/auth/password/reset`, async ({ request }) => {
    const body = (await request.json()) as { token: string; password: string };
    if (!body.token) {
      return HttpResponse.json(
        { error: { code: 'INVALID_TOKEN', message: 'This reset link is invalid or has expired.' } },
        { status: 400 },
      );
    }
    return HttpResponse.json({ accepted: true });
  }),

  http.post(`${base}/auth/email/verify`, () => HttpResponse.json({ verified: true })),

  http.post(`${base}/auth/register`, () => HttpResponse.json({ accepted: true })),
];
