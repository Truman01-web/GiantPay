import { http, HttpResponse } from 'msw';
import { env } from '@/app/config/env';
import { MOCK_CHECKOUT_SESSIONS, submittedReferences } from '../fixtures/checkout';

const base = `${env.apiUrl}/v1`;

export const checkoutHandlers = [
  http.get(`${base}/checkout/:token`, ({ params }) => {
    const session = MOCK_CHECKOUT_SESSIONS[params.token as string];
    if (!session) {
      return HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'This checkout link is invalid.' } }, { status: 404 });
    }
    return HttpResponse.json(session);
  }),

  http.post(`${base}/checkout/:token/submit`, ({ params }) => {
    const session = MOCK_CHECKOUT_SESSIONS[params.token as string];
    if (!session) {
      return HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'This checkout link is invalid.' } }, { status: 404 });
    }
    if (session.status === 'EXPIRED') {
      return HttpResponse.json({ error: { code: 'EXPIRED', message: 'This payment session has expired.' } }, { status: 410 });
    }
    // Simulate an async provider flow: PROCESSING now, resolves to
    // SUCCESS a few seconds later, only ever discoverable via the
    // trusted status endpoint below.
    submittedReferences.set(session.reference, { status: 'PROCESSING', submittedAt: Date.now() });
    return HttpResponse.json({ reference: session.reference });
  }),

  http.get(`${base}/payment-status/:reference`, ({ params }) => {
    const reference = params.reference as string;
    const session = Object.values(MOCK_CHECKOUT_SESSIONS).find((s) => s.reference === reference);
    const submission = submittedReferences.get(reference);

    if (!session) {
      return HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'Unknown payment reference.' } }, { status: 404 });
    }

    let status: 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'PENDING' = 'PENDING';
    if (submission) {
      const elapsed = Date.now() - submission.submittedAt;
      // First 3s: PROCESSING. After that: resolve deterministically based
      // on the reference so demo runs are repeatable.
      if (elapsed < 3000) {
        status = 'PROCESSING';
      } else {
        status = reference.endsWith('2') ? 'FAILED' : 'SUCCESS';
      }
    }

    return HttpResponse.json({
      reference: session.reference,
      status,
      amount: session.amount,
      merchantDisplayName: session.merchantDisplayName,
      merchantReference: session.merchantReference,
      confirmedAt: status === 'SUCCESS' || status === 'FAILED' ? new Date().toISOString() : null,
    });
  }),
];
