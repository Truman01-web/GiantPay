import { useMutation, useQuery } from '@tanstack/react-query';
import { useRef } from 'react';
import { checkoutSubmitKey } from './submitKey';
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
  const attempt = useRef<ReturnType<typeof checkoutSubmitKey> | null>(null);
  return useMutation({
    mutationFn: async (payload: CheckoutSubmitRequest) => {
      attempt.current ??= checkoutSubmitKey(`link:${token}`);
      const result = await checkoutApi.submit(token!, payload, attempt.current.key);
      attempt.current.complete();
      return result;
    },
  });
}
