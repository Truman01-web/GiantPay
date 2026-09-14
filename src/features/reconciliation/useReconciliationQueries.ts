import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reconciliationApi } from '@/services/api/reconciliation';
import type { ReconciliationExceptionStatus } from '@/types/reconciliation';

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
    mutationFn: (payload: { exceptionId: string; status: ReconciliationExceptionStatus; note?: string }) =>
      reconciliationApi.updateException(runId!, payload.exceptionId, { status: payload.status, note: payload.note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation', 'run', runId] });
      queryClient.invalidateQueries({ queryKey: ['reconciliation', 'runs'] });
    },
  });
}
