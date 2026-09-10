import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentLinksApi, type CreatePaymentLinkRequest } from '@/services/api/paymentLinks';

export function usePaymentLinksList(params: { page: number; pageSize: number; search?: string }) {
  return useQuery({
    queryKey: ['paymentLinks', 'list', params],
    queryFn: ({ signal }) => paymentLinksApi.list(params, { signal }),
    placeholderData: (previous) => previous,
  });
}

export function usePaymentLinkDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['paymentLinks', 'detail', id],
    queryFn: ({ signal }) => paymentLinksApi.getById(id!, { signal }),
    enabled: Boolean(id),
  });
}

export function useCreatePaymentLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreatePaymentLinkRequest) => paymentLinksApi.create(payload, crypto.randomUUID()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentLinks', 'list'] });
    },
  });
}

export function useDisablePaymentLink() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => paymentLinksApi.disable(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['paymentLinks', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['paymentLinks', 'detail', id] });
    },
  });
}
