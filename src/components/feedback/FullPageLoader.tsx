import { Loader2 } from 'lucide-react';

export function FullPageLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-[var(--color-neutral-500)]">
      <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
      <p className="text-[length:var(--text-label)]">{label}</p>
    </div>
  );
}
