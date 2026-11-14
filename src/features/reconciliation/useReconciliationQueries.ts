import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { reconciliationApi } from '@/services/api/reconciliation';
import type { ReconciliationAdjustment, ReconciliationExceptionStatus } from '@/types/reconciliation';

export function useReconciliationRuns(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: ['reconciliation', 'runs', params],
    queryFn: ({ signal }) => reconciliationApi.listRuns(params, { signal }),
    placeholderData: (previous) => previous,
  });
}

export function useReconciliationRun(id: string | undefined) {
  return useQuery({
    queryKey: ['reconciliation', 'run', id],
    queryFn: ({ signal }) => reconciliationApi.getRun(id!, { signal }),
    enabled: Boolean(id),
  });
}

export function useUpdateException(runId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ idempotencyKey, ...payload }: { exceptionId: string; status: ReconciliationExceptionStatus; note?: string; evidenceRef?: string; idempotencyKey: string }) =>
      reconciliationApi.updateException(payload.exceptionId, { status: payload.status, reason: payload.note, evidenceRef: payload.evidenceRef }, idempotencyKey),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation', 'run', runId] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation', 'runs'] });
    },
  });
}

export function useLedgerIntegrity(enabled: boolean) {
  return useQuery({ queryKey: ['ledger', 'integrity'], queryFn: ({ signal }) => reconciliationApi.ledgerIntegrity({ signal }), enabled });
}

export function useAdjustmentActions() {
  const [latest, setLatest] = useState<ReconciliationAdjustment | null>(null);
  const propose = useMutation({ mutationFn: ({ exceptionId, idempotencyKey, ...payload }: { exceptionId: string; originalEntryId: string; reason: string; evidenceRef: string; idempotencyKey: string }) => reconciliationApi.proposeAdjustment(exceptionId, payload, idempotencyKey), onSuccess: setLatest });
  const approve = useMutation({ mutationFn: (id: string) => reconciliationApi.approveAdjustment(id), onSuccess: setLatest });
  const reject = useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => reconciliationApi.rejectAdjustment(id, reason), onSuccess: setLatest });
  return { latest, propose, approve, reject };
}
