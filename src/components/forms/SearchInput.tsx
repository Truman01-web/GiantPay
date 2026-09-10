import { Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search...',
  className,
  'aria-label': ariaLabel = 'Search',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  'aria-label'?: string;
}) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-neutral-500)]" aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="h-10 w-full rounded-[var(--radius-sm)] border border-[var(--color-neutral-300)] bg-white pl-9 pr-9 text-[length:var(--text-body)] placeholder:text-[var(--color-neutral-500)] focus:border-[var(--color-blue-500)]"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-100)]"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
