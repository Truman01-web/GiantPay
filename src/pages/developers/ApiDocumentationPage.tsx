import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, KeyRound, Globe2, ShieldCheck, RefreshCw, AlertOctagon } from 'lucide-react';

const CONVENTIONS = [
  {
    icon: Globe2,
    title: 'Base URL & versioning',
    body: 'All requests will be made to a single versioned base URL (e.g. https://api.giantpay.mw/v1), matching the same /v1 convention the hosted checkout already uses internally.',
  },
  {
    icon: KeyRound,
    title: 'Authentication',
    body: 'Requests are authenticated with an API key issued from the merchant dashboard, sent as a Bearer token in the Authorization header. Keys are shown once, at creation — never re-displayed or logged.',
  },
  {
    icon: RefreshCw,
    title: 'Idempotency',
    body: 'Every financial-creation call (payments, refunds, payouts) accepts a client-generated Idempotency-Key header, so a retried request after a network failure can never double-charge or double-pay.',
  },
  {
    icon: AlertOctagon,
    title: 'Error handling',
    body: 'Every non-2xx response returns a consistent JSON error shape — { code, message, fields?, requestId } — so your integration branches on a typed error code, never a raw status line.',
  },
];

const ERROR_CODES = [
  { code: '400', name: 'validation_error', body: 'The request body failed schema validation — see the fields array for details.' },
  { code: '401', name: 'unauthorized', body: 'The API key is missing, invalid, or has been revoked.' },
  { code: '403', name: 'forbidden', body: 'The API key is valid but lacks permission for this operation.' },
  { code: '404', name: 'not_found', body: 'The requested resource does not exist or does not belong to your account.' },
  { code: '409', name: 'idempotency_conflict', body: 'The Idempotency-Key was reused with a different request body.' },
  { code: '429', name: 'rate_limited', body: 'Too many requests — back off and retry using the Retry-After header.' },
];

export default function ApiDocumentationPage() {
  return (
    <main className="overflow-hidden bg-white text-slate-900">
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-white pt-24 pb-20 lg:pt-32 lg:pb-28">
        <div aria-hidden className="pointer-events-none absolute inset-0 select-none overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=2000&q=80"
            onError={(e) => {
              e.currentTarget.src = '/hero-bg.jpg';
            }}
            alt=""
            className="h-full w-full object-cover object-[75%_center] opacity-35 sm:opacity-45"
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
              API{' '}
              <span className="bg-gradient-to-r from-[#1B4FD8] via-blue-500 to-sky-400 bg-clip-text text-transparent">
                documentation.
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
              The full REST API reference — endpoints, request/response schemas, and copy-pasteable cURL &
              TypeScript examples — is being finalised alongside the API itself. Here&apos;s the shape it&apos;s
              being built to.
            </p>
          </div>
        </div>
      </section>

      {/* Conventions */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[.3em] text-[#1B4FD8]">Core Conventions</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">How the API will work</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {CONVENTIONS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition hover:border-[#1B4FD8]/30 hover:shadow-md">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#1B4FD8]/15 bg-[#1B4FD8]/[.06]">
                  <Icon className="h-6 w-6 text-[#1B4FD8]" />
                </div>
                <h3 className="mt-5 text-base font-bold text-slate-900">{title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Example request */}
      <section className="bg-slate-50 py-20 lg:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[.3em] text-[#1B4FD8]">Example Request</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Illustrative, not yet callable</h2>
            <p className="mt-4 text-sm text-slate-500">
              This shows the intended shape of a checkout-session creation call — the same trusted-status model
              already used by the hosted checkout.
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/50 px-4 py-3">
              <span className="flex gap-1.5">
                <i className="h-3 w-3 rounded-full bg-red-500/80" />
                <i className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <i className="h-3 w-3 rounded-full bg-green-500/80" />
              </span>
              <span className="font-mono text-xs text-slate-500">cURL</span>
            </div>
            <pre className="overflow-x-auto p-5 text-xs leading-7 text-slate-300 sm:text-sm">
              <code>{`curl https://api.giantpay.mw/v1/checkout/sessions \\
  -H "Authorization: Bearer $GIANTPAY_SECRET_KEY" \\
  -H "Idempotency-Key: 8f14e45f-ceea-4d0c" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 2500000,
    "currency": "MWK",
    "reference": "order_91b7e4c2"
  }'`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Error codes */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex items-center gap-2 text-xs font-bold uppercase tracking-[.3em] text-[#1B4FD8]">
            <ShieldCheck className="h-4 w-4" /> Error Codes
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            {ERROR_CODES.map(({ code, name, body }, i) => (
              <div
                key={code}
                className={['flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-start sm:gap-6', i % 2 === 0 ? 'bg-white' : 'bg-slate-50'].join(' ')}
              >
                <div className="flex shrink-0 items-center gap-2 sm:w-40">
                  <span className="rounded-md bg-slate-900 px-2 py-0.5 font-mono text-xs font-bold text-white">{code}</span>
                  <span className="font-mono text-xs text-slate-500">{name}</span>
                </div>
                <p className="text-sm text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-100 bg-slate-50 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Want to test the platform today?</h2>
          <p className="mt-3 text-slate-500">The REST API isn&apos;t callable yet, but the merchant dashboard sandbox already is.</p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link to="/developers/sandbox" className="inline-flex items-center gap-2 rounded-xl bg-[#1B4FD8] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#1744b9]">
              Explore the sandbox <ArrowRight className="h-4 w-4" />
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
