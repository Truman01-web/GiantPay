import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, FlaskConical, CircleCheck, Clock3 } from 'lucide-react';

const AVAILABLE_TODAY = [
  'Registration, login, MFA, and password reset',
  'Merchant onboarding (business info, ownership, KYC/KYB document upload)',
  'Hosted checkout and payment-status lookup',
  'Merchant dashboard (stats, volume chart, recent transactions)',
  'Transactions — list, filters, detail view with event timeline',
  'Payment links — create, list, detail, disable',
  'Refunds — request, list, detail',
  'Settlements and reconciliation — runs, exceptions, status updates',
  'Reports and the developer dashboard (API keys, webhooks)',
];

const NOT_YET_AVAILABLE = [
  'Team invitations and role management',
  'Support case tracking',
  'The admin console',
];

export default function SandboxPage() {
  return (
    <main className="overflow-hidden bg-white text-slate-900">
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-white pt-24 pb-20 lg:pt-32 lg:pb-28">
        <div aria-hidden className="pointer-events-none absolute inset-0 select-none overflow-hidden">
          <img
            src="/hero-bg.jpg"
            alt=""
            className="h-full w-full object-cover object-[75%_center] opacity-45 sm:opacity-55"
            style={{ filter: 'contrast(1.08) brightness(1.02)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-white/40" />
          <div className="absolute inset-0 bg-gradient-to-b from-white/50 via-transparent to-white" />
        </div>
        <div aria-hidden className="grid-bg absolute inset-0 opacity-60" />
        <div aria-hidden className="hero-glow absolute inset-0" />
        <div aria-hidden className="blob-primary absolute left-[12%] top-1/4 h-80 w-80 rounded-full" />
        <div aria-hidden className="blob-accent absolute bottom-[12%] right-[12%] h-72 w-72 rounded-full" />
        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link
              to="/developers/overview"
              className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-sm transition hover:bg-white hover:text-[#1B4FD8]"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Developers
            </Link>
          </div>
          <div className="max-w-3xl">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              A zero-risk{' '}
              <span className="bg-gradient-to-r from-[#1B4FD8] via-blue-500 to-sky-400 bg-clip-text text-transparent">
                sandbox.
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
              No waitlist, no manual approval, no real money. Register a merchant account and you&apos;re instantly
              testing against realistic, deterministic sandbox data — before a real backend or the public API even
              ships.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-[#1B4FD8] px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[#1744b9]"
              >
                Create sandbox account <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Try a demo account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex items-center gap-2 text-xs font-bold uppercase tracking-[.3em] text-[#1B4FD8]">
            <FlaskConical className="h-4 w-4" /> How the sandbox works
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
            <p className="text-sm leading-relaxed text-slate-600">
              The sandbox runs entirely against a set of deterministic, Malawi-realistic mock handlers served
              in-browser — no real backend needs to be running, and no real money ever moves. Every trusted status
              GiantPay shows you (checkout outcomes, settlement batches, reconciliation exceptions) comes from this
              same mock layer, so the behaviour you see is the same shape a production integration will see.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Demo sign-in accounts covering different roles (owner, viewer, platform admin) are available as
              one-click quick-fill buttons on the{' '}
              <Link to="/login" className="font-semibold text-[#1B4FD8] hover:underline">
                sign-in page
              </Link>{' '}
              — MFA code <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-800">123456</code>.
            </p>
          </div>
        </div>
      </section>

      {/* What's available */}
      <section className="bg-slate-50 py-20 lg:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-emerald-600">
                <CircleCheck className="h-4 w-4" /> Testable today
              </div>
              <ul className="mt-6 space-y-3">
                {AVAILABLE_TODAY.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
                    <CircleCheck className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.2em] text-slate-400">
                <Clock3 className="h-4 w-4" /> Still on the roadmap
              </div>
              <ul className="mt-6 space-y-3">
                {NOT_YET_AVAILABLE.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-500">
                    <Clock3 className="h-4 w-4 shrink-0 text-slate-300 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-100 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Ready to start testing?</h2>
          <p className="mt-3 text-slate-500">Registration takes under a minute — you&apos;ll land straight in a working sandbox dashboard.</p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link to="/register" className="inline-flex items-center gap-2 rounded-xl bg-[#1B4FD8] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#1744b9]">
              Create sandbox account <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/developers/overview" className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
              Back to Developers
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
