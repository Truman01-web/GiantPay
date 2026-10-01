import { Package } from 'lucide-react';
import { PublicPageHero } from '@/components/marketing/PublicPageHero';

const SDKS = [
  { lang: 'Node.js / TypeScript', pkg: '@giantpay/node', install: 'npm install @giantpay/node' },
  { lang: 'PHP', pkg: 'giantpay/giantpay-php', install: 'composer require giantpay/giantpay-php' },
  { lang: 'Python', pkg: 'giantpay', install: 'pip install giantpay' },
];

export default function SdksPage() {
  return (
    <main className="overflow-hidden bg-white text-slate-900">
      {/* Hero */}
      <PublicPageHero
        badge="Developers · Client Libraries (Planned)"
        badgeIcon={<Package className="h-3.5 w-3.5 text-[var(--color-blue-600)]" />}
        title={<>Official</>}
        titleAccent="client libraries."
        description="Typed, idiomatic SDKs for the languages Malawian development teams use most — planned to ship once the REST API itself is stable, so they never lag behind the contract they wrap."
        backTo="/developers/overview"
        backLabel="Back to Developers"
        heroBgUrl="/hero-bg.jpg"
      />

      {/* Language cards */}
      <section className="py-20 lg:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 flex items-center gap-2 text-xs font-bold uppercase tracking-[.3em] text-[#1B4FD8]">
            <Package className="h-4 w-4" /> Planned Libraries
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {SDKS.map(({ lang, pkg, install }) => (
              <div key={lang} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900">{lang}</h3>
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
