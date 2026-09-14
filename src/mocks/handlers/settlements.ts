import { http, HttpResponse } from 'msw';
import { env } from '@/app/config/env';
import { MOCK_SETTLEMENTS, toSettlementListItem } from '../fixtures/settlements';

const base = `${env.apiUrl}/v1`;

export const settlementsHandlers = [
  http.get(`${base}/settlements`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '20');
    const start = (page - 1) * pageSize;
    const items = MOCK_SETTLEMENTS.map(toSettlementListItem);
    return HttpResponse.json({ data: items.slice(start, start + pageSize), page, pageSize, total: items.length });
  }),

  http.get(`${base}/settlements/:id`, ({ params }) => {
    const settlement = MOCK_SETTLEMENTS.find((s) => s.id === params.id);
    if (!settlement) return HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'Settlement not found.' } }, { status: 404 });
    return HttpResponse.json(settlement);
  }),
];
