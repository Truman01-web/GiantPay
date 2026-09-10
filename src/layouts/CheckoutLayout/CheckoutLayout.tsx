import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/navigation/Logo';
import { FullPageLoader } from '@/components/feedback/FullPageLoader';
import { ErrorBoundary } from '@/app/providers/ErrorBoundary';

/**
 * Deliberately isolated from merchant/admin chrome: no sidebar, no account
 * menu, no third-party scripts. This is the highest-trust surface in the
 * product and stays fast and distraction-free (spec §13).
 */
export function CheckoutLayout() {
  return (
    <div className="flex min-h-screen flex-col items-center bg-[var(--color-neutral-50)] px-4 py-8">
      <div className="mb-6">
        <Logo />
      </div>
      <div className="w-full max-w-md flex-1">
        <ErrorBoundary boundaryName="checkout">
          <Suspense fallback={<FullPageLoader />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </div>
      <p className="mt-8 flex items-center gap-1.5 text-[length:var(--text-help)] text-[var(--color-neutral-500)]">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
        Secure payment powered by GiantPay
      </p>
    </div>
  );
}
