import { http, HttpResponse } from 'msw';
import { env } from '@/app/config/env';
import { MOCK_REFUNDS } from '../fixtures/refunds';
import { MOCK_PAYMENTS } from '../fixtures/payments';
import type { Refund } from '@/types/payments';

const base = `${env.apiUrl}/v1`;
const refunds: Refund[] = [...MOCK_REFUNDS];
const seenIdempotencyKeys = new Set<string>();

export const refundsHandlers = [
  http.get(`${base}/refunds`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '20');
    const sorted = [...refunds].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const start = (page - 1) * pageSize;
    return HttpResponse.json({ data: sorted.slice(start, start + pageSize), page, pageSize, total: sorted.length });
  }),

  http.get(`${base}/refunds/:id`, ({ params }) => {
    const refund = refunds.find((r) => r.id === params.id);
    if (!refund) return HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'Refund not found.' } }, { status: 404 });
    return HttpResponse.json(refund);
  }),

  http.post(`${base}/refunds`, async ({ request }) => {
    const idempotencyKey = request.headers.get('Idempotency-Key');
    if (idempotencyKey && seenIdempotencyKeys.has(idempotencyKey)) {
      return HttpResponse.json(refunds[0]);
    }
    if (idempotencyKey) seenIdempotencyKeys.add(idempotencyKey);

    const body = (await request.json()) as { paymentId: string; amountMinor: number; reason: string };
    const payment = MOCK_PAYMENTS.find((p) => p.id === body.paymentId);
    if (!payment) {
      return HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'Original payment not found.' } }, { status: 404 });
    }
    if (body.amountMinor > payment.refundableAmountMinor) {
      return HttpResponse.json(
        {
          error: {
            code: 'AMOUNT_EXCEEDS_REFUNDABLE',
            message: 'The requested amount exceeds the refundable balance for this payment.',
            fields: { amountMinor: 'Exceeds refundable amount' },
          },
        },
        { status: 422 },
      );
    }

    const refund: Refund = {
      id: `ref_${Math.random().toString(36).slice(2, 9)}`,
      reference: `RF-${300000 + refunds.length + 1}`,
      paymentId: payment.id,
      paymentReference: payment.reference,
      amount: { amountMinor: body.amountMinor, currency: payment.gross.currency },
      reason: body.reason,
      status: 'PENDING_APPROVAL',
      requestedBy: { id: 'usr_owner_01', name: 'Chikondi Banda' },
      approvedBy: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    refunds.unshift(refund);
    return HttpResponse.json(refund, { status: 201 });
  }),
];
