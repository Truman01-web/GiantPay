import { create } from 'zustand';
import type { Environment, Session } from '@/types/auth';

type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface SessionState {
  status: SessionStatus;
  session: Session | null;
  setSession: (session: Session | null) => void;
  setEnvironment: (environment: Environment) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  status: 'loading',
  session: null,
  setSession: (session) =>
    set({
      session,
      status: session ? 'authenticated' : 'unauthenticated',
    }),
  setEnvironment: (environment) =>
    set((state) => (state.session ? { session: { ...state.session, environment } } : state)),
}));
