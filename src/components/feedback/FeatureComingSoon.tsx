import { Construction } from 'lucide-react';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from './EmptyState';

/**
 * Honest "not built yet" state for routed-but-unimplemented pages (see
 * docs/frontend-architecture.md phased plan). Never a fake table with
 * placeholder rows — an unfinished feature says so.
 */
export function FeatureComingSoon({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <PageHeader title={title} />
      <Card>
        <EmptyState
          icon={<Construction className="h-8 w-8" aria-hidden="true" />}
          title="This area is planned for a later phase"
          description={description ?? 'This part of GiantPay is on the roadmap and not yet built. Check back after the next release.'}
        />
      </Card>
    </div>
  );
}
