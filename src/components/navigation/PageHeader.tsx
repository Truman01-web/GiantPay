import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: ReactNode;
  actions?: ReactNode;
  action?: ReactNode;
  children?: ReactNode;
}

export function PageHeader({ title, description, breadcrumbs, actions, action, children }: PageHeaderProps) {
  const headerActions = actions ?? action ?? children;
  return (
    <div className="mb-6 flex flex-col gap-4 border-b border-[var(--color-neutral-200)] pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {breadcrumbs}
        <h1 className="text-[length:var(--text-h1)] font-semibold text-[var(--color-navy-900)]">{title}</h1>
        {description && <p className="mt-1 text-[length:var(--text-body)] text-[var(--color-neutral-600)]">{description}</p>}
      </div>
      {headerActions && <div className="flex shrink-0 items-center gap-2">{headerActions}</div>}
    </div>
  );
}
