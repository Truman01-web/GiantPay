import type { Paginated } from '@/types/common';
import type { ReconciliationException, ReconciliationExceptionStatus, ReconciliationRun, ReconciliationRunListItem } from '@/types/reconciliation';
import { apiClient } from './client';
import { ApiError } from './errors';

function isValidException(value: unknown): value is ReconciliationException {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === 'string' && typeof v.status === 'string' && Array.isArray(v.notes);
}

export const reconciliationApi = {
  listRuns: (params: { page: number; pageSize: number }, options?: { signal?: AbortSignal }) => {
    const search = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
    return apiClient.get<Paginated<ReconciliationRunListItem>>(`/reconciliation/runs?${search.toString()}`, options);
  },

  getRun: (id: string, options?: { signal?: AbortSignal }) =>
    apiClient.get<ReconciliationRun>(`/reconciliation/runs/${id}`, options),

  // The highest-stakes mutation on this page — a click here must never
  // *appear* to resolve/escalate an exception without the backend actually
  // confirming it, so the response is runtime-validated the same way
  // checkout/upload responses are (see usePaymentStatusPolling.ts,
  // merchants.ts uploadDocument).
  updateException: async (
    runId: string,
    exceptionId: string,
    payload: { status: ReconciliationExceptionStatus; note?: string },
  ): Promise<ReconciliationException> => {
    const result = await apiClient.patch<unknown>(`/reconciliation/runs/${runId}/exceptions/${exceptionId}`, payload);
    if (!isValidException(result)) {
      throw new ApiError({ status: 0, code: 'INVALID_RESPONSE', message: 'The update could not be confirmed. Please try again.' });
    }
    return result;
  },
};
