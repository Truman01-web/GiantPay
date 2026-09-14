import { StrictMode } from 'react';
import { describe, expect, it } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '@/mocks/server';
import { env } from '@/app/config/env';
import { usePaymentStatusPolling } from './usePaymentStatusPolling';

const base = `${env.apiUrl}/v1`;
const REF = 'GP-TEST-0001';

// Tiny, test-only interval so tests don't take real seconds to exercise a
// handful of poll cycles. Production call sites never pass these overrides
// — see usePaymentStatusPolling.ts. maxPollDurationMs is generous here
// (never meant to be hit) so a slow test runner can't cause a spurious
// "polling stopped" mid-test; SHORT_WINDOW below is for the tests that
// specifically want to observe the bounded-duration exhaustion itself.
const FAST = { pollIntervalMs: 15, maxPollDurationMs: 5000 };
const SHORT_WINDOW = { pollIntervalMs: 15, maxPollDurationMs: 60 };

function statusBody(status: string, extra: Record<string, unknown> = {}) {
  return {
    reference: REF,
    status,
    amount: { amountMinor: 100000, currency: 'MWK' },
    merchantDisplayName: 'Test Merchant',
    merchantReference: null,
    confirmedAt: null,
    ...extra,
  };
}

function mockStatus(handler: Parameters<typeof http.get>[1]) {
  server.use(http.get(`${base}/payment-status/:reference`, handler));
}

describe('usePaymentStatusPolling', () => {
  it('stops polling and surfaces SUCCESS on the first request', async () => {
    mockStatus(() => HttpResponse.json(statusBody('SUCCESS')));
    const { result } = renderHook(() => usePaymentStatusPolling(REF));

    await waitFor(() => expect(result.current.status?.status).toBe('SUCCESS'));
    expect(result.current.polling).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('keeps polling while the payment stays pending', async () => {
    let calls = 0;
    mockStatus(() => {
      calls++;
      return HttpResponse.json(statusBody('PENDING'));
    });
    const { result } = renderHook(() => usePaymentStatusPolling(REF, FAST));

    await waitFor(() => expect(result.current.status?.status).toBe('PENDING'));
    await waitFor(() => expect(calls).toBeGreaterThanOrEqual(3));
    expect(result.current.polling).toBe(true);
  });

  it('stops polling and shows success once a pending payment transitions to succeeded', async () => {
    let calls = 0;
    mockStatus(() => {
      calls++;
      return HttpResponse.json(statusBody(calls < 3 ? 'PENDING' : 'SUCCESS'));
    });
    const { result } = renderHook(() => usePaymentStatusPolling(REF, FAST));

    await waitFor(() => expect(result.current.status?.status).toBe('SUCCESS'));
    expect(result.current.polling).toBe(false);
  });

  it('stops polling and shows failure once a pending payment transitions to failed', async () => {
    let calls = 0;
    mockStatus(() => {
      calls++;
      return HttpResponse.json(statusBody(calls < 3 ? 'PENDING' : 'FAILED'));
    });
    const { result } = renderHook(() => usePaymentStatusPolling(REF, FAST));

    await waitFor(() => expect(result.current.status?.status).toBe('FAILED'));
    expect(result.current.polling).toBe(false);
  });

  it('stops polling and shows expired when the payment expires', async () => {
    mockStatus(() => HttpResponse.json(statusBody('EXPIRED')));
    const { result } = renderHook(() => usePaymentStatusPolling(REF, FAST));

    await waitFor(() => expect(result.current.status?.status).toBe('EXPIRED'));
    expect(result.current.polling).toBe(false);
  });

  it('retries through a temporary network/server error and recovers', async () => {
    let calls = 0;
    mockStatus(() => {
      calls++;
      if (calls === 1) {
        return HttpResponse.json({ error: { code: 'INTERNAL', message: 'boom' } }, { status: 500 });
      }
      return HttpResponse.json(statusBody('SUCCESS'));
    });
    const { result } = renderHook(() => usePaymentStatusPolling(REF, FAST));

    await waitFor(() => expect(result.current.status?.status).toBe('SUCCESS'));
    expect(result.current.polling).toBe(false);
    expect(result.current.error).toBeNull();
    expect(calls).toBeGreaterThanOrEqual(2);
  });

  it('stops after repeated errors exhaust the retry window, with a recoverable error and no infinite spinner', async () => {
    mockStatus(() => HttpResponse.json({ error: { code: 'INTERNAL', message: 'boom' } }, { status: 500 }));
    const { result } = renderHook(() => usePaymentStatusPolling(REF, SHORT_WINDOW));

    await waitFor(() => expect(result.current.polling).toBe(false), { timeout: 3000 });
    expect(result.current.status).toBeNull();
    expect(result.current.error).toBeTruthy();
  });

  it('stops immediately on a 404 (unknown reference) instead of retrying for the full window', async () => {
    let calls = 0;
    mockStatus(() => {
      calls++;
      return HttpResponse.json({ error: { code: 'NOT_FOUND', message: 'Unknown payment reference.' } }, { status: 404 });
    });
    const { result } = renderHook(() => usePaymentStatusPolling(REF, FAST));

    await waitFor(() => expect(result.current.polling).toBe(false));
    expect(result.current.status).toBeNull();
    expect(result.current.error).toBe('Unknown payment reference.');
    // Stopped after the first attempt — not retried until maxPollDurationMs.
    expect(calls).toBe(1);
  });

  it('rejects a malformed response instead of treating it as success', async () => {
    mockStatus(() => HttpResponse.json({ unexpected: 'shape' }));
    const { result } = renderHook(() => usePaymentStatusPolling(REF, SHORT_WINDOW));

    await waitFor(() => expect(result.current.polling).toBe(false), { timeout: 3000 });
    expect(result.current.status).toBeNull();
    expect(result.current.error).toBeTruthy();
  });

  it('stops polling on unmount and issues no further requests', async () => {
    let calls = 0;
    mockStatus(() => {
      calls++;
      return HttpResponse.json(statusBody('PENDING'));
    });
    const { result, unmount } = renderHook(() => usePaymentStatusPolling(REF, FAST));

    await waitFor(() => expect(calls).toBeGreaterThanOrEqual(1));
    unmount();
    const callsAtUnmount = calls;
    await new Promise((resolve) => setTimeout(resolve, FAST.pollIntervalMs * 4));
    expect(calls).toBe(callsAtUnmount);
    expect(result.current.polling).toBe(true); // last-committed value before unmount; no post-unmount update occurred
  });

  it('runs exactly one polling loop under React StrictMode (no duplicate requests)', async () => {
    let calls = 0;
    mockStatus(() => {
      calls++;
      return HttpResponse.json(statusBody('PENDING'));
    });
    const { result } = renderHook(() => usePaymentStatusPolling(REF, FAST), { wrapper: StrictMode });

    await waitFor(() => expect(result.current.status?.status).toBe('PENDING'));
    const callsAfterFirstSettle = calls;

    await waitFor(() => expect(calls).toBeGreaterThan(callsAfterFirstSettle));
    // A duplicated loop would roughly double the call count for the same
    // elapsed window; allow slack for scheduling jitter but reject 2x+.
    const before = calls;
    await new Promise((resolve) => setTimeout(resolve, FAST.pollIntervalMs * 3));
    const after = calls;
    expect(after - before).toBeLessThan(6);
  });

  it('starts exactly one new polling process on retry after the window is exhausted', async () => {
    let calls = 0;
    mockStatus(() => {
      calls++;
      return HttpResponse.json({ error: { code: 'INTERNAL', message: 'boom' } }, { status: 500 });
    });
    const { result } = renderHook(() => usePaymentStatusPolling(REF, SHORT_WINDOW));

    await waitFor(() => expect(result.current.polling).toBe(false), { timeout: 3000 });
    const callsBeforeRetry = calls;

    mockStatus(() => {
      calls++;
      return HttpResponse.json(statusBody('SUCCESS'));
    });
    act(() => {
      result.current.refresh();
    });

    await waitFor(() => expect(result.current.status?.status).toBe('SUCCESS'));
    expect(calls).toBe(callsBeforeRetry + 1);
  });
});
