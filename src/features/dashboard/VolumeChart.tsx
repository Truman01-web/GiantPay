import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import { ChartContainer } from '@/components/data-display/ChartContainer';
import { formatMoney } from '@/lib/money';
import type { VolumePoint } from '@/services/api/dashboard';

export function VolumeChart({ points, currency }: { points: VolumePoint[]; currency: string }) {
  const total = points.reduce((sum, p) => sum + p.volumeMinor, 0);
  const summary = `Payment volume from ${points[0]?.date ?? ''} to ${points[points.length - 1]?.date ?? ''}, totaling ${formatMoney(total, currency)} across ${points.length} days.`;

  return (
    <ChartContainer title="Payment volume" accessibleSummary={summary}>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={points} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="volumeFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-blue-500)" stopOpacity={0.25} />
                <stop offset="100%" stopColor="var(--color-blue-500)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-neutral-200)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(d: string) => format(new Date(d), 'd MMM')}
              tick={{ fontSize: 12, fill: 'var(--color-neutral-500)' }}
              axisLine={{ stroke: 'var(--color-neutral-200)' }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => formatMoney(v, currency).replace(/\.\d+$/, '')}
              tick={{ fontSize: 12, fill: 'var(--color-neutral-500)' }}
              axisLine={false}
              tickLine={false}
              width={90}
            />
            <Tooltip
              formatter={(value) => formatMoney(Number(value), currency)}
              labelFormatter={(label) => format(new Date(String(label)), 'd MMM yyyy')}
              contentStyle={{ borderRadius: 8, borderColor: 'var(--color-neutral-200)', fontSize: 13 }}
            />
            <Area type="monotone" dataKey="volumeMinor" stroke="var(--color-blue-600)" strokeWidth={2} fill="url(#volumeFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartContainer>
  );
}
