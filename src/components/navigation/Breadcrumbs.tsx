import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-1">
      <ol className="flex flex-wrap items-center gap-1.5 text-[length:var(--text-label)] text-[var(--color-neutral-500)]">
        {items.map((item, i) => (
          <Fragment key={item.label}>
            {i > 0 && <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
            <li>
              {item.to ? (
                <Link to={item.to} className="hover:text-[var(--color-blue-600)] hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span aria-current="page" className="text-[var(--color-neutral-700)]">
                  {item.label}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
