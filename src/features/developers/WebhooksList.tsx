import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Webhook, ArrowRight, ShieldCheck, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { StatusBadge } from '@/components/data-display/StatusBadge';
import { ErrorState } from '@/components/feedback/ErrorState';
import { usePermission } from '@/hooks/useSession';
import { ApiError } from '@/services/api/errors';
import { toast } from '@/components/feedback/toastStore';
import { useWebhooksList, useUpdateWebhook } from './useDevelopersQueries';
import { RegisterWebhookDialog } from './RegisterWebhookDialog';
import type { WebhookEndpoint } from '@/services/api/developers';

export function WebhooksList() {
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const canManage = usePermission('developer.webhooks:manage');
  const query = useWebhooksList();
  const updateMutation = useUpdateWebhook();

  async function handleToggleEnabled(webhook: WebhookEndpoint) {
    try {
      await updateMutation.mutateAsync({
        id: webhook.id,
        enabled: !webhook.enabled,
      });
      toast({
        variant: 'success',
        title: webhook.enabled ? 'Webhook disabled' : 'Webhook enabled',
      });
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Failed to update webhook',
        description: err instanceof ApiError ? err.message : 'Please try again.',
      });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Webhooks"
        description="Receive real-time HTTPS notifications for payments, refunds, and checkout events."
        actions={
          canManage ? (
            <Button onClick={() => setRegisterDialogOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Register webhook
            </Button>
          ) : undefined
        }
      />

      {query.isError ? (
        <ErrorState
          message={
            query.error instanceof ApiError
              ? query.error.message
              : 'We could not load webhook endpoints.'
          }
          onRetry={() => query.refetch()}
        />
      ) : query.isPending ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-32 rounded-xl border border-[var(--color-neutral-200)] bg-white animate-pulse"
            />
          ))}
        </div>
      ) : query.data?.items.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-600 mb-3">
            <Webhook className="h-6 w-6" aria-hidden="true" />
          </div>
          <h3 className="text-base font-semibold text-[var(--color-navy-950)]">
            No webhook endpoints registered
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-xs text-[var(--color-navy-600)] leading-relaxed">
            {canManage
              ? 'Register an HTTPS URL to start receiving automated event payloads whenever transactions or refunds occur.'
              : 'Configured webhook endpoints will appear here.'}
          </p>
          {canManage && (
            <Button
              className="mt-4"
              size="sm"
              onClick={() => setRegisterDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1.5" aria-hidden="true" />
              Register your first webhook
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {query.data?.items.map((wh) => (
            <Card key={wh.id} className="p-5 transition-shadow hover:shadow-md">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono font-semibold text-sm text-[var(--color-navy-950)] break-all">
                      {wh.url}
                    </span>
                    <StatusBadge status={wh.enabled ? 'ACTIVE' : 'DISABLED'} />
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-xs text-[var(--color-navy-500)] mr-1">Events:</span>
                    {wh.events.map((ev) => (
                      <span
                        key={ev}
                        className="rounded-md bg-[var(--color-navy-50)] border border-[var(--color-navy-100)] px-2 py-0.5 font-mono text-[11px] text-[var(--color-navy-800)]"
                      >
                        {ev}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--color-navy-500)] pt-1">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                      <span className="font-mono">{wh.secretMasked}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-[var(--color-neutral-400)]" aria-hidden="true" />
                      <span>Registered {format(new Date(wh.createdAt), 'd MMM yyyy')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[var(--color-neutral-100)]">
                  {canManage && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--color-navy-600)]">
                        {wh.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <Switch
                        checked={wh.enabled}
                        onCheckedChange={() => handleToggleEnabled(wh)}
                        aria-label={`Toggle webhook ${wh.url}`}
                        disabled={updateMutation.isPending}
                      />
                    </div>
                  )}

                  <Link to={`/developers/webhooks/${wh.id}`}>
                    <Button variant="outline" size="sm" className="group">
                      View details & deliveries
                      <ArrowRight className="h-3.5 w-3.5 ml-1 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <RegisterWebhookDialog
        open={registerDialogOpen}
        onOpenChange={setRegisterDialogOpen}
      />
    </div>
  );
}
