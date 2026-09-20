import type { Paginated } from '@/types/common';
import type { ReconciliationException, ReconciliationExceptionStatus, ReconciliationRun, ReconciliationRunListItem } from '@/types/reconciliation';
import { apiClient, type RequestOptions } from './client';

interface BackendRun {
  id: string;
  provider: string;
  periodStart: string;
  periodEnd: string;
  status: ReconciliationRunListItem['status'];
  sourceCount: number;
  matchedCount: number;
  unmatchedCount: number;
  completedAt: string | null;
}

interface BackendException {
  id: string;
  run_id: string;
  classification: ReconciliationException['type'];
  source_reference: string;
  evidence: Record<string, unknown>;
  claimed_by: string | null;
  status: ReconciliationExceptionStatus;
  created_at: string;
  resolution_evidence_ref?: string | null;
}

const runView = (run: BackendRun, exceptionCount = run.unmatchedCount): ReconciliationRunListItem => ({
  id: run.id,
  provider: run.provider,
  periodStart: run.periodStart,
  periodEnd: run.periodEnd,
  totalRecords: run.sourceCount,
  matchedCount: run.matchedCount,
  unmatchedCount: run.unmatchedCount,
  exceptionCount,
  status: run.status,
  completedAt: run.completedAt,
});

const text = (value: unknown, fallback: string) => typeof value === 'string' ? value : fallback;
const exceptionView = (row: BackendException): ReconciliationException => ({
  id: row.id,
  runId: row.run_id,
  transactionId: text(row.evidence.internalId, row.source_reference),
  transactionReference: row.source_reference,
  type: row.classification,
  expected: text(row.evidence.expected, 'See recorded evidence'),
  observed: text(row.evidence.observed, 'See recorded evidence'),
  difference: typeof row.evidence.difference === 'string' ? row.evidence.difference : null,
  owner: row.claimed_by ? { id: row.claimed_by, name: 'Assigned reviewer' } : null,
  priority: 'MEDIUM',
  status: row.status,
  createdAt: row.created_at,
  notes: [],
  evidenceRef: row.resolution_evidence_ref ?? null,
});

export const reconciliationApi = {
  async listRuns(params: { page: number; pageSize: number }, options?: RequestOptions): Promise<Paginated<ReconciliationRunListItem>> {
    const search = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
    const page = await apiClient.get<Paginated<BackendRun>>(`/reconciliation/runs?${search}`, options);
    return { ...page, data: page.data.map((run) => runView(run)) };
  },

  async listExceptions(params: { page?: number; pageSize?: number; status?: ReconciliationExceptionStatus } = {}, options?: RequestOptions) {
    const search = new URLSearchParams({ page: String(params.page ?? 1), pageSize: String(params.pageSize ?? 100) });
    if (params.status) search.set('status', params.status);
    const page = await apiClient.get<Paginated<BackendException>>(`/reconciliation/exceptions?${search}`, options);
    return { ...page, data: page.data.map(exceptionView) };
  },

  getException: (id: string, options?: RequestOptions) =>
    apiClient.get<BackendException>(`/reconciliation/exceptions/${id}`, options).then(exceptionView),

  async getRun(id: string, options?: RequestOptions): Promise<ReconciliationRun> {
    const [run, exceptions] = await Promise.all([
      apiClient.get<BackendRun>(`/reconciliation/runs/${id}`, options),
      this.listExceptions({ pageSize: 100 }, options),
    ]);
    const forRun = exceptions.data.filter((item) => item.runId === id);
    return { ...runView(run, forRun.length), exceptions: forRun };
  },

  async updateException(id: string, payload: { status: ReconciliationExceptionStatus; reason?: string; evidenceRef?: string }): Promise<ReconciliationException> {
    await apiClient.post<{ accepted: true }>(`/reconciliation/exceptions/${id}/review`, payload, { idempotencyKey: crypto.randomUUID() });
    return this.getException(id);
  },

  proposeAdjustment: (exceptionId: string, payload: { originalEntryId: string; reason: string; evidenceRef: string }) =>
    apiClient.post(`/reconciliation/exceptions/${exceptionId}/adjustments`, payload, { idempotencyKey: crypto.randomUUID() }),
  approveAdjustment: (id: string) => apiClient.post(`/reconciliation/adjustments/${id}/approve`, {}),
  rejectAdjustment: (id: string, reason: string) => apiClient.post(`/reconciliation/adjustments/${id}/reject`, { reason }),
  ledgerIntegrity: () => apiClient.get<{ ok: boolean; failures: unknown[] }>('/ledger/integrity'),
};
