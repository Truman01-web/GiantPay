import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { developersApi } from '@/services/api/developers';

// --- API Keys ----------------------------------------------------------------

export function useApiKeysList() {
  return useQuery({
    queryKey: ['developer', 'apiKeys'],
    queryFn: ({ signal }) => developersApi.listApiKeys({ signal }),
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => developersApi.createApiKey({ name, scopes: ['payments:read'] }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developer', 'apiKeys'] });
    },
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => developersApi.revokeApiKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developer', 'apiKeys'] });
    },
  });
}

// --- Webhooks ----------------------------------------------------------------

export function useWebhooksList() {
  return useQuery({
    queryKey: ['developer', 'webhooks'],
    queryFn: ({ signal }) => developersApi.listWebhooks({ signal }),
  });
}

export function useWebhookDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['developer', 'webhooks', id],
    queryFn: ({ signal }) => developersApi.getWebhook(id!, { signal }),
    enabled: Boolean(id),
  });
}

export function useCreateWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { url: string; events: string[] }) =>
      developersApi.createWebhook({ name: new URL(data.url).hostname, ...data, enabled: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developer', 'webhooks'] });
    },
  });
}

export function useUpdateWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; url?: string; events?: string[]; enabled?: boolean }) =>
      developersApi.updateWebhook(id, data),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['developer', 'webhooks'] });
      queryClient.invalidateQueries({ queryKey: ['developer', 'webhooks', vars.id] });
    },
  });
}

export function useRotateWebhookSecret() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => developersApi.rotateWebhookSecret(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['developer', 'webhooks', id] });
    },
  });
}

export function useRetryWebhookDelivery() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deliveryId: string) => developersApi.retryWebhookDelivery(deliveryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['developer', 'webhooks'] });
    },
  });
}
