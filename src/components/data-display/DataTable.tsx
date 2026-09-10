import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { SkeletonTable } from '@/components/feedback/Skeleton';
import { EmptyState } from '@/components/feedback/EmptyState';

export interface DataTableColumn<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  /** Column is hidden below this breakpoint to avoid whole-page horizontal
   * scroll on dense tables — the remaining columns stay usable. */
  hideBelow?: 'sm' | 'md' | 'lg';
  numeric?: boolean;
}

export interface DataTableProps<T> {
  caption: string;
  columns: DataTableColumn<T>[];
  data: T[];
  getRowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}

const HIDE_CLASSES: Record<NonNullable<DataTableColumn<unknown>['hideBelow']>, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
};

export function DataTable<T>({
  caption,
  columns,
  data,
  getRowKey,
  onRowClick,
  loading,
  emptyTitle = 'Nothing to show yet',
  emptyDescription,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="rounded-[var(--radius-md)] border border-[var(--color-neutral-200)] bg-white">
        <SkeletonTable columns={columns.length} />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="rounded-[var(--radius-md)] border border-[var(--color-neutral-200)] bg-white">
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-neutral-200)] bg-white">
      <table className="w-full min-w-[640px] border-collapse text-left">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)]">
            {columns.map((col) => (
              <th
                key={col.id}
                scope="col"
                className={cn(
                  'px-4 py-3 text-[length:var(--text-label)] font-semibold text-[var(--color-neutral-600)]',
                  col.numeric && 'text-right',
                  col.hideBelow && HIDE_CLASSES[col.hideBelow],
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={getRowKey(row)}
              tabIndex={onRowClick ? 0 : undefined}
              role={onRowClick ? 'button' : undefined}
              onClick={() => onRowClick?.(row)}
              onKeyDown={(e) => {
                if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onRowClick(row);
                }
              }}
              className={cn(
                'border-b border-[var(--color-neutral-100)] last:border-0',
                onRowClick && 'cursor-pointer hover:bg-[var(--color-neutral-50)] focus-visible:bg-[var(--color-blue-50)]',
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.id}
                  className={cn(
                    'px-4 py-3 text-[length:var(--text-body)] text-[var(--color-neutral-900)]',
                    col.numeric && 'text-right tabular-nums',
                    col.hideBelow && HIDE_CLASSES[col.hideBelow],
                    col.className,
                  )}
                >
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
