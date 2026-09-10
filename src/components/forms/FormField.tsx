import { useId } from 'react';
import { cn } from '@/lib/cn';

export interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  optional?: boolean;
  help?: string;
  error?: string;
  children: (fieldProps: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => React.ReactNode;
  className?: string;
}

/**
 * Wraps a single form control with a persistent visible label,
 * required/optional indication, help text and inline error — used
 * throughout the app so every field in every form looks and behaves the
 * same way. Pass the input via the render-prop `children` so the field ids
 * and aria wiring are always correct.
 */
export function FormField({ label, htmlFor, required, optional, help, error, children, className }: FormFieldProps) {
  const generatedId = useId();
  const id = htmlFor ?? generatedId;
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-[length:var(--text-label)] font-medium text-[var(--color-neutral-700)]">
        {label}
        {required && (
          <span className="ml-0.5 text-[var(--color-red-600)]" aria-hidden="true">
            *
          </span>
        )}
        {optional && <span className="ml-1.5 font-normal text-[var(--color-neutral-500)]">(optional)</span>}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': Boolean(error) })}
      {help && !error && (
        <p id={helpId} className="text-[length:var(--text-help)] text-[var(--color-neutral-500)]">
          {help}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-[length:var(--text-help)] text-[var(--color-red-600)]">
          {error}
        </p>
      )}
    </div>
  );
}
