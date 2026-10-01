import { http, HttpResponse } from 'msw';
import { env } from '@/app/config/env';
import { MOCK_SETTLEMENTS, toSettlementListItem } from '../fixtures/settlements';
import type { Settlement } from '@/types/settlements';

const base = `${env.apiUrl}/v1`;
let settlements: Settlement[] = structuredClone(MOCK_SETTLEMENTS);
export function resetSettlementsMockState() { settlements = structuredClone(MOCK_SETTLEMENTS); }

export const settlementsHandlers = [
  http.get(`${base}/settlements`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '20');
    const start = (page - 1) * pageSize;
    const items = settlements.map(toSettlementListItem);
    return HttpResponse.json({ data: items.slice(start, start + pageSize), page, pageSize, total: items.length });
  }),

  http.get(`${base}/settlements/:id`, ({ params }) => {
    const settlement = settlements.find((s) => s.id === params.id);
    if (!settlement) return HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'Settlement not found.' } }, { status: 404 });
    return HttpResponse.json(settlement);
  }),
  http.post(`${base}/settlements`, async ({ request }) => {
    const body = await request.json() as { currency: string; periodStart: string; periodEnd: string };
    const settlement = { id: `stl_${settlements.length + 1}`, ...body, status: 'DRAFT' as const, grossMinor: '0', refundsMinor: '0', feesMinor: '0', netMinor: '0', createdAt: new Date().toISOString(), createdBy: 'u1', submittedAt: null, approvedBy: null, approvedAt: null, exportedAt: null, externalTransferExecuted: false as const, sandboxOnly: true as const };
    settlements.unshift(settlement); return HttpResponse.json(settlement, { status: 201 });
  }),
  http.post(`${base}/settlements/:id/submit`, ({ params }) => {
    const settlement = settlements.find((s) => s.id === params.id); if (!settlement) return new HttpResponse(null, { status: 404 });
    settlement.status = 'AWAITING_APPROVAL'; settlement.submittedAt = new Date().toISOString(); return HttpResponse.json(settlement);
  }),
  http.post(`${base}/settlements/:id/cancel`, ({ params }) => {
    const settlement = settlements.find((s) => s.id === params.id); if (!settlement) return new HttpResponse(null, { status: 404 });
    settlement.status = 'CANCELLED'; return HttpResponse.json(settlement);
  }),
  http.post(`${base}/settlements/:id/approve`, ({ params }) => {
    const settlement = settlements.find((s) => s.id === params.id); if (!settlement) return new HttpResponse(null, { status: 404 });
    settlement.status = 'APPROVED'; settlement.approvedAt = new Date().toISOString(); settlement.approvedBy = 'u2'; return HttpResponse.json(settlement);
  }),
  http.post(`${base}/settlements/:id/export`, ({ params }) => new HttpResponse(`settlement_id\r\n${params.id}\r\n`, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="giantpay-sandbox-settlement-${params.id}.csv"` } })),
];
