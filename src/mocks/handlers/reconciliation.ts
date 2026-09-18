import { http, HttpResponse } from 'msw';
import { env } from '@/app/config/env';
import { MOCK_RECONCILIATION_RUNS } from '../fixtures/reconciliation';
import type { ReconciliationExceptionStatus, ReconciliationRun } from '@/types/reconciliation';

const base = `${env.apiUrl}/v1`;

// Mutable "backend" state, independent of the frozen fixture — exception
// status changes must persist across requests within a session the same
// way a real backend would, and must be resettable between tests (see
// resetReconciliationMockState / src/tests/setup.ts) since this otherwise
// leaks across test files under this project's `isolate: false` vitest
// config (see resetAuthMockState in ../handlers/auth.ts for the same issue).
let runs: ReconciliationRun[] = structuredClone(MOCK_RECONCILIATION_RUNS);

export function resetReconciliationMockState(): void {
  runs = structuredClone(MOCK_RECONCILIATION_RUNS);
}

const VALID_NEXT_STATUS: Record<ReconciliationExceptionStatus, ReconciliationExceptionStatus[]> = {
  OPEN: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['RESOLVED', 'DISMISSED'],
  RESOLVED: [],
  DISMISSED: [],
};

export const reconciliationHandlers = [
  http.get(`${base}/reconciliation/runs`, ({ request }) => {
    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '20');
    const start = (page - 1) * pageSize;
    const items = runs.map((run) => ({ ...run, sourceCount: run.totalRecords }));
    return HttpResponse.json({ data: items.slice(start, start + pageSize), page, pageSize, total: items.length });
  }),

  http.get(`${base}/reconciliation/runs/:id`, ({ params }) => {
    const run = runs.find((r) => r.id === params.id);
    if (!run) return HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'Reconciliation run not found.' } }, { status: 404 });
    return HttpResponse.json({ ...run, sourceCount: run.totalRecords });
  }),

  http.get(`${base}/reconciliation/exceptions`, () => HttpResponse.json({ data: runs.flatMap((run) => run.exceptions.map((e) => ({ id: e.id, run_id: run.id, classification: e.type, source_reference: e.transactionReference, evidence: { internalId: e.transactionId, expected: e.expected, observed: e.observed, difference: e.difference }, claimed_by: e.owner?.id ?? null, status: e.status, created_at: e.createdAt }))), page: 1, pageSize: 100, total: runs.reduce((sum, run) => sum + run.exceptions.length, 0) })),

  http.get(`${base}/reconciliation/exceptions/:exceptionId`, ({ params }) => {
    const exception = runs.flatMap((run) => run.exceptions).find((e) => e.id === params.exceptionId);
    if (!exception) return HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'Exception not found.' } }, { status: 404 });
    return HttpResponse.json({ id: exception.id, run_id: exception.runId, classification: exception.type, source_reference: exception.transactionReference, evidence: { internalId: exception.transactionId, expected: exception.expected, observed: exception.observed, difference: exception.difference }, claimed_by: exception.owner?.id ?? null, status: exception.status, created_at: exception.createdAt });
  }),

  http.post(`${base}/reconciliation/exceptions/:exceptionId/review`, async ({ params, request }) => {
    const exception = runs.flatMap((run) => run.exceptions).find((e) => e.id === params.exceptionId);
    if (!exception) return HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'Exception not found.' } }, { status: 404 });

    const body = (await request.json()) as { status: ReconciliationExceptionStatus; reason?: string };
    const allowed = VALID_NEXT_STATUS[exception.status];
    if (!allowed.includes(body.status)) {
      return HttpResponse.json(
        { error: { code: 'INVALID_TRANSITION', message: `This exception cannot move from ${exception.status} to ${body.status}.` } },
        { status: 422 },
      );
    }

    exception.status = body.status;
    if (body.reason?.trim()) {
      exception.notes.push({ id: `note_${Math.random().toString(36).slice(2, 9)}`, author: 'You', text: body.reason.trim(), createdAt: new Date().toISOString() });
    }
    if (!exception.owner) {
      exception.owner = { id: 'usr_owner_01', name: 'Chikondi Banda' };
    }

    return HttpResponse.json({ accepted: true });
  }),
];
