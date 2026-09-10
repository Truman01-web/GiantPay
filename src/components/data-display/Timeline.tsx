import { format } from 'date-fns';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface TimelineItem {
  id: string;
  label: string;
  occurredAt: string;
  detail?: string;
  tone?: 'default' | 'danger';
}

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="flex flex-col">
      {items.map((item, index) => (
        <li key={item.id} className="relative flex gap-3 pb-6 last:pb-0">
          {index < items.length - 1 && (
            <span aria-hidden="true" className="absolute left-[9px] top-5 h-full w-px bg-[var(--color-neutral-200)]" />
          )}
          <CheckCircle2
            className={cn('mt-0.5 h-5 w-5 shrink-0', item.tone === 'danger' ? 'text-[var(--color-red-600)]' : 'text-[var(--color-blue-600)]')}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-[length:var(--text-body)] font-medium text-[var(--color-neutral-900)]">{item.label}</p>
            <time dateTime={item.occurredAt} className="text-[length:var(--text-help)] tabular-nums text-[var(--color-neutral-500)]">
              {format(new Date(item.occurredAt), "d MMM yyyy, HH:mm")}
            </time>
            {item.detail && <p className="mt-0.5 text-[length:var(--text-help)] text-[var(--color-neutral-600)]">{item.detail}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
