import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/cn';

export interface AmountDisplayProps {
  amountMinor: number;
  currency: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  signDisplay?: 'auto' | 'always' | 'never';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<AmountDisplayProps['size']>, string> = {
  sm: 'text-[length:var(--text-label)]',
  md: 'text-[length:var(--text-body)]',
  lg: 'text-[length:var(--text-h3)]',
  xl: 'text-[length:var(--text-h1)]',
};

/** The one place authoritative money amounts are formatted for display. */
export function AmountDisplay({ amountMinor, currency, size = 'md', signDisplay = 'auto', className }: AmountDisplayProps) {
  return (
    <span className={cn('tabular-nums font-medium text-[var(--color-neutral-900)]', SIZE_CLASSES[size], className)}>
      {formatMoney(amountMinor, currency, { signDisplay })}
    </span>
  );
}
