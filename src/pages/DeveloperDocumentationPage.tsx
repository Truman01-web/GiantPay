import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Card, CardContent } from '@/components/ui/Card';

const docs = [
  ['/developers/api-documentation', 'API reference'],
  ['/developers/collections-api', 'Collections API'],
  ['/developers/disbursements-api', 'Disbursements API'],
  ['/developers/webhooks-api', 'Webhooks'],
  ['/developers/sdks', 'SDKs'],
  ['/developers/sandbox', 'Sandbox guide'],
] as const;

export default function DeveloperDocumentationPage() {
  return <div><PageHeader title="Developer documentation" description="Integration guidance for the GiantPay sandbox." /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{docs.map(([to, title]) => <Card key={to}><CardContent><h2 className="font-semibold text-[var(--color-navy-900)]">{title}</h2><Link className="mt-3 inline-block text-[var(--color-blue-600)] hover:underline" to={to}>Open documentation</Link></CardContent></Card>)}</div></div>;
}
