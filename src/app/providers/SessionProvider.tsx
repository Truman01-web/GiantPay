import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/services/api/auth';
import { registerUnauthorizedHandler } from '@/services/api/client';
import { useSessionStore } from '@/services/auth/sessionStore';

/**
 * Bootstraps the session once on app load and reacts globally to a lost
 * session (any request returning 401) by clearing local state and any
 * cached server data — nothing sensitive survives a logout or an expired
 * session in the query cache.
 */
export function SessionProvider({ children }: { children: React.ReactNode }) {
  const setSession = useSessionStore((s) => s.setSession);
  const queryClient = useQueryClient();
  const bootstrapped = useRef(false);

  useEffect(() => {
    registerUnauthorizedHandler(() => {
      setSession(null);
      queryClient.clear();
    });
  }, [setSession, queryClient]);

  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    let cancelled = false;
    authApi
      .getSession()
      .then((res) => {
        if (!cancelled) setSession(res.session);
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      });
    return () => {
      cancelled = true;
    };
  }, [setSession]);

  return children;
}
