import { describe, expect, it } from 'vitest';
import { http, HttpResponse, delay } from 'msw';
import { server } from '@/mocks/server';
import { env } from '@/app/config/env';
import { apiClient } from './client';
import { ApiError } from './errors';

const base = `${env.apiUrl}/v1`;
const PATH = '/test-upload';

function form() {
  const f = new FormData();
  f.append('file', new File(['hello'], 'hello.txt', { type: 'text/plain' }));
  return f;
}

describe('apiClient.uploadFile', () => {
  it('resolves with the parsed body on success', async () => {
    server.use(http.post(`${base}${PATH}`, () => HttpResponse.json({ id: 'doc_1' })));
    await expect(apiClient.uploadFile<{ id: string }>(PATH, form())).resolves.toEqual({ id: 'doc_1' });
  });

  it('rejects instead of hanging forever when the server returns malformed JSON', async () => {
    server.use(
      http.post(`${base}${PATH}`, () => new HttpResponse('{not valid json', { headers: { 'content-type': 'application/json' } })),
    );
    await expect(apiClient.uploadFile(PATH, form())).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('rejects with a classified error on an HTTP error response', async () => {
    server.use(
      http.post(`${base}${PATH}`, () =>
        HttpResponse.json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'File exceeds the 10MB limit.' } }, { status: 413 }),
      ),
    );
    const err = await apiClient.uploadFile(PATH, form()).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).isPayloadTooLarge).toBe(true);
  });

  it('rejects with a network error when the request fails at the transport level', async () => {
    server.use(http.post(`${base}${PATH}`, () => HttpResponse.error()));
    const err = await apiClient.uploadFile(PATH, form()).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe('NETWORK_ERROR');
  });

  it('times out instead of hanging forever on a stalled connection', async () => {
    server.use(
      http.post(`${base}${PATH}`, async () => {
        await delay(500);
        return HttpResponse.json({ id: 'doc_1' });
      }),
    );
    const err = await apiClient.uploadFile(PATH, form(), { timeoutMs: 30 }).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe('TIMEOUT');
  }, 10_000);

  it('rejects with an AbortError, not a generic failure, when cancelled', async () => {
    server.use(
      http.post(`${base}${PATH}`, async () => {
        await delay(500);
        return HttpResponse.json({ id: 'doc_1' });
      }),
    );
    const controller = new AbortController();
    const pending = apiClient.uploadFile(PATH, form(), { signal: controller.signal }).catch((e) => e);
    controller.abort();
    const err = await pending;
    expect(err).toBeInstanceOf(DOMException);
    expect((err as DOMException).name).toBe('AbortError');
  });

  it('rejects immediately if the signal is already aborted before the request starts', async () => {
    const controller = new AbortController();
    controller.abort();
    const err = await apiClient.uploadFile(PATH, form(), { signal: controller.signal }).catch((e) => e);
    expect(err).toBeInstanceOf(DOMException);
    expect((err as DOMException).name).toBe('AbortError');
  });
});
