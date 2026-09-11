import { Suspense } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { LogoWhite } from '@/components/navigation/Logo';
import { FullPageLoader } from '@/components/feedback/FullPageLoader';
import { ErrorBoundary } from '@/app/providers/ErrorBoundary';
import { MARK_SRC } from '@/assets/brand';

export function AuthLayout() {
  return (
    <div
      className="relative flex min-h-screen flex-col overflow-hidden"
      style={{
        /* Rich multi-stop navy gradient — deep at top, slightly lighter at bottom */
        background:
          'linear-gradient(160deg, #061428 0%, #0B2445 30%, #0d2d5e 60%, #071a38 100%)',
      }}
    >
      {/* ── Decorative orbs — depth without clutter ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full"
        style={{
          background: 'radial-gradient(circle at 40% 40%, rgba(26,109,204,0.18) 0%, transparent 65%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-32 h-[500px] w-[500px] rounded-full"
        style={{
          background: 'radial-gradient(circle at 60% 60%, rgba(192,28,40,0.12) 0%, transparent 65%)',
        }}
      />
      {/* Gold shimmer — very subtle */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/3 right-1/4 h-[400px] w-[400px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(201,162,39,0.06) 0%, transparent 60%)',
        }}
      />

      {/* ── Large GP mark watermark — centred behind everything ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
      >
        <img
          src={MARK_SRC}
          alt=""
          className="w-[55vw] max-w-[520px] opacity-[0.04]"
          style={{ filter: 'brightness(0) invert(1)' }}
        />
      </div>

      {/* ── Skip link ── */}
      <a href="#auth-form" className="skip-link">
        Skip to content
      </a>

      {/* ── Top navbar ── */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5">
        <Link to="/" aria-label="GiantPay home">
          <LogoWhite />
        </Link>
        {/* Thin separator line */}
        <div className="h-px flex-1 mx-8 bg-white/10" />
        <p className="text-xs text-white/30 tracking-widest uppercase hidden sm:block">
          Secure Portal
        </p>
      </header>

      {/* ── Centred form area ── */}
      <main
        id="auth-form"
        className="relative z-10 flex flex-1 items-center justify-center px-4 pb-16"
      >
        <div className="w-full max-w-[420px]">
          <ErrorBoundary boundaryName="this page">
            <Suspense fallback={<FullPageLoader />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 pb-5 text-center text-[11px] text-white/20 tracking-wide">
        © {new Date().getFullYear()} GiantPlus · All rights reserved · Global Finance Solutions
      </footer>
    </div>
  );
}
