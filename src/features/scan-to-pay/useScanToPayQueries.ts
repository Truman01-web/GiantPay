import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { checkoutSubmitKey } from '@/features/checkout/submitKey';
import { scanToPayApi } from '@/services/api/scanToPay';
import type {
  CreateScanToPayInput,
  QrCheckoutSubmitInput,
} from '@/types/scanToPay';

export function useScanToPayList(params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: ['scanToPay', 'list', params],
    queryFn: ({ signal }) => scanToPayApi.list(params, { signal }),
    placeholderData: (previous) => previous,
  });
}

export function useScanToPayDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['scanToPay', 'detail', id],
    queryFn: ({ signal }) => scanToPayApi.getById(id!, { signal }),
    enabled: Boolean(id),
  });
}

export function useCreateScanToPay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateScanToPayInput) =>
      scanToPayApi.create(payload, crypto.randomUUID()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scanToPay', 'list'] });
    },
  });
}

export function useDisableScanToPay() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => scanToPayApi.disable(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['scanToPay', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['scanToPay', 'detail', id] });
    },
  });
}

export function useScanToPayPayments(id: string | undefined, params: { page: number; pageSize: number }) {
  return useQuery({
    queryKey: ['scanToPay', 'payments', id, params],
    queryFn: ({ signal }) => scanToPayApi.getPayments(id!, params, { signal }),
    enabled: Boolean(id),
    placeholderData: (previous) => previous,
  });
}

export function useQrCheckoutInfo(token: string | undefined) {
  return useQuery({
    queryKey: ['scanToPay', 'checkout', token],
    queryFn: ({ signal }) => scanToPayApi.getCheckoutInfo(token!, { signal }),
    enabled: Boolean(token),
    retry: false,
  });
}

export function useSubmitQrCheckout(token: string | undefined) {
  const attempt = useRef<ReturnType<typeof checkoutSubmitKey> | null>(null);
  return useMutation({
    mutationFn: async (payload: QrCheckoutSubmitInput) => {
      attempt.current ??= checkoutSubmitKey(`qr:${token}`);
      const result = await scanToPayApi.submitPayment(token!, payload, attempt.current.key);
      attempt.current.complete();
      return result;
    },
  });
}
