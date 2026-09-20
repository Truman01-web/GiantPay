import { http, HttpResponse } from 'msw';
import { env } from '@/app/config/env';
import type { SupportActivity, SupportCase, SupportCaseDetail, SupportStatus } from '@/services/api/support';

const BASE_URL = `${env.apiUrl}/v1`;
const now = new Date().toISOString();
const cases: SupportCaseDetail[] = [{
  id: 'sup_01j7sup001', reference: 'SUP-88214', merchantId: 'mer_01', category: 'API_INTEGRATION',
  subject: 'Webhook signature verification question', status: 'IN_PROGRESS', priority: 'NORMAL',
  assignedOwner: { id: 'staff_01', name: 'Sandbox Support' },
  linkedTransaction: { id: 'pay_01j7pay001', reference: 'GP-2026-000001', merchantReference: 'ORDER-1001', status: 'SUCCEEDED' },
  createdAt: now, updatedAt: now, escalatedAt: null, resolvedAt: null, closedAt: null, resolutionSummary: null,
  description: 'Please confirm the sandbox webhook signing flow.',
  timeline: [{ id: 'msg_1', type: 'MESSAGE', visibility: 'MERCHANT', actorId: 'usr_1', authorDomain: 'MERCHANT', body: 'Please confirm the sandbox webhook signing flow.', createdAt: now }],
}];

function page(request: Request) {
  const url = new URL(request.url);
  const search = url.searchParams.get('search')?.toLowerCase();
  const status = url.searchParams.get('status');
  const priority = url.searchParams.get('priority');
  const data = cases.filter((item) => (!search || `${item.reference} ${item.subject} ${item.linkedTransaction?.reference ?? ''}`.toLowerCase().includes(search)) && (!status || item.status === status) && (!priority || item.priority === priority));
  return { data, total: data.length, nextCursor: null };
}

function detail(id: string) { return cases.find((item) => item.id === id); }
function activity(item: SupportCaseDetail, value: Omit<SupportActivity, 'id' | 'createdAt'>) {
  const created = { ...value, id: `act_${crypto.randomUUID().slice(0, 8)}`, createdAt: new Date().toISOString() };
  item.timeline.push(created);
  item.updatedAt = created.createdAt;
}

export const supportHandlers = [
  http.get(`${BASE_URL}/support/cases`, ({ request }) => HttpResponse.json(page(request))),
  http.get(`${BASE_URL}/platform/support/cases`, ({ request }) => HttpResponse.json(page(request))),
  http.get(`${BASE_URL}/platform/support/assignees`, () => HttpResponse.json({ items: [{ id: 'staff_01', name: 'Sandbox Support' }] })),
  http.post(`${BASE_URL}/support/cases`, async ({ request }) => {
    const body = await request.json() as { subject: string; category: SupportCase['category']; message: string; transactionId?: string };
    const id = `sup_${crypto.randomUUID().slice(0, 8)}`;
    const created: SupportCaseDetail = { id, reference: `SUP-${id.slice(-8).toUpperCase()}`, merchantId: 'mer_01', subject: body.subject, category: body.category, priority: 'NORMAL', status: 'OPEN', assignedOwner: null, linkedTransaction: body.transactionId ? { id: body.transactionId, reference: 'GP-2026-000001', merchantReference: 'ORDER-1001', status: 'SUCCEEDED' } : null, createdAt: now, updatedAt: now, escalatedAt: null, resolvedAt: null, closedAt: null, resolutionSummary: null, description: body.message, timeline: [{ id: 'msg_created', type: 'MESSAGE', visibility: 'MERCHANT', actorId: 'usr_1', authorDomain: 'MERCHANT', body: body.message, createdAt: now }] };
    cases.unshift(created);
    return HttpResponse.json(created, { status: 201 });
  }),
  http.get(`${BASE_URL}/support/cases/:id`, ({ params }) => {
    const item = detail(String(params.id)); return item ? HttpResponse.json(item) : HttpResponse.json({ error: { code: 'SUPPORT_CASE_NOT_FOUND', message: 'Support case not found.' } }, { status: 404 });
  }),
  http.get(`${BASE_URL}/platform/support/cases/:id`, ({ params }) => {
    const item = detail(String(params.id)); return item ? HttpResponse.json({ ...item, merchant: { id: item.merchantId, name: 'Fictional Merchant' } }) : HttpResponse.json({ error: { code: 'SUPPORT_CASE_NOT_FOUND', message: 'Support case not found.' } }, { status: 404 });
  }),
  http.post(`${BASE_URL}/support/cases/:id/replies`, async ({ params, request }) => reply(params.id, request, false)),
  http.post(`${BASE_URL}/platform/support/cases/:id/replies`, async ({ params, request }) => reply(params.id, request, false)),
  http.post(`${BASE_URL}/platform/support/cases/:id/internal-notes`, async ({ params, request }) => reply(params.id, request, true)),
  http.post(`${BASE_URL}/platform/support/cases/:id/status`, async ({ params, request }) => {
    const item = detail(String(params.id)); if (!item) return new HttpResponse(null, { status: 404 });
    const body = await request.json() as { status: SupportStatus; reason: string };
    activity(item, { type: 'STATUS', visibility: 'INTERNAL', actorId: 'staff_01', from: item.status, to: body.status, body: body.reason }); item.status = body.status;
    if (body.status === 'RESOLVED') { item.resolvedAt = now; item.resolutionSummary = body.reason; } if (body.status === 'ESCALATED') item.escalatedAt = now;
    return HttpResponse.json(item);
  }),
  http.post(`${BASE_URL}/platform/support/cases/:id/priority`, async ({ params, request }) => {
    const item = detail(String(params.id)); if (!item) return new HttpResponse(null, { status: 404 });
    const body = await request.json() as { priority: SupportCase['priority']; reason: string }; activity(item, { type: 'PRIORITY', visibility: 'INTERNAL', actorId: 'staff_01', from: item.priority, to: body.priority, body: body.reason }); item.priority = body.priority; return HttpResponse.json(item);
  }),
  http.post(`${BASE_URL}/platform/support/cases/:id/assign`, async ({ params, request }) => {
    const item = detail(String(params.id)); if (!item) return new HttpResponse(null, { status: 404 });
    const body = await request.json() as { staffId: string; reason: string }; item.assignedOwner = { id: body.staffId, name: 'Assigned support specialist' }; activity(item, { type: 'ASSIGNMENT', visibility: 'INTERNAL', actorId: 'staff_01', to: body.staffId, body: body.reason }); return HttpResponse.json(item);
  }),
];

async function reply(rawId: string | readonly string[] | undefined, request: Request, internal: boolean) {
  const item = detail(String(rawId)); if (!item) return new HttpResponse(null, { status: 404 });
  const body = await request.json() as { message: string };
  activity(item, { type: internal ? 'NOTE' : 'MESSAGE', visibility: internal ? 'INTERNAL' : 'MERCHANT', actorId: internal ? 'staff_01' : 'usr_1', authorDomain: internal ? undefined : 'MERCHANT', body: body.message });
  return HttpResponse.json({ id: item.timeline.at(-1)?.id }, { status: 201 });
}
