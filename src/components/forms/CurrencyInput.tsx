import { forwardRef, useState } from 'react';
import { Input } from '@/components/ui/Input';
import { minorUnitDigits } from '@/lib/money';

export interface CurrencyInputProps {
  currency: string;
  valueMinor: number | null;
  onChangeMinor: (minor: number | null) => void;
  id?: string;
  invalid?: boolean;
  disabled?: boolean;
  placeholder?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

/**
 * Collects a decimal amount from the user and converts it to integer minor
 * units on change — the only place a decimal string is parsed. Nothing
 * downstream ever does float math on the result.
 */
export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ currency, valueMinor, onChangeMinor, ...props }, ref) => {
    const digits = minorUnitDigits(currency);
    const [text, setText] = useState(() => (valueMinor != null ? (valueMinor / 10 ** digits).toFixed(digits) : ''));

    return (
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-[length:var(--text-body)] text-[var(--color-neutral-500)]">
          {currency}
        </span>
        <Input
          ref={ref}
          inputMode="decimal"
          className="pl-16 text-right tabular-nums"
          value={text}
          onChange={(e) => {
            const raw = e.target.value;
            setText(raw);
            if (raw.trim() === '') {
              onChangeMinor(null);
              return;
            }
            const cleaned = raw.replace(/,/g, '');
            const numeric = Number(cleaned);
            if (!Number.isNaN(numeric) && /^\d*\.?\d*$/.test(cleaned)) {
              onChangeMinor(Math.round(numeric * 10 ** digits));
            }
          }}
          onBlur={() => {
            if (valueMinor != null) setText((valueMinor / 10 ** digits).toFixed(digits));
          }}
          {...props}
        />
      </div>
    );
  },
);
CurrencyInput.displayName = 'CurrencyInput';
