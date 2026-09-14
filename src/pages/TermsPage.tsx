export default function TermsPage() {
  return (
    <div>
      <section
        className="relative overflow-hidden text-white pt-28 pb-14 sm:pt-36 sm:pb-16"
        style={{
          background: 'linear-gradient(160deg, #061428 0%, #0B2445 40%, #0d2d5e 75%, #071a38 100%)',
        }}
      >
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-blue-300">Legal & Governance</div>
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
