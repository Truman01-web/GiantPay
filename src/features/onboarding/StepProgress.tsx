import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

const STEPS = ['Business', 'Ownership', 'Documents', 'Settlement', 'Review'];

export function StepProgress({ currentStep }: { currentStep: number }) {
  return (
    <ol className="mb-6 flex items-center" aria-label="Application progress">
      {STEPS.map((label, i) => {
        const stepNumber = i + 1;
        const done = stepNumber < currentStep;
        const active = stepNumber === currentStep;
        return (
          <li key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <span
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-[length:var(--text-label)] font-semibold',
                  done && 'bg-[var(--color-blue-600)] text-white',
                  active && 'border-2 border-[var(--color-blue-600)] text-[var(--color-blue-600)]',
                  !done && !active && 'border border-[var(--color-neutral-300)] text-[var(--color-neutral-400)]',
                )}
              >
                {done ? <Check className="h-4 w-4" aria-hidden="true" /> : stepNumber}
              </span>
              <span className={cn('hidden text-[length:var(--text-help)] sm:block', active ? 'font-medium text-[var(--color-navy-900)]' : 'text-[var(--color-neutral-500)]')}>{label}</span>
            </div>
            {stepNumber < STEPS.length && <div className={cn('mx-2 h-px flex-1', done ? 'bg-[var(--color-blue-600)]' : 'bg-[var(--color-neutral-200)]')} />}
          </li>
        );
      })}
    </ol>
  );
}
