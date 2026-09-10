import { forwardRef, useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      aria-invalid={invalid || undefined}
      className={cn(
        'h-10 w-full rounded-[var(--radius-sm)] border bg-white px-3 text-[length:var(--text-body)] text-[var(--color-neutral-900)]',
        'placeholder:text-[var(--color-neutral-500)]',
        'disabled:cursor-not-allowed disabled:bg-[var(--color-neutral-50)] disabled:text-[var(--color-neutral-500)]',
        invalid ? 'border-[var(--color-red-600)]' : 'border-[var(--color-neutral-300)] focus:border-[var(--color-blue-500)]',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export type PasswordInputProps = Omit<InputProps, 'type'>;

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>((props, ref) => {
  const [visible, setVisible] = useState(false);
  const id = useId();
  return (
    <div className="relative">
      <Input ref={ref} id={props.id ?? id} type={visible ? 'text' : 'password'} className="pr-10" {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-[var(--color-neutral-500)] hover:text-[var(--color-neutral-700)]"
      >
        {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
      </button>
    </div>
  );
});
PasswordInput.displayName = 'PasswordInput';
