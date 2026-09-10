import { useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { AlertVariant } from './Alert';

const CLASSES: Record<AlertVariant, string> = {
  info: 'bg-[var(--color-navy-950)] text-white',
  success: 'bg-[var(--color-green-700)] text-white',
  warning: 'bg-[var(--color-amber-600)] text-white',
  danger: 'bg-[var(--color-red-600)] text-white',
};

export function Banner({
  variant = 'info',
  dismissible,
  children,
}: {
  variant?: AlertVariant;
  dismissible?: boolean;
  children: React.ReactNode;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div role="status" className={cn('flex items-center justify-between gap-4 px-4 py-2.5 text-[length:var(--text-label)]', CLASSES[variant])}>
      <div>{children}</div>
      {dismissible && (
        <button type="button" onClick={() => setDismissed(true)} aria-label="Dismiss" className="shrink-0 rounded p-1 hover:bg-white/10">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
