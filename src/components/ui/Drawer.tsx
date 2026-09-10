import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

export const Drawer = RadixDialog.Root;
export const DrawerTrigger = RadixDialog.Trigger;

export function DrawerContent({
  className,
  children,
  title,
  side = 'left',
}: {
  className?: string;
  children: React.ReactNode;
  title: string;
  side?: 'left' | 'right';
}) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-[100] bg-[var(--color-navy-950)]/40" />
      <RadixDialog.Content
        className={cn(
          'fixed inset-y-0 z-[101] flex w-[85vw] max-w-xs flex-col bg-white shadow-[var(--shadow-popover)] focus:outline-none',
          side === 'left' ? 'left-0' : 'right-0',
          className,
        )}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-neutral-200)] px-4 py-3">
          <RadixDialog.Title className="text-[length:var(--text-h4)] font-semibold text-[var(--color-navy-900)]">{title}</RadixDialog.Title>
          <RadixDialog.Close aria-label="Close menu" className="rounded p-1 text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-100)]">
            <X className="h-4 w-4" aria-hidden="true" />
          </RadixDialog.Close>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}
