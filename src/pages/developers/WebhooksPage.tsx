import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Webhook, KeyRound, RotateCcw } from 'lucide-react';

const EVENTS = [
  { name: 'checkout.completed', body: 'A checkout session was paid successfully.' },
  { name: 'checkout.failed', body: 'A checkout session failed or the customer abandoned it.' },
  { name: 'refund.completed', body: 'A refund was issued back to the original payment method.' },
  { name: 'payout.completed', body: 'A disbursement was successfully paid out.' },
  { name: 'payout.failed', body: 'A disbursement failed and needs attention.' },
  { name: 'reconciliation.exception_raised', body: 'A settlement mismatch was detected and needs review.' },
];

export default function WebhooksPage() {
  return (
    <main className="overflow-hidden bg-white text-slate-900">
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-white pt-24 pb-20 lg:pt-32 lg:pb-28">
        <div aria-hidden className="pointer-events-none absolute inset-0 select-none overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=2000&q=80"
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
              Signed{' '}
              <span className="bg-gradient-to-r from-[#1B4FD8] via-blue-500 to-sky-400 bg-clip-text text-transparent">
                webhooks.
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
              Get notified the moment a payment, refund, or payout changes state — signed with HMAC-SHA256, with a
              full delivery history and automatic retries on failure.
            </p>
          </div>
        </div>
      </section>

      {/* Event types */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex items-center gap-2 text-xs font-bold uppercase tracking-[.3em] text-[#1B4FD8]">
            <Webhook className="h-4 w-4" /> Planned Event Types
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            {EVENTS.map(({ name, body }, i) => (
              <div
                key={name}
                className={['flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:gap-6', i % 2 === 0 ? 'bg-white' : 'bg-slate-50'].join(' ')}
              >
                <span className="shrink-0 rounded-md bg-slate-900 px-2.5 py-1 font-mono text-[11px] font-bold text-white sm:w-64">
                  {name}
                </span>
                <p className="text-sm text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Signature verification */}
      <section className="bg-slate-50 py-20 lg:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#1B4FD8]/15 bg-[#1B4FD8]/[.06]">
                <KeyRound className="h-6 w-6 text-[#1B4FD8]" />
              </div>
              <h2 className="mt-5 text-2xl font-extrabold text-slate-900">Verifying signatures</h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-600">
                Every delivery will include a <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-800">Giantpay-Signature</code> header —
                an HMAC-SHA256 hash of the raw request body, signed with your webhook&apos;s signing secret. Recompute
                the hash yourself and compare it before trusting the payload.
              </p>
              <div className="mt-6 flex h-12 w-12 items-center justify-center rounded-xl border border-[#1B4FD8]/15 bg-[#1B4FD8]/[.06]">
                <RotateCcw className="h-6 w-6 text-[#1B4FD8]" />
              </div>
              <h2 className="mt-5 text-2xl font-extrabold text-slate-900">Retries & delivery history</h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-600">
                A failed delivery (non-2xx response, or a timeout) will be retried on a backoff schedule, and every
                attempt — success or failure — will be visible in the merchant dashboard&apos;s delivery history.
              </p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/50 px-4 py-3">
                <span className="flex gap-1.5">
                  <i className="h-3 w-3 rounded-full bg-red-500/80" />
                  <i className="h-3 w-3 rounded-full bg-yellow-500/80" />
                  <i className="h-3 w-3 rounded-full bg-green-500/80" />
                </span>
                <span className="font-mono text-xs text-slate-500">Node.js</span>
              </div>
              <pre className="overflow-x-auto p-5 text-xs leading-7 text-slate-300 sm:text-sm">
                <code>{`import crypto from "node:crypto";

function isValid(rawBody, signature, secret) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}`}</code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-100 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Need to know when a payment lands?</h2>
          <p className="mt-3 text-slate-500">Until webhooks ship, poll the trusted payment-status endpoint the hosted checkout already uses.</p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link to="/developers/api-documentation" className="inline-flex items-center gap-2 rounded-xl bg-[#1B4FD8] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#1744b9]">
              API Documentation <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/developers/sandbox" className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50">
              Explore the sandbox
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
