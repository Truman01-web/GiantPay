import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';

export interface StatCardProps {
  label?: string;
  title?: string;
  value: ReactNode;
  subtitle?: string;
  trend?: { direction: 'up' | 'down' | 'flat'; label: string };
  icon?: ReactNode;
  className?: string;
}

export function StatCard({ label, title, value, subtitle, trend, icon, className }: StatCardProps) {
  const displayLabel = label ?? title ?? '';
  return (
    <Card className={cn('p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[length:var(--text-label)] font-medium text-[var(--color-neutral-600)]">{displayLabel}</p>
        {icon && <div className="text-[var(--color-blue-600)]">{icon}</div>}
      </div>
      <div className="mt-2 text-[length:var(--text-h2)] font-semibold text-[var(--color-navy-900)]">{value}</div>
      {trend && (
        <p
          className={cn(
            'mt-1 text-[length:var(--text-help)]',
            trend.direction === 'up' && 'text-[var(--color-green-700)]',
            trend.direction === 'down' && 'text-[var(--color-red-600)]',
            trend.direction === 'flat' && 'text-[var(--color-neutral-500)]',
          )}
        >
          {trend.label}
        </p>
      )}
      {!trend && subtitle && (
        <p className="mt-1 text-[length:var(--text-help)] text-[var(--color-neutral-500)]">{subtitle}</p>
      )}
    </Card>
  );
}
