import { useQuery } from '@tanstack/react-query';
import { paymentsApi, type PaymentListParams } from '@/services/api/payments';

export function usePaymentsList(params: PaymentListParams) {
  return useQuery({
    queryKey: ['payments', 'list', params],
    queryFn: ({ signal }) => paymentsApi.list(params, { signal }),
    placeholderData: (previous) => previous,
  });
}

export function usePaymentDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['payments', 'detail', id],
    queryFn: ({ signal }) => paymentsApi.getById(id!, { signal }),
    enabled: Boolean(id),
  });
}

export function usePaymentEvents(id: string | undefined) {
  return useQuery({
    queryKey: ['payments', 'events', id],
    queryFn: ({ signal }) => paymentsApi.getEvents(id!, { signal }),
    enabled: Boolean(id),
  });
}
