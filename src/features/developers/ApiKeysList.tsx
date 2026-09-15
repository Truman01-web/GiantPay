import { useState } from 'react';
import { Plus, Trash2, Key } from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Button } from '@/components/ui/Button';
import { DataTable, type DataTableColumn } from '@/components/data-display/DataTable';
import { StatusBadge } from '@/components/data-display/StatusBadge';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { ErrorState } from '@/components/feedback/ErrorState';
import { usePermission } from '@/hooks/useSession';
import { ApiError } from '@/services/api/errors';
import { toast } from '@/components/feedback/toastStore';
import { useApiKeysList, useRevokeApiKey } from './useDevelopersQueries';
import { CreateApiKeyDialog } from './CreateApiKeyDialog';
import type { ApiKey } from '@/services/api/developers';

export function ApiKeysList() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [keyToRevoke, setKeyToRevoke] = useState<ApiKey | null>(null);

  const canManage = usePermission('developer.apiKeys:manage');
  const query = useApiKeysList();
  const revokeMutation = useRevokeApiKey();

  async function handleConfirmRevoke() {
    if (!keyToRevoke) return;
    try {
      await revokeMutation.mutateAsync(keyToRevoke.id);
      toast({ variant: 'success', title: 'API key revoked' });
      setKeyToRevoke(null);
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Failed to revoke key',
        description: err instanceof ApiError ? err.message : 'Please try again.',
      });
    }
  }

  const columns: DataTableColumn<ApiKey>[] = [
    {
      id: 'name',
      header: 'Name',
      cell: (k) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-navy-50)] text-[var(--color-navy-700)]">
            <Key className="h-4 w-4" aria-hidden="true" />
          </div>
          <div>
            <span className="font-medium text-[var(--color-navy-950)]">{k.name}</span>
            <div className="text-xs text-[var(--color-navy-500)] capitalize">{k.environment}</div>
          </div>
        </div>
      ),
    },
    {
      id: 'prefix',
      header: 'Token prefix',
      cell: (k) => (
        <code className="rounded bg-[var(--color-neutral-100)] px-2 py-0.5 font-mono text-xs text-[var(--color-navy-800)]">
          {k.prefix}…
        </code>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: (k) => <StatusBadge status={k.status} />,
    },
    {
      id: 'lastUsedAt',
      header: 'Last used',
      cell: (k) =>
        k.lastUsedAt ? format(new Date(k.lastUsedAt), 'd MMM yyyy, HH:mm') : 'Never',
      hideBelow: 'sm',
    },
    {
      id: 'createdAt',
      header: 'Created',
      cell: (k) => format(new Date(k.createdAt), 'd MMM yyyy'),
      hideBelow: 'md',
    },
    {
      id: 'actions',
      header: '',
      numeric: true,
      cell: (k) =>
        canManage && k.status === 'ACTIVE' ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setKeyToRevoke(k);
            }}
            className="text-[var(--color-danger-600)] hover:text-[var(--color-danger-700)] hover:bg-[var(--color-danger-50)]"
            aria-label={`Revoke ${k.name}`}
          >
            <Trash2 className="h-4 w-4 mr-1.5" aria-hidden="true" />
            Revoke
          </Button>
        ) : null,
    },
  ];

  return (
    <div>
      <PageHeader
        title="API keys"
        description="Authenticate programmatic requests to the GiantPay API. Keep your keys confidential."
        actions={
          canManage ? (
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create API key
            </Button>
          ) : undefined
        }
      />

      {query.isError ? (
        <ErrorState
          message={
            query.error instanceof ApiError
              ? query.error.message
              : 'We could not load API keys.'
          }
          onRetry={() => query.refetch()}
        />
      ) : (
        <DataTable
          caption="API keys"
          columns={columns}
          data={query.data?.items ?? []}
          getRowKey={(k) => k.id}
          loading={query.isPending}
          emptyTitle="No API keys yet"
          emptyDescription={
            canManage
              ? 'Create your first API key to start integrating with GiantPay APIs.'
              : 'API keys will appear here once generated.'
          }
        />
      )}

      <CreateApiKeyDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />

      <ConfirmationDialog
        open={Boolean(keyToRevoke)}
        onOpenChange={(open) => !open && setKeyToRevoke(null)}
        title="Revoke API key"
        description={`Are you sure you want to revoke "${keyToRevoke?.name}"? Any applications or integrations using this key will immediately lose access.`}
        confirmLabel="Revoke key"
        cancelLabel="Keep key"
        destructive
        loading={revokeMutation.isPending}
        onConfirm={handleConfirmRevoke}
      />
    </div>
  );
}
