import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      {icon && <div className="text-[var(--color-neutral-400)]">{icon}</div>}
      <div className="max-w-sm">
        <p className="text-[length:var(--text-h4)] font-semibold text-[var(--color-navy-900)]">{title}</p>
        {description && <p className="mt-1 text-[length:var(--text-body)] text-[var(--color-neutral-600)]">{description}</p>}
      </div>
      {action && (
        <Button variant="secondary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
