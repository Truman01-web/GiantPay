import type { ReactNode } from 'react';

export interface MobileDataListProps<T> {
  data: T[];
  getRowKey: (row: T) => string;
  renderItem: (row: T) => { title: ReactNode; subtitle?: ReactNode; trailing?: ReactNode; meta?: ReactNode };
  onItemClick?: (row: T) => void;
}

/** Card-list alternative to DataTable for narrow viewports — shown instead
 * of (not alongside) the table via Tailwind breakpoint visibility on the
 * parent, so dense tables never force whole-page horizontal scroll on
 * mobile. */
export function MobileDataList<T>({ data, getRowKey, renderItem, onItemClick }: MobileDataListProps<T>) {
  return (
    <ul className="divide-y divide-[var(--color-neutral-200)] rounded-[var(--radius-md)] border border-[var(--color-neutral-200)] bg-white">
      {data.map((row) => {
        const { title, subtitle, trailing, meta } = renderItem(row);
        return (
          <li key={getRowKey(row)}>
            <button
              type="button"
              onClick={() => onItemClick?.(row)}
              disabled={!onItemClick}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left disabled:cursor-default"
            >
              <div className="min-w-0">
                <p className="truncate text-[length:var(--text-body)] font-medium text-[var(--color-neutral-900)]">{title}</p>
                {subtitle && <p className="truncate text-[length:var(--text-help)] text-[var(--color-neutral-500)]">{subtitle}</p>}
              </div>
              <div className="shrink-0 text-right">
                {trailing}
                {meta && <div className="mt-0.5">{meta}</div>}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
