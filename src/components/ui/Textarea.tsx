import { forwardRef } from 'react';
import { cn } from '@/lib/cn';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, ...props }, ref) => (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'min-h-24 w-full rounded-[var(--radius-sm)] border bg-white px-3 py-2 text-[length:var(--text-body)] text-[var(--color-neutral-900)]',
        'placeholder:text-[var(--color-neutral-500)]',
        'disabled:cursor-not-allowed disabled:bg-[var(--color-neutral-50)] disabled:text-[var(--color-neutral-500)]',
        invalid ? 'border-[var(--color-red-600)]' : 'border-[var(--color-neutral-300)] focus:border-[var(--color-blue-500)]',
        className,
      )}
      {...props}
    />
  ),
);
Textarea.displayName = 'Textarea';
