import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Boxes, Send, Webhook, Package, FlaskConical, Rocket, UserRoundCheck, Code2 } from 'lucide-react';

const RESOURCES = [
  {
    icon: BookOpen,
    title: 'API Documentation',
    body: 'Base URL, authentication, request/response conventions, and error handling.',
    to: '/developers/api-documentation',
  },
  {
    icon: Send,
    title: 'Collections API',
    body: 'Initiate and manage programmatic payments — checkout sessions, payment links, refunds.',
    to: '/developers/collections-api',
  },
  {
    icon: Boxes,
    title: 'Disbursements API',
    body: 'Automate payouts to mobile wallets and bank accounts with idempotent transaction control.',
    to: '/developers/disbursements-api',
  },
  {
    icon: Webhook,
    title: 'Webhooks',
    body: 'Signed HMAC event delivery with retry behaviour and delivery history logs.',
    to: '/developers/webhooks-api',
  },
  {
    icon: Package,
    title: 'SDKs',
    body: 'Official client libraries for Node.js/TypeScript, PHP, and Python.',
    to: '/developers/sdks',
  },
  {
    icon: FlaskConical,
    title: 'Sandbox',
    body: 'A zero-risk test environment you can use today — no waitlist, no approval needed.',
    to: '/developers/sandbox',
  },
];

const STEPS = [
  {
    step: '1',
    title: 'Create a sandbox account',
    body: 'Register a merchant account and get instant access to the sandbox — no waiting on manual review.',
    icon: UserRoundCheck,
  },
  {
    step: '2',
    title: 'Explore the merchant dashboard',
    body: 'Test onboarding, payment links, refunds, settlements and reconciliation against realistic, deterministic sandbox data.',
    icon: FlaskConical,
  },
  {
    step: '3',
    title: 'Integrate the API',
    body: 'Once the REST API and SDKs ship, wire your app up to GiantPay using the same sandbox-first workflow.',
    icon: Rocket,
  },
];

export default function DeveloperOverviewPage() {
  return (
    <main className="overflow-hidden bg-white text-slate-900">
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-white pt-24 pb-20 lg:pt-32 lg:pb-28">
        <div aria-hidden className="pointer-events-none absolute inset-0 select-none overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=2000&q=80"
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
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur-sm transition hover:bg-white hover:text-[#1B4FD8]"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Link>
          </div>
          <div className="max-w-3xl">
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Build on{' '}
              <span className="bg-gradient-to-r from-[#1B4FD8] via-blue-500 to-sky-400 bg-clip-text text-transparent">
                GiantPay.
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">
              A unified REST API for accepting mobile money, cards, and bank transfers across Malawi — built
              sandbox-first, so you can start testing today, before you write a single line of integration code.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-[#1B4FD8] px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-[#1744b9]"
              >
                Create sandbox account <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/developers/sandbox"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Explore the sandbox
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quickstart */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[.3em] text-[#1B4FD8]">Quickstart</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Three steps to your first integration</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map(({ step, title, body, icon: Icon }) => (
              <div key={step} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition hover:border-[#1B4FD8]/30 hover:shadow-md">
                <div className="flex items-center justify-between">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1B4FD8]/10 text-base font-extrabold text-[#1B4FD8]">
                    {step}
                  </span>
                  <Icon className="h-5 w-5 text-slate-300" />
                </div>
                <h3 className="mt-5 text-base font-bold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Resource grid */}
      <section className="bg-slate-50 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="mb-3 text-xs font-bold uppercase tracking-[.3em] text-[#1B4FD8]">Developer Resources</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Everything you need to integrate</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {RESOURCES.map(({ icon: Icon, title, body, to }) => (
              <Link
                key={title}
                to={to}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-[#1B4FD8]/30 hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#1B4FD8]/15 bg-[#1B4FD8]/[.06]">
                  <Icon className="h-5 w-5 text-[#1B4FD8]" />
                </div>
                <h3 className="mt-4 flex items-center gap-1.5 text-base font-bold text-slate-900">
                  {title}
                  <ArrowRight className="h-3.5 w-3.5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-[#1B4FD8]" />
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{body}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Code preview */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="grid overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 lg:grid-cols-2">
            <div className="p-10 lg:p-12">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-xs font-semibold text-slate-400">
                <Code2 className="h-4 w-4 text-blue-400" /> Designed API shape
              </div>
              <h2 className="mt-6 text-2xl font-extrabold leading-tight text-white sm:text-3xl">
                One clean, predictable API
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                Every endpoint returns the same trusted-status model the hosted checkout already uses today, so a
                payment&apos;s state is never ambiguous. This is the shape the collections API is being built
                to — not yet callable, but this is what integrating against it will look like.
              </p>
            </div>
            <div className="flex items-center p-6 lg:p-10">
              <div className="w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/50 px-4 py-3">
                  <span className="flex gap-1.5">
                    <i className="h-3 w-3 rounded-full bg-red-500/80" />
                    <i className="h-3 w-3 rounded-full bg-yellow-500/80" />
                    <i className="h-3 w-3 rounded-full bg-green-500/80" />
                  </span>
                  <span className="font-mono text-xs text-slate-500">POST /v1/checkout/sessions</span>
                </div>
                <pre className="overflow-x-auto p-5 text-sm leading-7 text-slate-300">
                  <code>
                    {'{\n'}
                    {'  '}<span className="text-violet-400">&quot;reference&quot;</span>: <span className="text-green-500">&quot;gp_req_91b7e4c2&quot;</span>,{'\n'}
                    {'  '}<span className="text-violet-400">&quot;amount&quot;</span>: <span className="text-red-400">2500000</span>,{'\n'}
                    {'  '}<span className="text-violet-400">&quot;currency&quot;</span>: <span className="text-green-500">&quot;MWK&quot;</span>,{'\n'}
                    {'  '}<span className="text-violet-400">&quot;status&quot;</span>: <span className="text-green-500">&quot;INITIATED&quot;</span>{'\n'}
                    {'}'}
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
