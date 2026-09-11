import { Suspense } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { ShieldCheck, Lock } from 'lucide-react';
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
      {/* ── Decorative glowing orbs ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 -left-40 h-[650px] w-[650px] rounded-full"
        style={{
          background: 'radial-gradient(circle at 40% 40%, rgba(26,109,204,0.22) 0%, transparent 65%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-32 h-[550px] w-[550px] rounded-full"
        style={{
          background: 'radial-gradient(circle at 60% 60%, rgba(192,28,40,0.16) 0%, transparent 65%)',
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
          className="animate-flag-wave-slow w-[80vw] max-w-[680px] opacity-[0.10] select-none"
          style={{
            filter: 'drop-shadow(0 20px 60px rgba(26,109,204,0.35))',
          }}
        />
      </div>

      {/* ── Skip link ── */}
      <a href="#auth-form" className="skip-link">
        Skip to content
      </a>

      {/* ── Top navbar ── */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-10">
        <Link to="/" aria-label="GiantPay home">
          <LogoWhite />
        </Link>
        {/* Thin separator line */}
        <div className="h-px flex-1 mx-8 bg-white/10" />
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-white/50 uppercase hidden sm:flex">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Secure Portal
        </div>
      </header>

      {/* ── Centred form area ── */}
      <main
        id="auth-form"
        className="relative z-10 flex flex-1 items-center justify-center px-4 py-8 sm:py-12"
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
      <footer className="relative z-10 border-t border-white/10 bg-black/25 backdrop-blur-md px-6 py-6 mt-auto">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 text-center">
          {/* Security & compliance indicators */}
          <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-white/70">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              256-Bit SSL Encrypted
            </span>
            <span className="text-white/25">•</span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-[#c9a227]" />
              PCI-DSS Level 1 Compliant
            </span>
            <span className="text-white/25">•</span>
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-blue-400" />
              RBM Regulated Infrastructure
            </span>
          </div>

          {/* Quick links */}
          <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-6 text-xs text-white/50">
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link to="/status" className="hover:text-white transition-colors">System Status</Link>
            <a href="mailto:support@giantpay.mw" className="hover:text-white transition-colors">Help & Support</a>
          </nav>

          {/* Copyright */}
          <p className="text-[11px] text-white/35 tracking-wide">
            © {new Date().getFullYear()} GiantPay Ltd · GiantPlus Global Finance Solutions · All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
