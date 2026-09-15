import { create } from 'zustand';
import type { Environment, Session } from '@/types/auth';

export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

interface SessionState {
  status: SessionStatus;
  session: Session | null;
  /** Safe, user-facing message set only when `status` is 'error' — never a
   * raw stack trace or provider payload (see docs/frontend-security.md). */
  sessionError: string | null;
  /** Bumped by `retrySessionCheck` to give the session-bootstrap effect a
   * fresh dependency to re-run on, without reaching for imperative refs. */
  retryToken: number;
  setSession: (session: Session | null) => void;
  setSessionError: (message: string) => void;
  retrySessionCheck: () => void;
  setEnvironment: (environment: Environment) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  status: 'loading',
  session: null,
  sessionError: null,
  retryToken: 0,
  setSession: (session) =>
    set({
      session,
      status: session ? 'authenticated' : 'unauthenticated',
      sessionError: null,
    }),
  setSessionError: (message) => set({ status: 'error', session: null, sessionError: message }),
  retrySessionCheck: () => set((state) => ({ status: 'loading', sessionError: null, retryToken: state.retryToken + 1 })),
  setEnvironment: (environment) =>
    set((state) => (state.session ? { session: { ...state.session, environment } } : state)),
}));
