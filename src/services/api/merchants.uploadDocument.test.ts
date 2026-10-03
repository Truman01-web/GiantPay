import { describe, expect, it, vi, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { env } from '@/app/config/env';
import { merchantsApi } from './merchants';

const base = `${env.apiUrl}/v1`;
const UPLOAD_PATH = `${base}/merchants/onboarding/evidence/upload`;

// Deliberately not `vi.mock('./client', ...)`: this project's vitest config
// runs with `isolate: false` (worker reuse across test files for startup
// speed), which shares the module registry across files in a run — a
// per-file `vi.mock` factory here does not reliably apply once other test
// files are part of the same run (confirmed: passed alone, failed as part
// of the full suite). A prototype spy plus MSW's `server.use()` — the same
// pattern already proven reliable across this whole test suite — avoids
// that entirely.
describe('merchantsApi.uploadDocument', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends the file and category under the field names the backend expects', async () => {
    server.use(http.post(UPLOAD_PATH, () => HttpResponse.json({ id: 'doc_1', fileName: 'a.pdf', sizeBytes: 10, scanState: 'CLEAN', failureCode: null })));
    const appendSpy = vi.spyOn(FormData.prototype, 'append');
    const file = new File(['x'], 'a.pdf', { type: 'application/pdf' });

    await merchantsApi.uploadDocument({ category: 'BUSINESS_REGISTRATION', file, idempotencyKey: 'upload-1' });

    const fieldNames = appendSpy.mock.calls.map(([name]) => name);
    expect(fieldNames.sort()).toEqual(['file', 'metadata']);
    expect(appendSpy.mock.calls.find(([name]) => name === 'file')?.[1]).toBe(file);
    expect(appendSpy.mock.calls.find(([name]) => name === 'metadata')?.[1]).toBe(
      JSON.stringify({ category: 'BUSINESS_REGISTRATION', ownerType: 'MERCHANT' }),
    );
  });

  it('rejects a malformed success response instead of returning it', async () => {
    server.use(http.post(UPLOAD_PATH, () => HttpResponse.json({ unexpected: true })));
    const file = new File(['x'], 'a.pdf', { type: 'application/pdf' });

    await expect(merchantsApi.uploadDocument({ category: 'BUSINESS_REGISTRATION', file, idempotencyKey: 'upload-2' })).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });

  it('rejects a response missing required fields', async () => {
    server.use(http.post(UPLOAD_PATH, () => HttpResponse.json({ id: 'doc_1' })));
    const file = new File(['x'], 'a.pdf', { type: 'application/pdf' });

    await expect(merchantsApi.uploadDocument({ category: 'BUSINESS_REGISTRATION', file, idempotencyKey: 'upload-3' })).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });
});
