import * as RadixTabs from '@radix-ui/react-tabs';
import { cn } from '@/lib/cn';

export const Tabs = RadixTabs.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof RadixTabs.List>) {
  return <RadixTabs.List className={cn('flex gap-1 border-b border-[var(--color-neutral-200)]', className)} {...props} />;
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof RadixTabs.Trigger>) {
  return (
    <RadixTabs.Trigger
      className={cn(
        '-mb-px border-b-2 border-transparent px-3 py-2.5 text-[length:var(--text-label)] font-medium text-[var(--color-neutral-600)]',
        'hover:text-[var(--color-navy-900)]',
        'data-[state=active]:border-[var(--color-blue-600)] data-[state=active]:text-[var(--color-navy-900)]',
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: React.ComponentProps<typeof RadixTabs.Content>) {
  return <RadixTabs.Content className={cn('pt-4', className)} {...props} />;
}
