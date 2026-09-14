import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/services/api/auth';
import { registerUnauthorizedHandler } from '@/services/api/client';
import { ApiError, GENERIC_ERROR_MESSAGE } from '@/services/api/errors';
import { useSessionStore } from '@/services/auth/sessionStore';

/**
 * Bootstraps the session once on app load and reacts globally to a lost
 * session (any request returning 401) by clearing local state and any
 * cached server data — nothing sensitive survives a logout or an expired
 * session in the query cache.
 *
 * Each effect run owns its own AbortController rather than a persistent
 * "already ran" ref: under React StrictMode the effect mounts, cleans up,
 * and mounts again before the first request resolves. A ref-guard that
 * blocks the second run while a `cancelled` flag from the first run's
 * cleanup discards its result leaves nothing to ever call `setSession` —
 * the session state is then stuck on 'loading' forever. Letting every
 * invocation run fully and abort its own in-flight request on cleanup
 * fixes that: the superseded first request is aborted and ignored, and the
 * second (real) request is free to resolve and update state normally.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const setSession = useSessionStore((s) => s.setSession);
  const setSessionError = useSessionStore((s) => s.setSessionError);
  const retryToken = useSessionStore((s) => s.retryToken);
  const queryClient = useQueryClient();

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      setSession(null);
      queryClient.clear();
    });
  }, [setSession, queryClient]);

  useEffect(() => {
    const controller = new AbortController();

    authApi
      .getSession({ signal: controller.signal })
      .then((res) => {
        if (controller.signal.aborted) return;
        setSession(res.session);
      })
      .catch((error: unknown) => {
        // This invocation was superseded (StrictMode remount, real unmount,
        // or a newer retry) — its result no longer applies.
        if (controller.signal.aborted) return;

        if (error instanceof ApiError && error.isUnauthorized) {
          // No valid session cookie. This is a normal "signed out" result
          // from a session-check endpoint, not a failure.
          setSession(null);
          return;
        }

        // A network or server problem prevented us from even determining
        // sign-in state — surface it distinctly so the UI can offer a
        // retry instead of silently treating the visitor as signed out.
        setSessionError(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
      });

    return () => controller.abort();
  }, [setSession, setSessionError, retryToken]);

  return children;
}
