import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Boxes, ShieldCheck } from 'lucide-react';

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
              Disbursements{' '}
              <span className="bg-gradient-to-r from-[#1B4FD8] via-blue-500 to-sky-400 bg-clip-text text-transparent">
                API.
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
              Automate payouts to mobile wallets and bank accounts, with idempotent transaction control so a
              retried request can never pay someone twice.
            </p>
          </div>
        </div>
      </section>

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
