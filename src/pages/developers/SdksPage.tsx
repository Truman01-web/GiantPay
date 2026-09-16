import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Package } from 'lucide-react';

const SDKS = [
  { lang: 'Node.js / TypeScript', pkg: '@giantpay/node', install: 'npm install @giantpay/node' },
  { lang: 'PHP', pkg: 'giantpay/giantpay-php', install: 'composer require giantpay/giantpay-php' },
  { lang: 'Python', pkg: 'giantpay', install: 'pip install giantpay' },
];

export default function SdksPage() {
  return (
    <main className="overflow-hidden bg-white text-slate-900">
      {/* Hero */}
      <section
        className="relative isolate overflow-hidden pt-24 pb-20 lg:pt-32 lg:pb-28"
        style={{ background: 'linear-gradient(160deg, #061428 0%, #0B2445 40%, #0d2d5e 75%, #071a38 100%)' }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle at 70% 40%, #1B4FD8 0%, transparent 60%)' }}
        />
        <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Link
              to="/developers/overview"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-sm backdrop-blur-sm transition hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Developers
            </Link>
          </div>
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slate-400/30 bg-slate-500/10 px-4 py-1.5 text-xs font-bold text-slate-300">
              Planned
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Official{' '}
              <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-cyan-300 bg-clip-text text-transparent">
                client libraries.
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/70">
              Typed, idiomatic SDKs for the languages Malawian development teams use most — planned to ship once the
              REST API itself is stable, so they never lag behind the contract they wrap.
            </p>
          </div>
        </div>
      </section>

      {/* Language cards */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex items-center gap-2 text-xs font-bold uppercase tracking-[.3em] text-[#1B4FD8]">
            <Package className="h-4 w-4" /> Planned Libraries
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {SDKS.map(({ lang, pkg, install }) => (
              <div key={lang} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">{lang}</h3>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-bold text-slate-500">
                    Planned
                  </span>
                </div>
                <p className="mt-2 font-mono text-xs text-slate-400">{pkg}</p>
                <div className="mt-4 overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
                  <pre className="overflow-x-auto p-3 font-mono text-xs text-slate-300">
                    <code>{install}</code>
                  </pre>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-8 text-sm text-slate-500">
            None of the packages above have been published yet — the names shown are the intended package
            identifiers, not live install commands.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-100 bg-slate-50 py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">Integrate with the REST API directly</h2>
          <p className="mt-3 text-slate-500">Until the SDKs ship, the plain REST API is the way to integrate — see the documentation for conventions and examples.</p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link to="/developers/api-documentation" className="inline-flex items-center gap-2 rounded-xl bg-[#1B4FD8] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#1744b9]">
              API Documentation <ArrowRight className="h-4 w-4" />
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
