export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-[length:var(--text-h1)] font-semibold text-[var(--color-navy-900)]">Terms of Service</h1>
      <p className="mt-2 text-[length:var(--text-label)] text-[var(--color-neutral-500)]">Placeholder content — replace with GiantPlus's approved terms before launch.</p>
      <div className="prose mt-6 flex flex-col gap-4 text-[length:var(--text-body)] text-[var(--color-neutral-700)]">
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
  );
}
