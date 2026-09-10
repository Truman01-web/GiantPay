import { http, HttpResponse } from 'msw';
import { env } from '@/app/config/env';
import { MOCK_PAYMENTS, eventsFor, toListItem } from '../fixtures/payments';
import type { PaymentStatus, PaymentChannel } from '@/types/payments';

const base = `${env.apiUrl}/v1`;

export const paymentsHandlers = [
  http.get(`${base}/payments`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '20');
    const search = url.searchParams.get('search')?.toLowerCase();
    const statusFilter = url.searchParams.get('status')?.split(',') as PaymentStatus[] | undefined;
    const channelFilter = url.searchParams.get('channel')?.split(',') as PaymentChannel[] | undefined;

    let filtered = MOCK_PAYMENTS;
    if (search) {
      filtered = filtered.filter(
        (p) =>
          p.reference.toLowerCase().includes(search) ||
          p.merchantReference?.toLowerCase().includes(search) ||
          p.customer.name?.toLowerCase().includes(search),
      );
    }
    if (statusFilter?.length) filtered = filtered.filter((p) => statusFilter.includes(p.status));
    if (channelFilter?.length) filtered = filtered.filter((p) => channelFilter.includes(p.channel));

    filtered = [...filtered].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    const start = (page - 1) * pageSize;
    const pageItems = filtered.slice(start, start + pageSize).map(toListItem);

    return HttpResponse.json({ data: pageItems, page, pageSize, total: filtered.length });
  }),

  http.get(`${base}/payments/:id`, ({ params }) => {
    const payment = MOCK_PAYMENTS.find((p) => p.id === params.id);
    if (!payment) {
      return HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'Payment not found.' } }, { status: 404 });
    }
    return HttpResponse.json(payment);
  }),

  http.get(`${base}/payments/:id/events`, ({ params }) => {
    const payment = MOCK_PAYMENTS.find((p) => p.id === params.id);
    if (!payment) {
      return HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'Payment not found.' } }, { status: 404 });
    }
    return HttpResponse.json(eventsFor(payment));
  }),
];
