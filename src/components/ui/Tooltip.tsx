import * as RadixTooltip from '@radix-ui/react-tooltip';
import { cn } from '@/lib/cn';

export const TooltipProvider = RadixTooltip.Provider;

export function Tooltip({ content, children, side = 'top' }: { content: string; children: React.ReactNode; side?: 'top' | 'right' | 'bottom' | 'left' }) {
  return (
    <RadixTooltip.Root delayDuration={300}>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={6}
          className={cn(
            'z-[150] rounded-[var(--radius-sm)] bg-[var(--color-navy-950)] px-2.5 py-1.5 text-[length:var(--text-help)] text-white shadow-[var(--shadow-popover)]',
          )}
        >
          {content}
          <RadixTooltip.Arrow className="fill-[var(--color-navy-950)]" />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
