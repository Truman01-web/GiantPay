import { useEffect, useState, useCallback } from 'react';
import { checkoutApi, type TrustedPaymentStatus } from '@/services/api/checkout';
import { ApiError } from '@/services/api/errors';

export const POLL_INTERVAL_MS = 2500;
export const MAX_POLL_DURATION_MS = 60_000;

const TERMINAL_STATUSES = new Set<TrustedPaymentStatus['status']>(['SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED']);

const TIMED_OUT_MESSAGE =
  "We couldn't confirm your payment status automatically. Please check again, or contact the merchant if you already paid.";
const MALFORMED_RESPONSE_MESSAGE = 'We received an unexpected response while checking your payment.';
const TRANSIENT_ERROR_MESSAGE = 'We could not check the payment status. Retrying…';

function isValidTrustedStatus(value: unknown): value is TrustedPaymentStatus {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  const amount = v.amount as Record<string, unknown> | undefined;
  return (
    typeof v.reference === 'string' &&
    typeof v.status === 'string' &&
    typeof amount === 'object' &&
    amount !== null &&
    typeof amount.amountMinor === 'number' &&
    typeof amount.currency === 'string'
  );
}

/** A response the backend explicitly returned as permanently wrong for
 * this reference — retrying it will never succeed, so polling stops
 * immediately instead of burning the full retry window. */
function isPermanentError(error: unknown): error is ApiError {
  return error instanceof ApiError && (error.isNotFound || error.isUnauthorized || error.isForbidden);
}

/**
 * The ONLY way this app learns a payment outcome: polling the trusted
 * backend status endpoint. Never inferred from redirect params, provider
 * callbacks, or client timers.
 *
 * Every effect run owns its own AbortController and its own local
 * `startedAt`/timer handle — nothing is shared via a ref that a later
 * StrictMode invocation could reset out from under an earlier, still
 * in-flight one (same pattern/rationale as `SessionProvider`). That
 * eliminates the case where StrictMode's mount→cleanup→mount produced two
 * independent, uncoordinated polling loops with corrupted elapsed-time
 * tracking.
 *
 * Polling always reaches a terminal outcome:
 *  - a terminal payment status (SUCCESS/FAILED/EXPIRED/CANCELLED)
 *  - a permanent error (404/401/403) — stops immediately, not retried
 *  - MAX_POLL_DURATION_MS of retrying transient failures/malformed
 *    responses elapses
 *  - the caller's `reference` changes, or `refresh()` is called — either
 *    tears down the current attempt and starts exactly one new one
 *  - unmount
 *
 * It never runs indefinitely and never infers success from anything but a
 * successfully-parsed, valid SUCCESS response.
 */
export interface PaymentStatusPollingOptions {
  /** Overrides POLL_INTERVAL_MS — for tests only; production call sites
   * should rely on the default. */
  pollIntervalMs?: number;
  /** Overrides MAX_POLL_DURATION_MS — for tests only; production call
   * sites should rely on the default. */
  maxPollDurationMs?: number;
}

export function usePaymentStatusPolling(reference: string | undefined, options: PaymentStatusPollingOptions = {}) {
  const pollIntervalMs = options.pollIntervalMs ?? POLL_INTERVAL_MS;
  const maxPollDurationMs = options.maxPollDurationMs ?? MAX_POLL_DURATION_MS;

  const [status, setStatus] = useState<TrustedPaymentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  const refresh = useCallback(() => setRefreshToken((t) => t + 1), []);

  useEffect(() => {
    if (!reference) return;
    const paymentReference = reference;

    const controller = new AbortController();
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout> | null = null;

    function stop(finalError?: string) {
      setPolling(false);
      if (finalError !== undefined) setError(finalError);
    }

    function scheduleNextAttempt(errorIfTimedOut: string) {
      if (Date.now() - startedAt >= maxPollDurationMs) {
        stop(errorIfTimedOut);
        return;
      }
      timer = setTimeout(tick, pollIntervalMs);
    }

    async function tick() {
      setPolling(true);
      try {
        const result = await checkoutApi.getTrustedStatus(paymentReference, { signal: controller.signal });
        if (controller.signal.aborted) return;

        if (!isValidTrustedStatus(result)) {
          setError(MALFORMED_RESPONSE_MESSAGE);
          scheduleNextAttempt(TIMED_OUT_MESSAGE);
          return;
        }

        setStatus(result);
        setError(null);

        if (TERMINAL_STATUSES.has(result.status)) {
          setPolling(false);
          return;
        }
        scheduleNextAttempt(TIMED_OUT_MESSAGE);
      } catch (err) {
        if (controller.signal.aborted) return;

        if (isPermanentError(err)) {
          stop(err.message);
          return;
        }

        setError(TRANSIENT_ERROR_MESSAGE);
        scheduleNextAttempt(TIMED_OUT_MESSAGE);
      }
    }

    tick();

    return () => {
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [reference, refreshToken, pollIntervalMs, maxPollDurationMs]);

  return { status, error, polling, refresh };
}
