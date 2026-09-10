import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

export const Select = RadixSelect.Root;

export function SelectTrigger({ className, children, ...props }: React.ComponentProps<typeof RadixSelect.Trigger>) {
  return (
    <RadixSelect.Trigger
      className={cn(
        'flex h-10 w-full items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-[var(--color-neutral-300)] bg-white px-3 text-[length:var(--text-body)] text-[var(--color-neutral-900)]',
        'data-[placeholder]:text-[var(--color-neutral-500)]',
        'focus:border-[var(--color-blue-500)] disabled:cursor-not-allowed disabled:bg-[var(--color-neutral-50)]',
        className,
      )}
      {...props}
    >
      {children}
      <RadixSelect.Icon>
        <ChevronDown className="h-4 w-4 text-[var(--color-neutral-500)]" aria-hidden="true" />
      </RadixSelect.Icon>
    </RadixSelect.Trigger>
  );
}

export function SelectValue(props: React.ComponentProps<typeof RadixSelect.Value>) {
  return <RadixSelect.Value {...props} />;
}

export function SelectContent({ className, children, ...props }: React.ComponentProps<typeof RadixSelect.Content>) {
  return (
    <RadixSelect.Portal>
      <RadixSelect.Content
        className={cn('z-[150] max-h-64 overflow-auto rounded-[var(--radius-md)] border border-[var(--color-neutral-200)] bg-white p-1 shadow-[var(--shadow-popover)]', className)}
        position="popper"
        sideOffset={4}
        {...props}
      >
        <RadixSelect.Viewport>{children}</RadixSelect.Viewport>
      </RadixSelect.Content>
    </RadixSelect.Portal>
  );
}

export function SelectItem({ className, children, ...props }: React.ComponentProps<typeof RadixSelect.Item>) {
  return (
    <RadixSelect.Item
      className={cn(
        'flex cursor-pointer items-center justify-between gap-2 rounded-[var(--radius-sm)] px-2.5 py-2 text-[length:var(--text-body)] text-[var(--color-neutral-900)] outline-none',
        'data-[highlighted]:bg-[var(--color-neutral-100)]',
        className,
      )}
      {...props}
    >
      <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
      <RadixSelect.ItemIndicator>
        <Check className="h-3.5 w-3.5 text-[var(--color-blue-600)]" aria-hidden="true" />
      </RadixSelect.ItemIndicator>
    </RadixSelect.Item>
  );
}
