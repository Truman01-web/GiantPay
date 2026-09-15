import { api, type RequestOptions } from './client';

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  environment: 'sandbox' | 'production';
  status: 'ACTIVE' | 'REVOKED';
  createdAt: string;
  lastUsedAt: string | null;
  secret?: string; // Only present on create response
}

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  eventType: string;
  status: 'DELIVERED' | 'FAILED' | 'PENDING' | 'RETRYING';
  httpStatus: number | null;
  attemptCount: number;
  lastAttemptAt: string;
  payload: Record<string, unknown>;
  responseSnippet: string | null;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
  secretMasked: string;
  secret?: string; // Only present on create / rotate
  createdAt: string;
  updatedAt: string;
  deliveries?: WebhookDelivery[];
}

export const developersApi = {
  listApiKeys(options?: RequestOptions): Promise<{ items: ApiKey[]; total: number }> {
    return api.get<{ items: ApiKey[]; total: number }>('/developer/api-keys', options);
  },

  createApiKey(data: { name: string }, options?: RequestOptions): Promise<ApiKey> {
    return api.post<ApiKey>('/developer/api-keys', data, options);
  },

  revokeApiKey(id: string, options?: RequestOptions): Promise<ApiKey> {
    return api.delete<ApiKey>(`/developer/api-keys/${id}`, options);
  },

  listWebhooks(options?: RequestOptions): Promise<{ items: WebhookEndpoint[]; total: number }> {
    return api.get<{ items: WebhookEndpoint[]; total: number }>('/developer/webhooks', options);
  },

  createWebhook(data: { url: string; events: string[] }, options?: RequestOptions): Promise<WebhookEndpoint> {
    return api.post<WebhookEndpoint>('/developer/webhooks', data, options);
  },

  getWebhook(id: string, options?: RequestOptions): Promise<WebhookEndpoint> {
    return api.get<WebhookEndpoint>(`/developer/webhooks/${id}`, options);
  },

  updateWebhook(id: string, data: { url?: string; events?: string[]; enabled?: boolean }, options?: RequestOptions): Promise<WebhookEndpoint> {
    return api.patch<WebhookEndpoint>(`/developer/webhooks/${id}`, data, options);
  },

  rotateWebhookSecret(id: string, options?: RequestOptions): Promise<{ secret: string }> {
    return api.post<{ secret: string }>(`/developer/webhooks/${id}/rotate-secret`, {}, options);
  },

  retryWebhookDelivery(deliveryId: string, options?: RequestOptions): Promise<{ requeued: boolean }> {
    return api.post<{ requeued: boolean }>(`/developer/webhook-deliveries/${deliveryId}/retry`, {}, options);
  },
};
