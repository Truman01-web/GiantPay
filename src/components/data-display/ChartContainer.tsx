import type { ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

export interface ChartContainerProps {
  title: string;
  /** Plain-text/table alternative rendered for assistive tech and as a
   * `aria-describedby` summary — every chart must have a non-visual
   * equivalent (spec §10). */
  accessibleSummary: string;
  actions?: ReactNode;
  children: ReactNode;
}

export function ChartContainer({ title, accessibleSummary, actions, children }: ChartContainerProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {actions}
      </CardHeader>
      <CardContent>
        <div role="img" aria-label={accessibleSummary}>
          {children}
        </div>
        <p className="sr-only">{accessibleSummary}</p>
      </CardContent>
    </Card>
  );
}
