import * as RadixDropdown from '@radix-ui/react-dropdown-menu';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export const DropdownMenu = RadixDropdown.Root;
export const DropdownMenuTrigger = RadixDropdown.Trigger;

export function DropdownMenuContent({ className, ...props }: React.ComponentProps<typeof RadixDropdown.Content>) {
  return (
    <RadixDropdown.Portal>
      <RadixDropdown.Content
        sideOffset={6}
        align="end"
        className={cn(
          'z-[150] min-w-48 rounded-[var(--radius-md)] border border-[var(--color-neutral-200)] bg-white p-1 shadow-[var(--shadow-popover)]',
          className,
        )}
        {...props}
      />
    </RadixDropdown.Portal>
  );
}

export function DropdownMenuItem({ className, ...props }: React.ComponentProps<typeof RadixDropdown.Item>) {
  return (
    <RadixDropdown.Item
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-2 text-[length:var(--text-body)] text-[var(--color-neutral-900)] outline-none',
        'data-[highlighted]:bg-[var(--color-neutral-100)]',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export function DropdownMenuCheckboxItem({ className, children, checked, ...props }: React.ComponentProps<typeof RadixDropdown.CheckboxItem>) {
  return (
    <RadixDropdown.CheckboxItem
      checked={checked}
      className={cn(
        'flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-2 text-[length:var(--text-body)] text-[var(--color-neutral-900)] outline-none',
        'data-[highlighted]:bg-[var(--color-neutral-100)]',
        className,
      )}
      {...props}
    >
      <span className="flex h-4 w-4 items-center justify-center">
        <RadixDropdown.ItemIndicator>
          <Check className="h-3.5 w-3.5 text-[var(--color-blue-600)]" aria-hidden="true" />
        </RadixDropdown.ItemIndicator>
      </span>
      {children}
    </RadixDropdown.CheckboxItem>
  );
}

export function DropdownMenuLabel({ className, ...props }: React.ComponentProps<typeof RadixDropdown.Label>) {
  return <RadixDropdown.Label className={cn('px-2.5 py-1.5 text-[length:var(--text-help)] font-medium text-[var(--color-neutral-500)]', className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof RadixDropdown.Separator>) {
  return <RadixDropdown.Separator className={cn('my-1 h-px bg-[var(--color-neutral-200)]', className)} {...props} />;
}
