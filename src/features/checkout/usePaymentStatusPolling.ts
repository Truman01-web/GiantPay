import { useEffect, useRef, useState, useCallback } from 'react';
import { checkoutApi, type TrustedPaymentStatus } from '@/services/api/checkout';

const POLL_INTERVAL_MS = 2500;
const MAX_POLL_DURATION_MS = 60_000;

const TERMINAL_STATUSES = new Set(['SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED']);

/**
 * The ONLY way this app learns a payment outcome: polling the trusted
 * backend status endpoint. Never inferred from redirect params or client
 * timers. Polling is bounded (stops after MAX_POLL_DURATION_MS or on a
 * terminal status) and always stops on unmount; once passive polling ends
 * without a terminal result, the caller is expected to offer an explicit
 * manual refresh instead of polling forever.
 */
export function usePaymentStatusPolling(reference: string | undefined) {
  const [status, setStatus] = useState<TrustedPaymentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  // Real start time is stamped when the effect below actually begins
  // polling for `reference` — this initial value is a placeholder that's
  // always overwritten before use.
  const startedAt = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const fetchOnce = useCallback(async () => {
    if (!reference) return;
    try {
      const result = await checkoutApi.getTrustedStatus(reference);
      if (!mountedRef.current) return;
      setStatus(result);
      setError(null);
      return result;
    } catch {
      if (!mountedRef.current) return;
      setError('We could not check the payment status. Please try again.');
      return undefined;
    }
  }, [reference]);

  const refresh = useCallback(async () => {
    await fetchOnce();
  }, [fetchOnce]);

  useEffect(() => {
    mountedRef.current = true;
    if (!reference) return;
    startedAt.current = 0;

    async function tick() {
      startedAt.current ||= Date.now();
      setPolling(true);
      const result = await fetchOnce();
      if (!mountedRef.current) return;

      const isTerminal = result && TERMINAL_STATUSES.has(result.status);
      const elapsed = Date.now() - startedAt.current;

      if (isTerminal || elapsed >= MAX_POLL_DURATION_MS) {
        setPolling(false);
        return;
      }

      timerRef.current = setTimeout(tick, POLL_INTERVAL_MS);
    }

    tick();

    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [reference, fetchOnce]);

  return { status, error, polling, refresh };
}
