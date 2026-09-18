import { describe, expect, it, vi } from 'vitest';
import { delay, http, HttpResponse } from 'msw';
import { env } from '@/app/config/env';
import { server } from '@/mocks/server';
import { apiClient } from './client';

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
});
