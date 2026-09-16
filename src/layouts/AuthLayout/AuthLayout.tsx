import { Suspense } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Logo } from '@/components/navigation/Logo';
import { FullPageLoader } from '@/components/feedback/FullPageLoader';
import { ErrorBoundary } from '@/app/providers/ErrorBoundary';

export function AuthLayout() {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 select-none overflow-hidden">
        <img
          src="/hero-bg.jpg"
          alt=""
          className="h-full w-full object-cover object-[75%_center] opacity-35"
          style={{ filter: 'contrast(1.08) brightness(1.02)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/85 to-white" />
      </div>
      <div aria-hidden className="grid-bg absolute inset-0 opacity-40" />
      <div aria-hidden className="hero-glow absolute inset-0" />
      <div aria-hidden className="blob-primary absolute left-[8%] top-1/4 h-72 w-72 rounded-full" />
      <div aria-hidden className="blob-accent absolute bottom-[8%] right-[8%] h-64 w-64 rounded-full" />

      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <header className="relative z-10 px-4 py-6 sm:px-6">
        <Link to="/" aria-label="GiantPay home">
          <Logo />
        </Link>
      </header>
      <main id="main-content" className="relative z-10 flex flex-1 items-center justify-center px-4 pb-12">
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
