import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { refundsApi, type CreateRefundRequest } from '@/services/api/refunds';

export function useRefundsList(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: ['refunds', 'list', params],
    queryFn: ({ signal }) => refundsApi.list(params, { signal }),
    placeholderData: (previous) => previous,
  });
}

export function useRefundDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['refunds', 'detail', id],
    queryFn: ({ signal }) => refundsApi.getById(id!, { signal }),
    enabled: Boolean(id),
  });
}

export function useCreateRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRefundRequest) => refundsApi.create(payload, crypto.randomUUID()),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['refunds', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['payments', 'detail', variables.paymentId] });
    },
  });
}
