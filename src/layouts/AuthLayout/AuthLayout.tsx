import { Suspense } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Logo } from '@/components/navigation/Logo';
import { FullPageLoader } from '@/components/feedback/FullPageLoader';
import { ErrorBoundary } from '@/app/providers/ErrorBoundary';

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-neutral-50)]">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <header className="px-4 py-6 sm:px-6">
        <Link to="/" aria-label="GiantPay home">
          <Logo />
        </Link>
      </header>
      <main id="main-content" className="flex flex-1 items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md">
          <ErrorBoundary boundaryName="this page">
            <Suspense fallback={<FullPageLoader />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
