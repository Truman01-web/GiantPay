/* eslint-disable react-refresh/only-export-components -- this lazy route module intentionally exports multiple page components */
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { Alert } from '@/components/feedback/Alert';
import { EmptyState } from '@/components/feedback/EmptyState';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { platformApi, type PlatformRecord } from '@/services/api/platform';

type ResourceProps = {
  title: string;
  description: string;
  path: string;
  parent?: { label: string; to: string };
  detailBase?: string;
  note?: string;
};

const blockedKey = /password|token|secret|credential|cipher|stack|body/i;
const label = (key: string) => key.replaceAll('_', ' ').replace(/([a-z])([A-Z])/g, '$1 $2');
const printable = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};
const records = (payload: unknown): PlatformRecord[] => {
  if (Array.isArray(payload)) return payload.filter((item): item is PlatformRecord => Boolean(item) && typeof item === 'object');
  if (!payload || typeof payload !== 'object') return [];
  const object = payload as PlatformRecord;
  const collection = Array.isArray(object.data) ? object.data : Array.isArray(object.items) ? object.items : null;
  if (collection) return collection.filter((item): item is PlatformRecord => Boolean(item) && typeof item === 'object');
  return [object];
};

function PlatformResourcePage({ title, description, path, parent, detailBase, note }: ResourceProps) {
  const query = useQuery({ queryKey: ['platform-resource', path], queryFn: ({ signal }) => platformApi.get(path, { signal }) });
  const rows = useMemo(() => records(query.data), [query.data]);
  const keys = useMemo(
    () => [...new Set(rows.flatMap((row) => Object.keys(row)))].filter((key) => !blockedKey.test(key)).slice(0, 9),
    [rows],
  );
  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={parent && <Link className="text-sm text-[var(--color-blue-600)] hover:underline" to={parent.to}>← {parent.label}</Link>}
        actions={<Button variant="secondary" onClick={() => void query.refetch()} loading={query.isFetching}>Refresh</Button>}
      />
      {note && <div className="mb-4"><Alert variant="info">{note}</Alert></div>}
      {query.isError ? (
        <Alert variant="danger" title="Unable to load this page">The platform API did not return this data. Retry, or confirm your permission and service health.</Alert>
      ) : query.isLoading ? (
        <Card><CardContent><p role="status">Loading {title.toLowerCase()}…</p></CardContent></Card>
      ) : rows.length === 0 ? (
        <Card><CardContent><EmptyState title={`No ${title.toLowerCase()} found`} description="There are no records in the current sandbox scope." /></CardContent></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-[var(--color-neutral-50)]"><tr>{keys.map((key) => <th scope="col" className="px-4 py-3 font-semibold capitalize" key={key}>{label(key)}</th>)}</tr></thead>
              <tbody>{rows.map((row, index) => <tr className="border-t border-[var(--color-neutral-200)]" key={typeof row.id === 'string' ? row.id : index}>{keys.map((key) => <td className="max-w-72 px-4 py-3 align-top break-words" key={key}>{key === 'id' && detailBase && typeof row.id === 'string' ? <Link className="text-[var(--color-blue-600)] hover:underline" to={`${detailBase}/${encodeURIComponent(row.id)}`}>{row.id}</Link> : printable(row[key])}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

const list = (props: ResourceProps) => () => <PlatformResourcePage {...props} />;
const detail = (props: Omit<ResourceProps, 'path'> & { pathPrefix: string }) => () => {
  const { id = '' } = useParams();
  return <PlatformResourcePage {...props} path={`${props.pathPrefix}/${encodeURIComponent(id)}`} />;
};

export const AdminHomePage = list({ title: 'Administration overview', description: 'Live sandbox operations and dependency summary.', path: '/platform/operations/overview' });
export const AdminApplicationsPage = list({ title: 'Merchant applications', description: 'Review submitted merchant onboarding applications.', path: '/compliance/applications', detailBase: '/admin/merchant-applications' });
export const AdminApplicationDetailPage = detail({ title: 'Merchant application', description: 'Application evidence and current compliance status.', pathPrefix: '/compliance/applications', parent: { label: 'Applications', to: '/admin/merchant-applications' } });
export const AdminMerchantsPage = list({ title: 'Merchants', description: 'Sandbox merchant directory and operational counts.', path: '/platform/merchants', detailBase: '/admin/merchants' });
export const AdminMerchantDetailPage = detail({ title: 'Merchant', description: 'Merchant status and sandbox activity summary.', pathPrefix: '/platform/merchants', parent: { label: 'Merchants', to: '/admin/merchants' } });
export const AdminTransactionsPage = list({ title: 'All transactions', description: 'Cross-merchant sandbox transaction activity.', path: '/platform/transactions', detailBase: '/admin/transactions' });
export const AdminTransactionDetailPage = detail({ title: 'Transaction', description: 'Safe platform transaction projection.', pathPrefix: '/platform/transactions', parent: { label: 'Transactions', to: '/admin/transactions' } });
export const AdminRefundsPage = list({ title: 'All refunds', description: 'Cross-merchant refund requests and decisions.', path: '/platform/refunds' });
export const AdminPendingRefundsPage = list({ title: 'Refund approvals', description: 'Maker-checker queue for pending sandbox refunds.', path: '/admin/refunds/pending', note: 'Approvals remain subject to independent-checker and refund eligibility controls.' });
export const AdminSettlementsPage = list({ title: 'Settlements', description: 'Sandbox settlement batches. No external payout is executed.', path: '/platform/settlements', note: 'Real payouts remain disabled.' });
export const AdminReconciliationPage = list({ title: 'Reconciliation', description: 'Unresolved reconciliation work across merchants.', path: '/platform/reconciliation/exceptions', detailBase: '/admin/exceptions' });
export const AdminExceptionsPage = list({ title: 'Exceptions', description: 'Reconciliation exceptions requiring review.', path: '/platform/reconciliation/exceptions', detailBase: '/admin/exceptions' });
export const AdminExceptionDetailPage = detail({ title: 'Exception', description: 'Reconciliation exception evidence and resolution state.', pathPrefix: '/platform/reconciliation/exceptions', parent: { label: 'Exceptions', to: '/admin/exceptions' } });
export const AdminProvidersPage = list({ title: 'Providers', description: 'Configured external-provider availability.', path: '/platform/operations/overview', note: 'Sandbox payments remain active; live payments, payouts, SMS, and unconfigured email providers remain unavailable.' });
export const AdminUsersPage = list({ title: 'Platform users', description: 'Platform staff accounts without sensitive authentication data.', path: '/platform/users' });
export const AdminRolesPage = list({ title: 'Platform roles', description: 'Assigned platform roles and effective permission sets.', path: '/platform/roles' });
export const AdminAuditLogsPage = list({ title: 'Audit logs', description: 'Redacted, append-only platform audit activity.', path: '/platform/audit-events' });
export const AdminIncidentsPage = list({ title: 'Incidents', description: 'Operational incident register and current state.', path: '/platform/operations/incidents' });
export const AdminSecurityPage = list({ title: 'Security controls', description: 'Effective emergency and processing controls.', path: '/platform/operations/controls', note: 'Consequential control changes require the existing proposal and independent approval workflow.' });
export const AdminReportsPage = list({ title: 'Platform reports', description: 'Live operational metrics for the sandbox platform.', path: '/platform/operations/metrics' });
export const AdminSystemHealthPage = list({ title: 'System health', description: 'Authenticated readiness of required platform dependencies.', path: '/platform/health' });
export const AdminSettingsPage = list({ title: 'Administration settings', description: 'Current effective operational controls.', path: '/platform/operations/controls', note: 'External-provider credentials and DNS policy are configured outside the application.' });
