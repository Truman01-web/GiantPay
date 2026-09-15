import { forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-medium transition-colors duration-[var(--duration-fast)] disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap',
  {
    variants: {
      variant: {
        primary: 'bg-[var(--color-blue-600)] text-white hover:bg-[var(--color-blue-500)]',
        secondary:
          'bg-white text-[var(--color-navy-900)] border border-[var(--color-neutral-300)] hover:bg-[var(--color-neutral-50)]',
        outline:
          'bg-transparent text-[var(--color-navy-900)] border border-[var(--color-neutral-300)] hover:bg-[var(--color-neutral-50)]',
        ghost: 'text-[var(--color-navy-900)] hover:bg-[var(--color-neutral-100)]',
        destructive: 'bg-[var(--color-red-600)] text-white hover:bg-[var(--color-red-700)]',
        link: 'text-[var(--color-blue-600)] underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        sm: 'h-8 px-3 text-[length:var(--text-label)]',
        md: 'h-10 px-4 text-[length:var(--text-body)]',
        lg: 'h-12 px-6 text-[length:var(--text-body)]',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, disabled, children, ...props }, ref) => {
    // asChild delegates rendering entirely to its single child element (e.g.
    // a router <Link>) — Radix's Slot requires exactly one child, and
    // disabled/loading are button-only semantics that don't apply to it.
    if (asChild) {
      return (
        <Slot ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props}>
          {children}
        </Slot>
      );
    }
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {children}
      </button>
    );
  },
);
Button.displayName = 'Button';
