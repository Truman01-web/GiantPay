import { useEffect } from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { useToastStore } from './toastStore';
import { cn } from '@/lib/cn';

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const VARIANT_STYLES = {
  success: 'border-l-4 border-l-[var(--color-green-600)]',
  error: 'border-l-4 border-l-[var(--color-red-600)]',
  info: 'border-l-4 border-l-[var(--color-blue-500)]',
};

const ICON_COLOR = {
  success: 'text-[var(--color-green-600)]',
  error: 'text-[var(--color-red-600)]',
  info: 'text-[var(--color-blue-600)]',
};

function ToastRow({ id, variant, title, description }: { id: string; variant: keyof typeof ICONS; title: string; description?: string }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const Icon = ICONS[variant];

  useEffect(() => {
    const timer = setTimeout(() => dismiss(id), 6000);
    return () => clearTimeout(timer);
  }, [id, dismiss]);

  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-3 rounded-md bg-white p-4 shadow-[var(--shadow-popover)]',
        VARIANT_STYLES[variant],
      )}
    >
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', ICON_COLOR[variant])} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-[length:var(--text-body)] font-medium text-[var(--color-neutral-900)]">{title}</p>
        {description && <p className="mt-0.5 text-[length:var(--text-help)] text-[var(--color-neutral-600)]">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => dismiss(id)}
        aria-label="Dismiss notification"
        className="shrink-0 rounded p-1 text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-100)]"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[200] flex flex-col items-end gap-2 p-4 sm:inset-x-auto sm:right-0"
    >
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto w-full max-w-sm">
          <ToastRow {...t} />
        </div>
      ))}
    </div>
  );
}
