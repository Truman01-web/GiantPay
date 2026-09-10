import { Info } from 'lucide-react';

export default function StatusPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
      <Info className="mx-auto h-8 w-8 text-[var(--color-neutral-400)]" aria-hidden="true" />
      <h1 className="mt-3 text-[length:var(--text-h1)] font-semibold text-[var(--color-navy-900)]">System status</h1>
      <p className="mt-2 text-[length:var(--text-body)] text-[var(--color-neutral-600)]">
        A public status page will appear here once GiantPay's status monitoring is configured.
      </p>
    </div>
  );
}
