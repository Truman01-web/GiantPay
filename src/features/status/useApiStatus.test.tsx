import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '@/app/config/env';
import { checkApiStatus, useApiStatus } from './useApiStatus';

const originalMock = env.useMockApi;
const json = (status: string) => new Response(JSON.stringify({ status }), { status: 200, headers: { 'Content-Type': 'application/json' } });
const healthy = (input: RequestInfo | URL) => Promise.resolve(json(String(input).endsWith('/live') ? 'alive' : 'ready'));
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}>{children}</QueryClientProvider>;

beforeEach(() => { env.useMockApi = false; });
afterEach(() => { env.useMockApi = originalMock; vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('API status request lifecycle', () => {
  it('times out, cancels both requests, and recovers on the next check', async () => {
    vi.useFakeTimers();
    const signals: AbortSignal[] = [];
    vi.stubGlobal('fetch', vi.fn((_url, init: RequestInit) => new Promise((_resolve, reject) => {
      const signal = init.signal as AbortSignal;
      signals.push(signal);
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    })));
    const pending = checkApiStatus(new AbortController().signal);
    await vi.advanceTimersByTimeAsync(5000);
    expect((await pending).state).toBe('Unknown');
    expect(signals).toHaveLength(2);
    expect(signals.every((signal) => signal.aborted)).toBe(true);
    vi.stubGlobal('fetch', vi.fn(healthy));
    expect((await checkApiStatus(new AbortController().signal)).state).toBe('Operational');
  });

  it('cancels requests on unmount', async () => {
    const signals: AbortSignal[] = [];
    vi.stubGlobal('fetch', vi.fn((_url, init: RequestInit) => new Promise((_resolve, reject) => {
      const signal = init.signal as AbortSignal;
      signals.push(signal);
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    })));
    const hook = renderHook(() => useApiStatus(), { wrapper });
    await waitFor(() => expect(signals).toHaveLength(2));
    hook.unmount();
    expect(signals.every((signal) => signal.aborted)).toBe(true);
  });

  it('deduplicates refreshes while a check is in flight and keeps the latest result', async () => {
    let resolveReady: (response: Response) => void = () => {};
    const fetchMock = vi.fn((input: RequestInfo | URL) => String(input).endsWith('/live') ? Promise.resolve(json('alive')) : new Promise<Response>((resolve) => { resolveReady = resolve; }));
    vi.stubGlobal('fetch', fetchMock);
    const hook = renderHook(() => useApiStatus(), { wrapper });
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    act(() => { void hook.result.current.refresh(); void hook.result.current.refresh(); });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await act(async () => { resolveReady(json('ready')); });
    await waitFor(() => expect(hook.result.current.state).toBe('Operational'));
    hook.unmount();
  });

  it('marks an old result unknown and recovers after a successful refresh', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(healthy);
    vi.stubGlobal('fetch', fetchMock);
    const hook = renderHook(() => useApiStatus(), { wrapper });
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(hook.result.current.state).toBe('Operational');
    const realNow = Date.now();
    vi.setSystemTime(realNow + 100_000);
    // Trigger the hook's clock update without allowing a background poll to mask staleness.
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(hook.result.current.state).toBe('Unknown');
    expect(hook.result.current.stale).toBe(true);
    await act(async () => { await hook.result.current.refresh(); await vi.advanceTimersByTimeAsync(1); });
    expect(hook.result.current.state).toBe('Operational');
    expect(hook.result.current.stale).toBe(false);
    hook.unmount();
  });
});
