import { Suspense } from 'react';
import { Outlet, Link } from 'react-router-dom';

import { Logo } from '@/components/navigation/Logo';
import { FullPageLoader } from '@/components/feedback/FullPageLoader';
import { ErrorBoundary } from '@/app/providers/ErrorBoundary';
import { MARK_SRC } from '@/assets/brand';

export function AuthLayout() {
  return (
    <div
      className="relative flex min-h-screen flex-col overflow-hidden bg-white"
      style={{
        /* Rich multi-stop navy gradient — deep at top, slightly lighter at bottom */
        background:
          'linear-gradient(160deg, #ffffff 0%, #f8faff 55%, #f1f5ff 100%)',
      }}
    >
      {/* ── Decorative glowing orbs ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -left-40 h-[650px] w-[650px] rounded-full"
        style={{
          background: 'radial-gradient(circle at 40% 40%, rgba(27,79,216,0.12) 0%, transparent 65%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-32 h-[550px] w-[550px] rounded-full"
        style={{
          background: 'radial-gradient(circle at 60% 60%, rgba(245,158,11,0.10) 0%, transparent 65%)',
        }}
      />
      {/* Gold shimmer */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/3 right-1/4 h-[450px] w-[450px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(201,162,39,0.08) 0%, transparent 60%)',
        }}
      />

      {/* ── Large GP mark watermark — waving like a flag with rich brand colors ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
      >
        <img
          src={MARK_SRC}
          alt=""
          className="animate-flag-wave-slow w-[80vw] max-w-[680px] opacity-[0.035] select-none"
          style={{
            filter: 'drop-shadow(0 20px 60px rgba(27,79,216,0.18))',
          }}
        />
      </div>

      {/* ── Skip link ── */}
      <a href="#auth-form" className="skip-link">
        Skip to content
      </a>

      {/* ── Top navbar ── */}
      <header className="relative z-10 flex items-center justify-between px-4 py-4 sm:px-10 sm:py-5">
        <Link to="/" aria-label="GiantPay home">
          <Logo />
        </Link>
        {/* Thin separator line — visible on sm+ screens */}
        <div className="hidden sm:block h-px flex-1 mx-8 bg-slate-200" />
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-500 uppercase">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="hidden xs:inline sm:inline">Secure Portal</span>
        </div>
      </header>

      {/* ── Centred form area ── */}
      <main
        id="auth-form"
        className="relative z-10 flex flex-1 items-center justify-center px-3.5 py-6 sm:px-6 sm:py-12"
      >
        <div className="w-full max-w-[480px]">
          <ErrorBoundary boundaryName="this page">
            <Suspense fallback={<FullPageLoader />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>

      {/* ── Professional Fintech Footer ── */}
      <footer className="relative z-10 mt-auto border-t border-white/70 bg-white/60 px-4 py-6 backdrop-blur-2xl sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 text-center">
          {/* Security & compliance indicators */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              256-Bit SSL Encrypted
            </span>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span className="inline-flex items-center gap-1.5">
              {/* Shield icon */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-[#c9a227]" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              PCI-DSS Level 1 Compliant
            </span>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span className="inline-flex items-center gap-1.5">
              {/* Lock icon */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              RBM Regulated Infrastructure
            </span>
          </div>

          {/* Quick links */}
          <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-500">
            <Link to="/privacy" className="hover:text-[#1B4FD8] transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-[#1B4FD8] transition-colors">Terms of Service</Link>
            <Link to="/status" className="hover:text-[#1B4FD8] transition-colors">System Status</Link>
            <a href="mailto:support@giantpay.mw" className="hover:text-[#1B4FD8] transition-colors">Help & Support</a>
          </nav>

          {/* Copyright */}
          <p className="text-[11px] text-slate-400 tracking-wide">
            © {new Date().getFullYear()} GiantPay Ltd · GiantPlus Global Finance Solutions · All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
