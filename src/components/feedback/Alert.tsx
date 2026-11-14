import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

const CONFIG: Record<AlertVariant, { icon: typeof Info; classes: string }> = {
  info: { icon: Info, classes: 'bg-[var(--color-blue-50)] border-[var(--color-blue-300)] text-[var(--color-blue-600)]' },
  success: { icon: CheckCircle2, classes: 'bg-[var(--color-green-50)] border-[var(--color-green-600)] text-[var(--color-green-700)]' },
  warning: { icon: AlertTriangle, classes: 'bg-[var(--color-amber-50)] border-[var(--color-amber-600)] text-[var(--color-amber-700)]' },
  danger: { icon: XCircle, classes: 'bg-[var(--color-red-50)] border-[var(--color-red-600)] text-[var(--color-red-700)]' },
};

export function Alert({ variant = 'info', title, className, children }: { variant?: AlertVariant; title?: string; className?: string; children: ReactNode }) {
  const { icon: Icon, classes } = CONFIG[variant];
  return (
    <div role={variant === 'danger' || variant === 'warning' ? 'alert' : 'status'} className={cn('flex gap-3 rounded-[var(--radius-md)] border-l-4 p-4', classes, className)}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div className="text-[length:var(--text-body)] text-[var(--color-neutral-900)]">
        {title && <p className="font-semibold">{title}</p>}
        <div className={title ? 'mt-0.5' : undefined}>{children}</div>
      </div>
    </div>
  );
}
