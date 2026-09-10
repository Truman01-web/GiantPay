import * as RadixPopover from '@radix-ui/react-popover';
import { cn } from '@/lib/cn';

export const Popover = RadixPopover.Root;
export const PopoverTrigger = RadixPopover.Trigger;

export function PopoverContent({ className, ...props }: React.ComponentProps<typeof RadixPopover.Content>) {
  return (
    <RadixPopover.Portal>
      <RadixPopover.Content
        sideOffset={6}
        className={cn('z-[150] rounded-[var(--radius-md)] border border-[var(--color-neutral-200)] bg-white p-4 shadow-[var(--shadow-popover)]', className)}
        {...props}
      />
    </RadixPopover.Portal>
  );
}
