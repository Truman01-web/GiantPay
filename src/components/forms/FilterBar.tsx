import type { ReactNode } from 'react';

/** Responsive container for list-page filter controls (search, selects,
 * date range) — wraps on small screens instead of causing horizontal
 * scroll of the whole page. */
export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-center gap-2">{children}</div>;
}
