import { Navigate, useLocation } from 'react-router-dom';
import { useSession, useSessionStatus } from '@/hooks/useSession';
import { useSessionStore } from '@/services/auth/sessionStore';
import { hasPermission, hasAnyPermission, type Permission } from '@/types/auth';
import { PermissionDenied } from '@/components/feedback/PermissionDenied';
import { FullPageLoader } from '@/components/feedback/FullPageLoader';
import { ErrorState } from '@/components/feedback/ErrorState';

/** Redirects to /login (preserving a safe returnTo) if there's no session.
 * A hidden nav link is never treated as authorization — this guard also
 * re-checks on every direct URL entry, protecting deep links. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const status = useSessionStatus();
  const sessionError = useSessionStore((s) => s.sessionError);
  const retrySessionCheck = useSessionStore((s) => s.retrySessionCheck);
  const location = useLocation();

  if (status === 'loading') return <FullPageLoader label="Checking your session…" />;
  if (status === 'error') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <ErrorState
          title="We couldn't check your session"
          message={sessionError ?? 'Something went wrong on our side. Please try again.'}
          onRetry={retrySessionCheck}
        />
      </div>
    );
  }
  if (status === 'unauthenticated') {
    const returnTo = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/login?returnTo=${returnTo}`} replace />;
  }
  return children;
}

export function RequirePermission({
  permission,
  anyOf,
  children,
}: {
  permission?: Permission;
  anyOf?: Permission[];
  children: React.ReactNode;
}) {
  const session = useSession();
  const allowed = permission ? hasPermission(session, permission) : anyOf ? hasAnyPermission(session, anyOf) : true;
  if (!allowed) return <PermissionDenied />;
  return children;
}

/** Keeps an authenticated user off the auth screens (login/register/etc). */
export function RedirectIfAuthenticated({ children }: { children: React.ReactNode }) {
  const status = useSessionStatus();
  const session = useSession();
  if (status === 'authenticated') return <Navigate to={session?.user.merchantId === null ? '/admin' : '/dashboard'} replace />;
  return children;
}

export function RequireMerchant({ children }: { children: React.ReactNode }) {
  const session = useSession();
  return session?.user.merchantId ? children : <PermissionDenied />;
}

export function RequirePlatformAdmin({ children }: { children: React.ReactNode }) {
  const session = useSession();
  return session?.user.role === 'PLATFORM_ADMIN' && session.user.merchantId === null
    ? children
    : <PermissionDenied />;
}
