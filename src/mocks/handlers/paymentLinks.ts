import { http, HttpResponse } from 'msw';
import { env } from '@/app/config/env';
import { MOCK_PAYMENT_LINKS } from '../fixtures/paymentLinks';
import type { PaymentLink } from '@/types/payments';

const base = `${env.apiUrl}/v1`;
const links: PaymentLink[] = [...MOCK_PAYMENT_LINKS];
const seenIdempotencyKeys = new Set<string>();

export const paymentLinksHandlers = [
  http.get(`${base}/payment-links`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '20');
    const search = url.searchParams.get('search')?.toLowerCase();

    let filtered = links;
    if (search) filtered = filtered.filter((l) => l.name.toLowerCase().includes(search));

    const start = (page - 1) * pageSize;
    return HttpResponse.json({
      data: filtered.slice(start, start + pageSize),
      page,
      pageSize,
      total: filtered.length,
    });
  }),

  http.get(`${base}/payment-links/:id`, ({ params }) => {
    const link = links.find((l) => l.id === params.id);
    if (!link) return HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'Payment link not found.' } }, { status: 404 });
    return HttpResponse.json(link);
  }),

  http.post(`${base}/payment-links`, async ({ request }) => {
    const idempotencyKey = request.headers.get('Idempotency-Key');
    if (idempotencyKey && seenIdempotencyKeys.has(idempotencyKey)) {
      // Simulate idempotent replay: return the most recently created link
      // rather than creating a duplicate.
      return HttpResponse.json(links[0]);
    }
    if (idempotencyKey) seenIdempotencyKeys.add(idempotencyKey);

    const body = (await request.json()) as {
      name: string;
      mode: 'FIXED';
      amountMinor?: number;
      currency: string;
      description?: string;
      customerReference?: string;
      expiresAt?: string;
      reusable: boolean;
      maxSuccessfulPayments?: number;
      redirectUrl?: string;
    };

    const id = `plink_${Math.random().toString(36).slice(2, 9)}`;
    const newLink: PaymentLink = {
      id,
      name: body.name,
      mode: body.mode,
      amount: body.mode === 'FIXED' && body.amountMinor ? { amountMinor: body.amountMinor, currency: body.currency } : null,
      description: body.description ?? null,
      customerReference: body.customerReference ?? null,
      status: 'ACTIVE',
      reusable: body.reusable,
      maxSuccessfulPayments: body.maxSuccessfulPayments ?? null,
      successfulPaymentsCount: 0,
      redirectUrl: body.redirectUrl ?? null,
      expiresAt: body.expiresAt ?? null,
      createdAt: new Date().toISOString(),
      url: `https://pay.giantpay.mw/l/${id}`,
    };
    links.unshift(newLink);
    return HttpResponse.json(newLink, { status: 201 });
  }),

  http.patch(`${base}/payment-links/:id`, async ({ params, request }) => {
    const link = links.find((l) => l.id === params.id);
    if (!link) return HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'Payment link not found.' } }, { status: 404 });
    const body = (await request.json()) as { status?: PaymentLink['status'] };
    if (body.status) link.status = body.status;
    return HttpResponse.json(link);
  }),
];
