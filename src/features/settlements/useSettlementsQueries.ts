import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settlementsApi } from '@/services/api/settlements';

export function useSettlementsList(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: ['settlements', 'list', params],
    queryFn: ({ signal }) => settlementsApi.list(params, { signal }),
    placeholderData: (previous) => previous,
  });
}

export function useSettlementActions(id?: string) {
  const queryClient = useQueryClient();
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['settlements', 'list'] }),
      id ? queryClient.invalidateQueries({ queryKey: ['settlements', 'detail', id] }) : Promise.resolve(),
    ]);
  };
  return {
    create: useMutation({
      mutationFn: ({ idempotencyKey, ...payload }: { currency: string; periodStart: string; periodEnd: string; idempotencyKey: string }) =>
        settlementsApi.create(payload, idempotencyKey),
      onSuccess: refresh,
    }),
    submit: useMutation({ mutationFn: (batchId: string) => settlementsApi.submit(batchId), onSuccess: refresh }),
    approve: useMutation({ mutationFn: (batchId: string) => settlementsApi.approve(batchId), onSuccess: refresh }),
    cancel: useMutation({
      mutationFn: (input: { batchId: string; idempotencyKey: string }) => settlementsApi.cancel(input.batchId, input.idempotencyKey),
      onSuccess: refresh,
    }),
    exportBatch: useMutation({ mutationFn: (batchId: string) => settlementsApi.exportBatch(batchId), onSuccess: refresh }),
  };
}

export function useSettlementDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['settlements', 'detail', id],
    queryFn: ({ signal }) => settlementsApi.getById(id!, { signal }),
    enabled: Boolean(id),
  });
}
