import { api, type RequestOptions } from './client';
import { itemsPage, type BackendPage } from './contractAdapters';

export interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  environment: 'sandbox' | 'production';
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  scopes?: string[];
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

type BackendWebhookEndpoint = Omit<WebhookEndpoint, 'secretMasked'> & { secret?: string };
function webhookView(value: BackendWebhookEndpoint): WebhookEndpoint {
  const plaintext = value.secret?.startsWith('whsec_') && !value.secret.includes('...') ? value.secret : undefined;
  return { ...value, secretMasked: plaintext ? `whsec_...${plaintext.slice(-4)}` : (value.secret ?? ''), secret: plaintext };
}

export const developersApi = {
  listApiKeys(options?: RequestOptions): Promise<{ items: ApiKey[]; total: number }> {
    return api.get<BackendPage<ApiKey>>('/developer/api-keys', options).then(itemsPage);
  },

  createApiKey(data: { name: string; scopes: string[]; expiresAt?: string }, options?: RequestOptions): Promise<ApiKey> {
    return api.post<ApiKey>('/developer/api-keys', data, options);
  },

  revokeApiKey(id: string, options?: RequestOptions): Promise<ApiKey> {
    return api.delete<ApiKey>(`/developer/api-keys/${id}`, options);
  },

  listWebhooks(options?: RequestOptions): Promise<{ items: WebhookEndpoint[]; total: number }> {
    return api.get<BackendPage<BackendWebhookEndpoint>>('/developer/webhooks', options)
      .then((page) => itemsPage({ ...page, data: page.data.map(webhookView) }));
  },

  createWebhook(data: { name: string; url: string; events: string[]; enabled?: boolean }, options?: RequestOptions): Promise<WebhookEndpoint> {
    return api.post<BackendWebhookEndpoint>('/developer/webhooks', data, options).then(webhookView);
  },

  getWebhook(id: string, options?: RequestOptions): Promise<WebhookEndpoint> {
    return api.get<BackendWebhookEndpoint>(`/developer/webhooks/${id}`, options).then(webhookView);
  },

  updateWebhook(id: string, data: { url?: string; events?: string[]; enabled?: boolean }, options?: RequestOptions): Promise<WebhookEndpoint> {
    return api.patch<BackendWebhookEndpoint>(`/developer/webhooks/${id}`, data, options).then(webhookView);
  },

  rotateWebhookSecret(id: string, options?: RequestOptions): Promise<{ secret: string }> {
    return api.post<WebhookEndpoint & { secret: string }>(`/developer/webhooks/${id}/rotate-secret`, {}, options);
  },

  retryWebhookDelivery(deliveryId: string, options?: RequestOptions): Promise<{ id: string; status: string }> {
    return api.post<{ id: string; status: string }>(`/developer/webhook-deliveries/${deliveryId}/retry`, {}, options);
  },
};
