import { CalendarDays } from 'lucide-react';
import { format } from 'date-fns';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { presetToRange } from '@/lib/dateRange';
import type { DateRange, DateRangePreset } from '@/types/common';

const PRESETS: Array<{ value: DateRangePreset; label: string }> = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
];

export function DateRangePicker({ value, onChange }: { value: DateRange; onChange: (range: DateRange) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="secondary" size="sm">
          <CalendarDays className="h-4 w-4" aria-hidden="true" />
          {format(new Date(value.from), 'd MMM yyyy')} – {format(new Date(value.to), 'd MMM yyyy')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="flex flex-col gap-1">
          {PRESETS.map((p) => (
            <Button
              key={p.value}
              variant={value.preset === p.value ? 'primary' : 'ghost'}
              size="sm"
              className="justify-start"
              onClick={() => onChange(presetToRange(p.value))}
            >
              {p.label}
            </Button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[var(--color-neutral-200)] pt-3">
          <label className="flex flex-col gap-1 text-[length:var(--text-help)] text-[var(--color-neutral-600)]">
            From
            <Input type="date" value={value.from} max={value.to} onChange={(e) => onChange({ ...value, from: e.target.value, preset: 'custom' })} />
          </label>
          <label className="flex flex-col gap-1 text-[length:var(--text-help)] text-[var(--color-neutral-600)]">
            To
            <Input type="date" value={value.to} min={value.from} max={new Date().toISOString().slice(0, 10)} onChange={(e) => onChange({ ...value, to: e.target.value, preset: 'custom' })} />
          </label>
        </div>
      </PopoverContent>
    </Popover>
  );
}
