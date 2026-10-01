import { Boxes } from 'lucide-react';
import { PublicPageHero } from '@/components/marketing/PublicPageHero';

const ENDPOINTS = [
  { method: 'POST', path: '/v1/payouts', body: 'Create a single payout to a mobile wallet or bank account.' },
  { method: 'POST', path: '/v1/payouts/batches', body: 'Submit a batch of payouts for bulk disbursement.' },
  { method: 'GET', path: '/v1/payouts/{id}', body: 'Retrieve the trusted status of a single payout.' },
  { method: 'GET', path: '/v1/payouts/batches/{id}', body: 'Retrieve a batch and the per-payout outcome of each line.' },
];

const METHOD_COLOR: Record<string, string> = {
  GET: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  POST: 'bg-blue-50 text-[#1B4FD8] border-blue-200',
};

export default function DisbursementsApiPage() {
  return (
    <main className="overflow-hidden bg-white text-slate-900">
      {/* Hero */}
      <PublicPageHero
        badge="Developers · Disbursements API"
        badgeIcon={<Boxes className="h-3.5 w-3.5 text-[var(--color-blue-600)]" />}
        title={<>Disbursements</>}
        titleAccent="API."
        description="Automate payouts to mobile wallets and bank accounts, with idempotent transaction control so a retried request can never pay someone twice."
        backTo="/developers/overview"
        backLabel="Back to Developers"
        heroBgUrl="/hero-bg.jpg"
      />

      {/* Planned endpoints */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex items-center gap-2 text-xs font-bold uppercase tracking-[.3em] text-[#1B4FD8]">
            <Boxes className="h-4 w-4" /> Planned Endpoints
          </div>
          <p className="mb-8 text-sm text-slate-500">
            Not callable yet. Disbursements depend on the same real backend as collections, plus completed provider
            and regulatory onboarding for outbound payouts — see the roadmap on{' '}
            <Link to="/company/compliance" className="font-semibold text-[#1B4FD8] hover:underline">
              Compliance
            </Link>.
          </p>
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            {ENDPOINTS.map(({ method, path, body }, i) => (
              <div
                key={path}
                className={['flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:gap-6', i % 2 === 0 ? 'bg-white' : 'bg-slate-50'].join(' ')}
              >
                <div className="flex shrink-0 items-center gap-3 sm:w-72">
                  <span className={['rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold', METHOD_COLOR[method]].join(' ')}>
                    {method}
                  </span>
                  <span className="font-mono text-xs text-slate-700">{path}</span>
                </div>
                <p className="text-sm text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Idempotency explainer */}
      <section className="bg-slate-50 py-20 lg:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#1B4FD8]/15 bg-[#1B4FD8]/[.06]">
              <ShieldCheck className="h-6 w-6 text-[#1B4FD8]" />
            </div>
            <h2 className="mt-5 text-2xl font-extrabold text-slate-900">Idempotent by design</h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Every payout-creation call will require a client-generated <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-800">Idempotency-Key</code> header.
              If your network call times out and you retry with the same key, the API returns the original payout&apos;s
              result instead of creating a duplicate — the same pattern already used for refunds and payment links.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-100 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Track settlements in the sandbox today</h2>
          <p className="mt-3 text-slate-500">Settlement batches and reconciliation reports are already testable against your sandbox transactions.</p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link to="/developers/sandbox" className="inline-flex items-center gap-2 rounded-xl bg-[#1B4FD8] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#1744b9]">
              Explore the sandbox <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/developers/collections-api" className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
              Collections API
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
