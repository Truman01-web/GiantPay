import { describe, expect, it, vi } from 'vitest';
import { delay, http, HttpResponse } from 'msw';
import { env } from '@/app/config/env';
import { server } from '@/mocks/server';
import { apiClient } from './client';
import { authApi } from './auth';

const base = `${env.apiUrl}/v1`;

describe('real API client contract', () => {
  it('uses the configured origin, credentials and idempotency key', async () => {
    server.use(http.post(`${base}/contract`, async ({ request }) => {
      expect(request.credentials).toBe('include');
      expect(request.headers.get('idempotency-key')).toBe('logical-operation-1');
      expect(request.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/i);
      return HttpResponse.json({ ok: true });
    }));
    await expect(apiClient.post('/contract', { amountMinor: 100 }, { idempotencyKey: 'logical-operation-1' }))
      .resolves.toEqual({ ok: true });
  });

  it('maps validation fields and backend diagnostics without logging the body', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    server.use(http.post(`${base}/validation`, () => HttpResponse.json({
      error: { code: 'VALIDATION_ERROR', message: 'Check the highlighted fields.', fields: { email: 'Invalid email' }, requestId: 'req_safe' },
    }, { status: 422 })));
    await expect(apiClient.post('/validation', {})).rejects.toMatchObject({
      status: 422, code: 'VALIDATION_ERROR', fields: { email: 'Invalid email' }, requestId: 'req_safe',
    });
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('classifies bounded timeouts', async () => {
    server.use(http.get(`${base}/slow`, async () => { await delay(100); return HttpResponse.json({ ok: true }); }));
    await expect(apiClient.get('/slow', { timeoutMs: 10 })).rejects.toMatchObject({ code: 'TIMEOUT', status: 0 });
  });

  it('normalizes malformed successful JSON instead of leaking a parser error', async () => {
    server.use(http.get(`${base}/malformed`, () => new HttpResponse('{not-json', {
      status: 200,
      headers: { 'content-type': 'application/json', 'x-request-id': 'req_malformed' },
    })));

    await expect(apiClient.get('/malformed')).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
      status: 200,
      requestId: 'req_malformed',
    });
  });

  it('turns an active operational control into a clear subsystem-pause message', async () => {
    server.use(http.post(`${base}/paused`, () => HttpResponse.json({
      error: {
        code: 'OPERATIONAL_CONTROL_ACTIVE',
        message: 'Internal control details that should not drive feature copy.',
      },
    }, { status: 503 })));

    await expect(apiClient.post('/paused', {})).rejects.toMatchObject({
      code: 'OPERATIONAL_CONTROL_ACTIVE',
      status: 503,
      message: expect.stringContaining('temporarily paused'),
    });
  });

  it('sends a JSON body for logout so Fastify accepts the mutation', async () => {
    server.use(http.post(`${base}/auth/logout`, async ({ request }) => {
      expect(request.headers.get('content-type')).toContain('application/json');
      expect(await request.json()).toEqual({});
      return new HttpResponse(null, { status: 204 });
    }));

    await expect(authApi.logout()).resolves.toBeUndefined();
  });
});
