import { useSessionStore } from '@/services/auth/sessionStore';
import { hasPermission, type Permission } from '@/types/auth';

export function useSession() {
  return useSessionStore((s) => s.session);
}

export function useSessionStatus() {
  return useSessionStore((s) => s.status);
}

export function usePermission(permission: Permission): boolean {
  return useSessionStore((s) => hasPermission(s.session, permission));
}
