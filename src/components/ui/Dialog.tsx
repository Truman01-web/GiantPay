import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;

export function DialogContent({
  className,
  children,
  title,
  description,
  showClose = true,
}: {
  className?: string;
  children: React.ReactNode;
  title: string;
  description?: string;
  showClose?: boolean;
}) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-[100] bg-[var(--color-navy-950)]/40" />
      <RadixDialog.Content
        className={cn(
          'fixed left-1/2 top-1/2 z-[101] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[var(--radius-lg)] bg-white p-6 shadow-[var(--shadow-popover)] focus:outline-none',
          className,
        )}
      >
        <RadixDialog.Title className="text-[length:var(--text-h3)] font-semibold text-[var(--color-navy-900)]">
          {title}
        </RadixDialog.Title>
        {description && (
          <RadixDialog.Description className="mt-1 text-[length:var(--text-body)] text-[var(--color-neutral-600)]">
            {description}
          </RadixDialog.Description>
        )}
        <div className="mt-4">{children}</div>
        {showClose && (
          <RadixDialog.Close
            aria-label="Close dialog"
            className="absolute right-4 top-4 rounded p-1 text-[var(--color-neutral-500)] hover:bg-[var(--color-neutral-100)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </RadixDialog.Close>
        )}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

export const DialogClose = RadixDialog.Close;
