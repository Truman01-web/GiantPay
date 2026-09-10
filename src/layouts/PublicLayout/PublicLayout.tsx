import { Suspense } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Logo } from '@/components/navigation/Logo';
import { Button } from '@/components/ui/Button';
import { FullPageLoader } from '@/components/feedback/FullPageLoader';
import { ErrorBoundary } from '@/app/providers/ErrorBoundary';

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <header className="border-b border-[var(--color-neutral-200)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="GiantPay home">
            <Logo />
          </Link>
          <nav aria-label="Primary" className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild variant="primary">
              <Link to="/register">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>
      <main id="main-content" className="flex-1">
        <ErrorBoundary boundaryName="this page">
          <Suspense fallback={<FullPageLoader />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
      <footer className="border-t border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Logo />
          <nav aria-label="Legal" className="flex gap-5 text-[length:var(--text-label)] text-[var(--color-neutral-600)]">
            <Link to="/privacy" className="hover:text-[var(--color-blue-600)] hover:underline">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-[var(--color-blue-600)] hover:underline">
              Terms
            </Link>
            <Link to="/status" className="hover:text-[var(--color-blue-600)] hover:underline">
              Status
            </Link>
          </nav>
          <p className="text-[length:var(--text-help)] text-[var(--color-neutral-500)]">
            © {new Date().getFullYear()} GiantPlus. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
