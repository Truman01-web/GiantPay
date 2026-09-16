import { Link } from 'react-router-dom';
import { ArrowLeft, Info } from 'lucide-react';

export default function StatusPage() {
  return (
    <div>
      <section className="relative overflow-hidden text-white pt-28 pb-14 sm:pt-36 sm:pb-16">
        {/* Background image — server/monitoring context */}
        <img
          src="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1920&q=80"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-[#061428]/85" />
        <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6">
          <div className="mb-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white shadow-sm backdrop-blur-sm transition hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Operational Telemetry</span>
          </div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">System Status</h1>
          <p className="mt-2 text-sm text-white/60">
            Status of GiantPay's sandbox APIs and core platform services.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <div className="rounded-2xl border border-[var(--color-neutral-200)] bg-white p-8 shadow-sm">
          <Info className="mx-auto h-8 w-8 text-blue-600" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-bold text-[var(--color-navy-900)]">Sandbox &amp; Core Services Active</h2>
          <p className="mt-2 text-sm text-[var(--color-neutral-600)]">
            A comprehensive public status dashboard with component uptime graphs will appear here once live provider monitoring is configured.
          </p>
        </div>
      </div>
    </div>
  );
}
