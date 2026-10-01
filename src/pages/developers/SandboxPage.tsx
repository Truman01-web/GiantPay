import { Link } from 'react-router-dom';
import { ArrowRight, FlaskConical, CircleCheck, Clock3 } from 'lucide-react';
import { PublicPageHero } from '@/components/marketing/PublicPageHero';

const AVAILABLE_TODAY = [
  'Registration, login, MFA, and password recovery',
  'Merchant onboarding and KYB verification workflow',
  'Hosted checkout and payment status polling',
  'Merchant dashboard overview and transaction metrics',
  'Transactions list, filters, and event timelines',
  'Payment link generation and management',
  'Refund requests and maker-checker approval queues',
  'Settlements and reconciliation exception queues',
  'Team management, custom roles, and permission gating',
  'Support case ticketing and activity history',
  'Developer API keys and signed webhook management',
];

const NOT_YET_AVAILABLE = [
  'Live money movements (sandbox accounting only)',
  'Direct telecommunications provider API integration (Airtel / TNM pending approval)',
  'Live card acquirer routing (Visa / Mastercard pending approval)',
  'Production automated bank payouts (National Switch approval pending)',
];

export default function SandboxPage() {
  return (
    <main className="overflow-hidden bg-white text-slate-900">
      {/* Hero */}
      <PublicPageHero
        badge="Developers · Sandbox Environment"
        badgeIcon={<FlaskConical className="h-3.5 w-3.5 text-[var(--color-blue-600)]" />}
        title={<>A zero-risk</>}
        titleAccent="sandbox."
        description="Register a merchant account, verify your credentials, and test against the deployed sandbox API. Sandbox transactions are simulated and never move real money."
        backTo="/developers/overview"
        backLabel="Back to Developers"
        heroBgUrl="/hero-bg.jpg"
        actions={
          <>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--color-blue-600)] px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[var(--color-blue-700)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-blue-600)]"
            >
              Create sandbox account <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-neutral-300)] bg-white px-6 py-3 text-sm font-bold text-[var(--color-navy-800)] shadow-sm transition hover:bg-[var(--color-neutral-100)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-blue-600)]"
            >
              Sign in
            </Link>
          </>
        }
      />

      {/* How it works */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex items-center gap-2 text-xs font-bold uppercase tracking-[.3em] text-[#1B4FD8]">
            <FlaskConical className="h-4 w-4" /> How the sandbox works
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
            <p className="text-sm leading-relaxed text-slate-600">
              The deployed sandbox uses the GiantPay backend and its isolated sandbox payment provider. The browser
              does not fall back to mock records in real mode. No real money moves, and no live payout or provider
              operation is inferred from a simulated outcome.
            </p>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Local development can expose test-only quick-fill accounts when mock mode is explicitly enabled. Those
              credentials and the test MFA code are excluded from deployed real-mode builds. Use the{' '}
              <Link to="/login" className="font-semibold text-[#1B4FD8] hover:underline">
                sign-in page
              </Link>{' '}
              {' '}page to authenticate with an account provisioned for the current environment.
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
