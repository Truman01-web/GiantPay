import type { DateRange, DateRangePreset } from '@/types/common';

const PRESET_DAYS: Record<Exclude<DateRangePreset, 'custom'>, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

export function presetToRange(preset: DateRangePreset): DateRange {
  const days = preset === 'custom' ? 30 : PRESET_DAYS[preset];
  const to = new Date();
  const from = new Date(to.getTime() - days * 86_400_000);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10), preset };
}
