import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-[var(--radius-full)] px-2.5 py-0.5 text-[length:var(--text-label)] font-medium',
  {
    variants: {
      variant: {
        neutral: 'bg-[var(--color-neutral-100)] text-[var(--color-neutral-700)]',
        blue: 'bg-[var(--color-blue-100)] text-[var(--color-blue-600)]',
        navy: 'bg-[var(--color-navy-100)] text-[var(--color-navy-800)]',
        success: 'bg-[var(--color-green-100)] text-[var(--color-green-700)]',
        warning: 'bg-[var(--color-amber-100)] text-[var(--color-amber-700)]',
        danger: 'bg-[var(--color-red-100)] text-[var(--color-red-700)]',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
