import { http, HttpResponse } from 'msw';
import { env } from '@/app/config/env';
import type { ApiKey, WebhookEndpoint } from '@/services/api/developers';

const BASE_URL = `${env.apiUrl}/v1`;

const mockApiKeys: ApiKey[] = [
  {
    id: 'key_01j7key999',
    name: 'Primary Sandbox Integration',
    prefix: 'gp_test_a8f9',
    environment: 'sandbox',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    lastUsedAt: new Date(Date.now() - 1200000).toISOString(),
  },
  {
    id: 'key_01j7key888',
    name: 'Staging E2E Testing',
    prefix: 'gp_test_b4c2',
    environment: 'sandbox',
    status: 'ACTIVE',
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString(),
    lastUsedAt: new Date(Date.now() - 48 * 3600000).toISOString(),
  },
];

const mockWebhooks: WebhookEndpoint[] = [
  {
    id: 'wh_01j7wh123',
    url: 'https://example-merchant.mw/api/giantpay-webhook',
    events: ['payment.succeeded', 'payment.failed'],
    enabled: true,
    secretMasked: 'whsec_••••••••••••••••3a9f',
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    deliveries: [
      {
        id: 'del_01j7del001',
        endpointId: 'wh_01j7wh123',
        eventType: 'payment.status.changed',
        status: 'DELIVERED',
        httpStatus: 200,
        attemptCount: 1,
        lastAttemptAt: new Date(Date.now() - 3600000).toISOString(),
        payload: { event: 'payment.status.changed', reference: 'gp_pay_demo1', status: 'SUCCEEDED' },
        responseSnippet: '{"received": true}',
      },
      {
        id: 'del_01j7del002',
        endpointId: 'wh_01j7wh123',
        eventType: 'payment.status.changed',
        status: 'FAILED',
        httpStatus: 504,
        attemptCount: 3,
        lastAttemptAt: new Date(Date.now() - 7200000).toISOString(),
        payload: { event: 'payment.status.changed', reference: 'gp_pay_demo2', status: 'FAILED' },
        responseSnippet: 'Gateway Timeout after 10000ms',
      },
    ],
  },
];

export const developersHandlers = [
  http.get(`${BASE_URL}/developer/api-keys`, () => {
    return HttpResponse.json({
      data: mockApiKeys,
    });
  }),

  http.post(`${BASE_URL}/developer/api-keys`, async ({ request }) => {
    const body = (await request.json()) as { name?: string };
    const keyId = `key_${crypto.randomUUID().slice(0, 8)}`;
    const secretSuffix = crypto.randomUUID().replace(/-/g, '').slice(0, 24);
    const newKey: ApiKey = {
      id: keyId,
      name: body.name || 'Sandbox Key',
      prefix: `gp_test_${keyId.slice(4, 8)}`,
      environment: 'sandbox',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      secret: `gp_test_${keyId.slice(4, 8)}_${secretSuffix}`,
    };
    mockApiKeys.unshift(newKey);
    return HttpResponse.json(newKey, { status: 201 });
  }),

  http.delete(`${BASE_URL}/developer/api-keys/:id`, ({ params }) => {
    const key = mockApiKeys.find((k) => k.id === params.id);
    if (key) key.status = 'REVOKED';
    return HttpResponse.json(key ?? { id: params.id, status: 'REVOKED' });
  }),

  http.get(`${BASE_URL}/developer/webhooks`, () => {
    return HttpResponse.json({
      data: mockWebhooks.map(({ secretMasked, ...webhook }) => ({ ...webhook, secret: secretMasked })),
    });
  }),

  http.post(`${BASE_URL}/developer/webhooks`, async ({ request }) => {
    const body = (await request.json()) as { url: string; events?: string[] };
    const whId = `wh_${crypto.randomUUID().slice(0, 8)}`;
    const newWebhook = {
      id: whId,
      url: body.url,
      events: body.events || ['payment.status.changed'],
      enabled: true,
      secretMasked: 'whsec_••••••••••••••••7b2e',
      secret: `whsec_${crypto.randomUUID().replace(/-/g, '')}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deliveries: [],
    };
    mockWebhooks.unshift(newWebhook);
    return HttpResponse.json(newWebhook, { status: 201 });
  }),

  http.get(`${BASE_URL}/developer/webhooks/:id`, ({ params }) => {
    const wh = mockWebhooks.find((w) => w.id === params.id) || mockWebhooks[0];
    return HttpResponse.json(wh);
  }),

  http.patch(`${BASE_URL}/developer/webhooks/:id`, async ({ params, request }) => {
    const body = (await request.json()) as { url?: string; events?: string[]; enabled?: boolean };
    const wh = mockWebhooks.find((w) => w.id === params.id) || mockWebhooks[0];
    if (body.url) wh.url = body.url;
    if (body.events) wh.events = body.events;
    if (typeof body.enabled === 'boolean') wh.enabled = body.enabled;
    wh.updatedAt = new Date().toISOString();
    return HttpResponse.json(wh);
  }),

  http.post(`${BASE_URL}/developer/webhooks/:id/rotate-secret`, () => {
    const newSecret = `whsec_${crypto.randomUUID().replace(/-/g, '')}`;
    return HttpResponse.json({ secret: newSecret });
  }),

  http.post(`${BASE_URL}/developer/webhook-deliveries/:id/retry`, () => {
    return HttpResponse.json({ requeued: true });
  }),
];
