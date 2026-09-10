import * as RadixRadioGroup from '@radix-ui/react-radio-group';
import { cn } from '@/lib/cn';

export const RadioGroup = RadixRadioGroup.Root;

export function RadioGroupItem({ className, ...props }: React.ComponentProps<typeof RadixRadioGroup.Item>) {
  return (
    <RadixRadioGroup.Item
      className={cn(
        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--color-neutral-300)] bg-white',
        'data-[state=checked]:border-[var(--color-blue-600)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <RadixRadioGroup.Indicator className="h-2.5 w-2.5 rounded-full bg-[var(--color-blue-600)]" />
    </RadixRadioGroup.Item>
  );
}
