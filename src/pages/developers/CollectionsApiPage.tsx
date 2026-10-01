import { Send } from 'lucide-react';
import { PublicPageHero } from '@/components/marketing/PublicPageHero';

const ENDPOINTS = [
  { method: 'POST', path: '/v1/checkout/sessions', body: 'Create a hosted checkout session for a one-off payment.' },
  { method: 'GET', path: '/v1/checkout/sessions/{id}', body: 'Retrieve the trusted status of a checkout session.' },
  { method: 'POST', path: '/v1/payment-links', body: 'Create a shareable, reusable or single-use payment link.' },
  { method: 'GET', path: '/v1/payment-links/{id}', body: 'Retrieve a payment link and its collected-payment history.' },
  { method: 'POST', path: '/v1/refunds', body: 'Refund a completed payment, fully or partially.' },
  { method: 'GET', path: '/v1/transactions/{id}', body: 'Retrieve a single transaction with its full event timeline.' },
];

const METHOD_COLOR: Record<string, string> = {
  GET: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  POST: 'bg-blue-50 text-[#1B4FD8] border-blue-200',
};

export default function CollectionsApiPage() {
  return (
    <main className="overflow-hidden bg-white text-slate-900">
      {/* Hero */}
      <PublicPageHero
        badge="Developers · Collections API"
        badgeIcon={<Send className="h-3.5 w-3.5 text-[var(--color-blue-600)]" />}
        title={<>Collections</>}
        titleAccent="API."
        description="Initiate and manage programmatic payments — checkout sessions, payment links, and refunds — directly from your backend, without a customer ever touching the merchant dashboard."
        backTo="/developers/overview"
        backLabel="Back to Developers"
        heroBgUrl="/hero-bg.jpg"
      />

      {/* Planned endpoints */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex items-center gap-2 text-xs font-bold uppercase tracking-[.3em] text-[#1B4FD8]">
            <Send className="h-4 w-4" /> Planned Endpoints
          </div>
          <p className="mb-8 text-sm text-slate-500">
            None of these are callable yet — every status enum and field here is modelled from the product spec and
            the same trusted-status pattern the hosted checkout already implements, not a verified backend contract.
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

      {/* Example schema */}
      <section className="bg-slate-50 py-20 lg:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[.3em] text-[#1B4FD8]">Designed Response Shape</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">A checkout session, in full</h2>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/50 px-4 py-3">
              <span className="flex gap-1.5">
                <i className="h-3 w-3 rounded-full bg-red-500/80" />
                <i className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <i className="h-3 w-3 rounded-full bg-green-500/80" />
              </span>
              <span className="font-mono text-xs text-slate-500">200 OK</span>
            </div>
            <pre className="overflow-x-auto p-5 text-xs leading-7 text-slate-300 sm:text-sm">
              <code>{`{
  "id": "cs_91b7e4c2",
  "reference": "order_91b7e4c2",
  "amount": 2500000,
  "currency": "MWK",
  "status": "COMPLETED",
  "channel": "AIRTEL_MONEY",
  "checkout_url": "https://pay.giantpay.mw/checkout/tok_...",
  "created_at": "2026-09-16T09:12:04Z",
  "completed_at": "2026-09-16T09:13:41Z"
}`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-100 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">See collections in action today</h2>
          <p className="mt-3 text-slate-500">The hosted checkout and payment links already work end-to-end in the sandbox.</p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link to="/developers/sandbox" className="inline-flex items-center gap-2 rounded-xl bg-[#1B4FD8] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#1744b9]">
              Explore the sandbox <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/developers/disbursements-api" className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
              Disbursements API
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
