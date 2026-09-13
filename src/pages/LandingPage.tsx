import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MARK_SRC } from '@/assets/brand';

// ── Cycling watermark slides ──────────────────────────────────────────────────
const WATERMARKS = [
  // Slide 1 — GP brand mark
  {
    key: 'mark',
    render: () => (
      <img
        src={MARK_SRC}
        alt=""
        className="wm-float w-[65vw] max-w-[520px] select-none"
        style={{ opacity: 0.13, filter: 'drop-shadow(0 20px 60px rgba(26,109,204,0.4))' }}
      />
    ),
  },
  // Slide 2 — Laptop / code terminal
  {
    key: 'laptop',
    render: () => (
      <div className="wm-float select-none" style={{ opacity: 0.13, width: 'min(540px, 72vw)' }}>
        {/* Monitor body */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: '2px solid rgba(255,255,255,0.2)', background: '#0d1117' }}
        >
          {/* Title bar */}
          <div
            className="flex items-center gap-2 px-4 py-2.5"
            style={{ background: 'rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
          >
            <span style={{ width: 11, height: 11, borderRadius: '50%', background: 'rgba(255,96,89,0.7)', display: 'inline-block' }} />
            <span style={{ width: 11, height: 11, borderRadius: '50%', background: 'rgba(255,189,46,0.7)', display: 'inline-block' }} />
            <span style={{ width: 11, height: 11, borderRadius: '50%', background: 'rgba(40,200,64,0.7)', display: 'inline-block' }} />
            <span
              className="font-mono text-white/40"
              style={{ marginLeft: 12, fontSize: 11, letterSpacing: '0.05em' }}
            >
              POST /v1/checkout/sessions
            </span>
            <span
              className="font-mono ml-auto"
              style={{ fontSize: 10, color: 'rgba(40,200,64,0.8)' }}
            >
              201 Created
            </span>
          </div>
          {/* Code body */}
          <pre
            className="font-mono text-blue-200 leading-relaxed px-5 py-4"
            style={{ fontSize: 'clamp(10px, 1.5vw, 13px)', margin: 0 }}
          >
{`{
  "reference": "gp_req_91b7e4c2",
  "amount":    2500000,
  "currency":  "MWK",
  "channels":  ["AIRTEL_MONEY", "CARD"],
  "status":    "INITIATED",
  "checkout_url": "https://pay.giantpay.mw/..."
}`}
          </pre>
        </div>
        {/* Monitor stand */}
        <div className="flex flex-col items-center">
          <div style={{ width: 3, height: 22, background: 'rgba(255,255,255,0.15)' }} />
          <div style={{ width: 80, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.12)' }} />
        </div>
      </div>
    ),
  },
  // Slide 3 — Phone / payment processing
  {
    key: 'phone',
    render: () => (
      <div className="wm-float select-none" style={{ opacity: 0.13 }}>
        {/* Phone shell */}
        <div
          style={{
            width: 'min(200px, 35vw)',
            borderRadius: 32,
            border: '3px solid rgba(255,255,255,0.22)',
            background: 'linear-gradient(160deg, #0f1f3d 0%, #0a1628 100%)',
            overflow: 'hidden',
            boxShadow: '0 0 60px rgba(26,109,204,0.25)',
          }}
        >
          {/* Notch */}
          <div className="flex justify-center pt-2 pb-1">
            <div style={{ width: 60, height: 5, borderRadius: 10, background: 'rgba(255,255,255,0.15)' }} />
          </div>
          {/* Status bar */}
          <div
            className="flex justify-between items-center px-4 pb-2 font-mono text-white/50"
            style={{ fontSize: 9 }}
          >
            <span>9:41</span>
            <span style={{ letterSpacing: '0.15em' }}>•••</span>
          </div>
          {/* Screen content */}
          <div
            className="flex flex-col items-center gap-3 px-4 py-5"
            style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
          >
            {/* App logo pill */}
            <div
              className="font-bold text-white tracking-tight"
              style={{ fontSize: 'clamp(12px, 2.5vw, 17px)' }}
            >
              Giant<span style={{ color: '#c01c28' }}>Pay</span>
            </div>
            <div className="text-white/60" style={{ fontSize: 'clamp(8px, 1.5vw, 11px)' }}>
              Processing payment…
            </div>
            {/* Amount card */}
            <div
              className="w-full text-center font-semibold text-white"
              style={{
                fontSize: 'clamp(10px, 1.8vw, 14px)',
                background: 'rgba(26,109,204,0.25)',
                borderRadius: 10,
                padding: '8px 12px',
                border: '1px solid rgba(26,109,204,0.35)',
              }}
            >
              MWK 25,000.00
            </div>
            {/* Spinner */}
            <div
              style={{
                width: 'clamp(28px, 5vw, 40px)',
                height: 'clamp(28px, 5vw, 40px)',
                borderRadius: '50%',
                border: '3px solid rgba(255,255,255,0.15)',
                borderTopColor: '#1a6dcc',
                animation: 'spin 1.1s linear infinite',
              }}
            />
            {/* Network indicator */}
            <div className="flex items-center gap-1.5">
              <span
                style={{
                  display: 'inline-block',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#34d399',
                  animation: 'pulse 2s ease-in-out infinite',
                }}
              />
              <span className="text-white/50" style={{ fontSize: 8, letterSpacing: '0.05em' }}>
                Airtel Money
              </span>
            </div>
          </div>
          {/* Home indicator */}
          <div className="flex justify-center py-3">
            <div style={{ width: 50, height: 4, borderRadius: 10, background: 'rgba(255,255,255,0.18)' }} />
          </div>
        </div>
      </div>
    ),
  },
];

const BENEFITS = [
  {
    title: 'One integration',
    body: 'Accept configured digital payment methods through a single, unified GiantPay integration.',
    icon: (
      <svg className="h-6 w-6 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    title: 'Clear transaction evidence',
    body: 'Every payment carries a trusted backend status, full event history, and real-time reconciliation state.',
    icon: (
      <svg className="h-6 w-6 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    title: 'Reconciliation built in',
    body: 'Match transactions automatically against provider and settlement records without manual spreadsheets.',
    icon: (
      <svg className="h-6 w-6 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
  },
  {
    title: 'Reporting that holds up',
    body: 'Export transaction, fee, refund, and settlement reports generated by the backend ledger, not the browser.',
    icon: (
      <svg className="h-6 w-6 text-blue-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

const FAQS = [
  {
    q: 'Which payment methods can I accept in Malawi?',
    a: 'Available channels include Airtel Money, TNM Mpamba, Visa & Mastercard, and direct bank transfers via the National Switch. Channels are activated based on your merchant account tier.',
  },
  {
    q: 'How do I get started?',
    a: 'Register an account, complete your KYC/KYB business verification, and test immediately in our full sandbox environment before production activation.',
  },
  {
    q: 'Can I test before going live?',
    a: 'Yes — every merchant receives sandbox API keys and simulated checkout tools to test payment flows, webhooks, and refunds end-to-end.',
  },
  {
    q: 'How are payouts and settlements handled?',
    a: 'GiantPay reconciles incoming payments directly with telecom and bank providers, delivering automated settlement batches to your registered Malawian business bank account.',
  },
];

export default function LandingPage() {
  const [wmIndex, setWmIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setWmIndex((i) => (i + 1) % WATERMARKS.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      {/* ── Hero Section ── */}
      <section
        className="relative overflow-hidden text-white"
        style={{
          background: 'linear-gradient(160deg, #061428 0%, #0B2445 32%, #0d2d5e 65%, #071a38 100%)',
        }}
      >
        {/* Background glow orbs */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle at 40% 40%, rgba(26,109,204,0.22) 0%, transparent 65%)',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -right-32 h-[550px] w-[550px] rounded-full"
          style={{
            background: 'radial-gradient(circle at 60% 60%, rgba(192,28,40,0.18) 0%, transparent 65%)',
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/4 right-1/4 h-[400px] w-[400px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(201,162,39,0.1) 0%, transparent 60%)',
          }}
        />

        {/* Cycling watermark backgrounds */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          {WATERMARKS.map((wm, i) => (
            <div
              key={wm.key}
              className="hero-watermark"
              style={{ opacity: i === wmIndex ? 1 : 0 }}
            >
              {wm.render()}
            </div>
          ))}
        </div>

        <div className="relative z-10 mx-auto max-w-6xl px-4 pt-28 pb-20 sm:px-6 sm:pt-36 sm:pb-24 text-center">

          {/* Eyebrow label */}
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/40">
            Malawi's unified payments platform
          </p>

          {/* Heading */}
          <h1 className="mx-auto max-w-4xl text-3xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl leading-[1.12]">
            Payments built for modern{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #4fa3e8 0%, #c9a227 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Malawian businesses.
            </span>
          </h1>

          {/* Sub-heading */}
          <p className="mx-auto mt-6 max-w-2xl text-sm sm:text-base md:text-lg leading-relaxed text-white/65">
            Accept mobile money, cards, and bank transfers through one integration.
            Built for developers, trusted by merchants.
          </p>

          {/* CTA buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto text-center rounded-xl px-8 py-3.5 text-sm sm:text-base font-semibold text-white transition-all duration-200 active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #1a6dcc 0%, #0e4da6 100%)',
                boxShadow: '0 4px 24px rgba(26,109,204,0.4)',
              }}
            >
              Get started free
            </Link>
            <Link
              to="/developers"
              className="w-full sm:w-auto text-center rounded-xl px-8 py-3.5 text-sm sm:text-base font-semibold text-white/85 border border-white/20 bg-white/5 hover:bg-white/10 backdrop-blur-sm transition-all duration-200"
            >
              View the API docs
            </Link>
          </div>

          {/* Payment method logos */}
          <div className="mt-16 pt-8 border-t border-white/10 flex flex-col items-center gap-4">
            <p className="text-[10px] uppercase font-semibold tracking-[0.2em] text-white/35">
              Designed for local payment integrations
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3" aria-label="Supported payment methods">
              {/* Airtel Money */}
              <div className="flex items-center gap-2 rounded-lg border border-white/12 bg-white/[0.06] px-3 py-2 backdrop-blur-sm">
                <span className="inline-flex h-7 w-14 items-center justify-center rounded bg-white px-1.5">
                  <img src="/brands/airtel-money.svg" alt="Airtel Money" className="h-4 w-auto object-contain" />
                </span>
                <span className="text-xs font-medium text-white/80">Airtel Money</span>
              </div>

              {/* TNM Mpamba */}
              <div className="flex items-center gap-2 rounded-lg border border-white/12 bg-white/[0.06] px-3 py-2 backdrop-blur-sm">
                <span className="inline-flex h-7 w-14 items-center justify-center rounded bg-white px-1.5">
                  <img src="/brands/tnm-mpamba.svg" alt="TNM Mpamba" className="h-4 w-auto object-contain" />
                </span>
                <span className="text-xs font-medium text-white/80">TNM Mpamba</span>
              </div>

              {/* Visa */}
              <div className="flex items-center gap-2 rounded-lg border border-white/12 bg-white/[0.06] px-3 py-2 backdrop-blur-sm">
                <img src="/brands/visa.svg" alt="Visa" className="h-3.5 w-auto object-contain" />
                <span className="text-xs font-medium text-white/80">Visa</span>
              </div>

              {/* Mastercard */}
              <div className="flex items-center gap-2 rounded-lg border border-white/12 bg-white/[0.06] px-3 py-2 backdrop-blur-sm">
                <img src="/brands/mastercard.svg" alt="Mastercard" className="h-4 w-auto object-contain" />
                <span className="text-xs font-medium text-white/80">Mastercard</span>
              </div>

              {/* National Switch */}
              <div className="flex items-center gap-2 rounded-lg border border-white/12 bg-white/[0.06] px-3 py-2 backdrop-blur-sm">
                <svg className="h-4 w-4 text-blue-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="text-xs font-medium text-white/80">National Switch</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How GiantPay Works ── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Simple 3-step setup</p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-navy-900)]">
            How GiantPay works
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-neutral-600)]">
            From registration to live settlements in just three straightforward steps.
          </p>
        </div>

        <ol className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-3">
          {[
            {
              step: '1',
              title: 'Register & verify',
              body: 'Submit your business profile and KYC/KYB registration details for rapid compliance review.',
            },
            {
              step: '2',
              title: 'Integrate & test',
              body: 'Build against our complete sandbox using hosted payment links or REST API keys.',
            },
            {
              step: '3',
              title: 'Go live',
              body: 'Switch to production credentials and receive automated payouts directly to your bank account.',
            },
          ].map((item) => (
            <li
              key={item.step}
              className="group relative rounded-2xl border border-[var(--color-neutral-200)] bg-white p-6 text-center shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md"
            >
              <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-base font-bold text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-200">
                {item.step}
              </span>
              <h3 className="mt-4 text-base font-semibold text-[var(--color-navy-900)]">{item.title}</h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[var(--color-neutral-600)]">{item.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Built for Merchants and Developers ── */}
      <section className="bg-[var(--color-neutral-50)] py-16 sm:py-24 border-y border-[var(--color-neutral-200)]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Enterprise Ready</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-navy-900)]">
              Built for merchants and developers
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-neutral-600)]">
              Engineered with reliability, financial auditability, and ease of integration at its core.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                className="flex items-start gap-4 rounded-2xl border border-[var(--color-neutral-200)] bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50">
                  {b.icon}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[var(--color-navy-900)]">{b.title}</h3>
                  <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-[var(--color-neutral-600)]">{b.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Developer Experience Section ── */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="rounded-3xl border border-[var(--color-neutral-200)] bg-[var(--color-navy-950)] text-white p-6 sm:p-10 lg:p-12 overflow-hidden relative">
          {/* Subtle glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 right-0 h-[350px] w-[350px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(26,109,204,0.2) 0%, transparent 70%)',
            }}
          />

          <div className="relative z-10 grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-lg bg-blue-500/10 border border-blue-400/20 px-3 py-1 text-xs font-semibold text-blue-300 mb-4">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                Developer-First API
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Clean, predictable APIs and webhooks
              </h2>
              <p className="mt-4 text-sm sm:text-base leading-relaxed text-white/70">
                Sandbox and production API keys, webhooks with delivery history, idempotent requests, and documentation with
                cURL, JavaScript/TypeScript and PHP examples — all built around the same trusted-status model the hosted
                checkout uses.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/developers"
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-500 transition-colors"
                >
                  View Developer Docs
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center rounded-xl border border-white/20 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                >
                  Get API Keys
                </Link>
              </div>
            </div>

            {/* Code / API Snippet Preview */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4 sm:p-5 backdrop-blur-md overflow-x-auto">
              <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs text-white/50">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 font-mono text-[11px] text-white/60">POST /v1/checkout/sessions</span>
                </div>
                <span className="font-mono text-[10px] text-emerald-400">201 Created</span>
              </div>
              <pre className="mt-3 font-mono text-xs text-blue-200 leading-relaxed overflow-x-auto">
{`{
  "reference": "gp_req_91b7e4c2",
  "amount": 2500000,
  "currency": "MWK",
  "channels": ["AIRTEL_MONEY", "TNM_MPAMBA", "CARD"],
  "status": "INITIATED",
  "checkout_url": "https://pay.giantpay.mw/checkout/tok_..."
}`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* ── Frequently Asked Questions ── */}
      <section className="border-t border-[var(--color-neutral-200)] py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-navy-900)]">
              Frequently asked questions
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--color-neutral-600)]">
              Everything you need to know about payments, regulatory alignment, and testing.
            </p>
          </div>

          <dl className="flex flex-col gap-4">
            {FAQS.map((faq) => (
              <div
                key={faq.q}
                className="rounded-2xl border border-[var(--color-neutral-200)] bg-white p-5 sm:p-6 shadow-sm"
              >
                <dt className="font-semibold text-sm sm:text-base text-[var(--color-navy-900)]">{faq.q}</dt>
                <dd className="mt-2 text-xs sm:text-sm leading-relaxed text-[var(--color-neutral-600)]">{faq.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}
