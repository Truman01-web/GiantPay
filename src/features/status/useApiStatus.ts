import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { env } from '@/app/config/env';

export type Status = 'Operational' | 'Degraded' | 'Unavailable' | 'Unknown';
const STALE_MS = 90_000;

export async function checkApiStatus(signal: AbortSignal) {
  if (env.useMockApi) return { state: 'Unknown' as Status, checkedAt: Date.now() };
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal.addEventListener('abort', cancel, { once: true });
  if (signal.aborted) cancel();
  const timer = setTimeout(cancel, 5000);
  try {
    const get = async (path: string) => {
      const response = await fetch(`${env.apiUrl}/v1/health/${path}`, { signal: controller.signal, credentials: 'omit', cache: 'no-store' });
      const body: unknown = await response.json();
      if (!body || typeof body !== 'object' || !('status' in body)) return null;
      return { code: response.status, status: (body as { status: unknown }).status };
    };
    const [live, ready] = await Promise.all([get('live'), get('ready')]);
    let state: Status = 'Unknown';
    if (live?.code === 200 && live.status === 'alive' && ready?.code === 200 && ready.status === 'ready') state = 'Operational';
    else if (live?.code === 200 && live.status === 'alive' && ready?.code === 503 && ready.status === 'unavailable') state = 'Degraded';
    else if (live?.code === 503 && live.status === 'unavailable') state = 'Unavailable';
    return { state, checkedAt: Date.now() };
  } catch {
    // Cancel the other request as well when either endpoint fails.
    controller.abort();
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    return { state: 'Unknown' as Status, checkedAt: Date.now() };
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', cancel);
  }
}

export function useApiStatus() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10_000);
    return () => clearInterval(timer);
  }, []);
  const query = useQuery({ queryKey: ['public-api-status'], queryFn: ({ signal }) => checkApiStatus(signal), retry: false, staleTime: 30_000, refetchInterval: 60_000, refetchIntervalInBackground: false });
  const stale = !!query.data && now - query.data.checkedAt > STALE_MS;
  return { ...query, refresh: () => query.refetch({ cancelRefetch: false }), state: stale ? 'Unknown' as const : query.data?.state ?? 'Unknown', stale };
}

export function statusColour(state: Status) {
  return state === 'Operational' ? '#168a45' : state === 'Degraded' ? '#ad6500' : state === 'Unavailable' ? '#b42318' : '#64748b';
}

export function environmentLabel() {
  if (env.useMockApi) return 'Local development (mock API; service health cannot be verified)';
  const host = new URL(env.apiUrl).hostname;
  const local = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  return `${local ? 'Local API' : 'Hosted API'} · ${env.appEnv}`;
}
