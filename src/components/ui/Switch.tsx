import * as RadixSwitch from '@radix-ui/react-switch';
import { cn } from '@/lib/cn';

export function Switch({ className, ...props }: React.ComponentProps<typeof RadixSwitch.Root>) {
  return (
    <RadixSwitch.Root
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-[var(--radius-full)] bg-[var(--color-neutral-300)] transition-colors duration-[var(--duration-fast)]',
        'data-[state=checked]:bg-[var(--color-blue-600)]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <RadixSwitch.Thumb className="block h-[1.125rem] w-[1.125rem] translate-x-1 rounded-full bg-white shadow transition-transform duration-[var(--duration-fast)] data-[state=checked]:translate-x-[22px]" />
    </RadixSwitch.Root>
  );
}
