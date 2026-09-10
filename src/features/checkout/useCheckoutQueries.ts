import { useMutation, useQuery } from '@tanstack/react-query';
import { checkoutApi, type CheckoutSubmitRequest } from '@/services/api/checkout';

export function useCheckoutSession(token: string | undefined) {
  return useQuery({
    queryKey: ['checkout', 'session', token],
    queryFn: ({ signal }) => checkoutApi.getSession(token!, { signal }),
    enabled: Boolean(token),
    retry: false,
  });
}

export function useSubmitCheckout(token: string | undefined) {
  return useMutation({
    mutationFn: (payload: CheckoutSubmitRequest) => checkoutApi.submit(token!, payload, crypto.randomUUID()),
  });
}
