import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div>
      <section className="relative overflow-hidden text-white pt-28 pb-14 sm:pt-36 sm:pb-16">
        {/* Background image — contract/legal context */}
        <img
          src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=1920&q=80"
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
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-300">Legal &amp; Governance</div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-white">Terms of Service</h1>
          <p className="mt-2 text-sm text-white/60">
            Placeholder content — replace with GiantPlus&apos;s approved terms before launch.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-[var(--color-neutral-200)] bg-white p-6 sm:p-8 shadow-sm">
          <div className="prose flex flex-col gap-4 text-[length:var(--text-body)] text-[var(--color-neutral-700)]">
            <p>
              Use of GiantPay is governed by an agreement between the merchant and GiantPlus, covering onboarding
              requirements, fees, settlement, dispute handling and acceptable use.
            </p>
            <p>
              This page is a structural placeholder in the frontend build. The final terms must be supplied and approved
              by GiantPlus legal/compliance before production release.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
