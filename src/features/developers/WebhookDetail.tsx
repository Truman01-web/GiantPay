import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  RotateCw,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  Send,
} from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { CopyButton } from '@/components/ui/CopyButton';
import { StatusBadge } from '@/components/data-display/StatusBadge';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/Dialog';
import { ErrorState } from '@/components/feedback/ErrorState';
import { toast } from '@/components/feedback/toastStore';
import { usePermission } from '@/hooks/useSession';
import { ApiError } from '@/services/api/errors';
import {
  useWebhookDetail,
  useUpdateWebhook,
  useRotateWebhookSecret,
  useRetryWebhookDelivery,
} from './useDevelopersQueries';
import type { WebhookDelivery } from '@/services/api/developers';

interface Props {
  id: string;
}

export function WebhookDetail({ id }: Props) {
  const [confirmRotateOpen, setConfirmRotateOpen] = useState(false);
  const [revealedNewSecret, setRevealedNewSecret] = useState<string | null>(null);
  const [expandedDeliveryId, setExpandedDeliveryId] = useState<string | null>(null);
  const [retryingDeliveryId, setRetryingDeliveryId] = useState<string | null>(null);

  const canManage = usePermission('developer.webhooks:manage');
  const query = useWebhookDetail(id);
  const updateMutation = useUpdateWebhook();
  const rotateMutation = useRotateWebhookSecret();
  const retryMutation = useRetryWebhookDelivery();

  const webhook = query.data;

  async function handleToggleEnabled() {
    if (!webhook) return;
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

  async function handleConfirmRotate() {
    if (!webhook) return;
    try {
      const res = await rotateMutation.mutateAsync(webhook.id);
      setConfirmRotateOpen(false);
      setRevealedNewSecret(res.secret);
      toast({ variant: 'success', title: 'Webhook secret rotated' });
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Failed to rotate secret',
        description: err instanceof ApiError ? err.message : 'Please try again.',
      });
    }
  }

  async function handleRetryDelivery(delivery: WebhookDelivery) {
    setRetryingDeliveryId(delivery.id);
    try {
      await retryMutation.mutateAsync(delivery.id);
      toast({ variant: 'success', title: 'Webhook delivery queued for retry' });
      query.refetch();
    } catch (err) {
      toast({
        variant: 'error',
        title: 'Failed to retry delivery',
        description: err instanceof ApiError ? err.message : 'Please try again.',
      });
    } finally {
      setRetryingDeliveryId(null);
    }
  }

  if (query.isError) {
    return (
      <div className="space-y-4">
        <Link
          to="/developers/webhooks"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-navy-600)] hover:text-[var(--color-navy-900)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to webhooks
        </Link>
        <ErrorState
          message={
            query.error instanceof ApiError
              ? query.error.message
              : 'We could not load this webhook endpoint.'
          }
          onRetry={() => query.refetch()}
        />
      </div>
    );
  }

  if (query.isPending || !webhook) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 bg-white rounded animate-pulse" />
        <div className="h-48 rounded-xl border border-[var(--color-neutral-200)] bg-white animate-pulse" />
        <div className="h-64 rounded-xl border border-[var(--color-neutral-200)] bg-white animate-pulse" />
      </div>
    );
  }

  const deliveries = webhook.deliveries ?? [];

  return (
    <div className="space-y-6">
      {/* Back Link & Header */}
      <div>
        <Link
          to="/developers/webhooks"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-navy-600)] hover:text-[var(--color-navy-900)] mb-3"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to webhooks
        </Link>
        <PageHeader
          title="Webhook endpoint details"
          description={`Registered ${format(new Date(webhook.createdAt), 'd MMMM yyyy')}`}
          actions={
            canManage ? (
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmRotateOpen(true)}
                  disabled={rotateMutation.isPending}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                  Rotate signing secret
                </Button>
              </div>
            ) : undefined
          }
        />
      </div>

      {/* Endpoint Configuration Card */}
      <Card className="p-6 space-y-6">
        <h2 className="text-sm font-semibold text-[var(--color-navy-950)] border-b border-[var(--color-neutral-100)] pb-3">
          Endpoint configuration
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-1">
            <span className="text-xs font-medium text-[var(--color-navy-500)]">Destination URL</span>
            <p className="font-mono text-xs font-semibold text-[var(--color-navy-950)] break-all bg-[var(--color-neutral-50)] p-2.5 rounded-lg border border-[var(--color-neutral-200)]">
              {webhook.url}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-medium text-[var(--color-navy-500)]">Signing secret</span>
            <div className="flex items-center justify-between bg-[var(--color-neutral-50)] p-2.5 rounded-lg border border-[var(--color-neutral-200)]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                <span className="font-mono text-xs text-[var(--color-navy-900)]">{webhook.secretMasked}</span>
              </div>
              {canManage && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-[var(--color-blue-600)]"
                  onClick={() => setConfirmRotateOpen(true)}
                >
                  Rotate
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs font-medium text-[var(--color-navy-500)]">Subscribed events</span>
            <div className="flex flex-wrap gap-2">
              {webhook.events.map((ev) => (
                <span
                  key={ev}
                  className="rounded-md bg-[var(--color-navy-50)] border border-[var(--color-navy-100)] px-2.5 py-1 font-mono text-xs text-[var(--color-navy-800)] font-medium"
                >
                  {ev}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-medium text-[var(--color-navy-500)]">Status</span>
            <div className="flex items-center gap-3 pt-1">
              <StatusBadge status={webhook.enabled ? 'ACTIVE' : 'DISABLED'} />
              {canManage && (
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-xs text-[var(--color-navy-600)]">
                    {webhook.enabled ? 'Active' : 'Disabled'}
                  </span>
                  <Switch
                    checked={webhook.enabled}
                    onCheckedChange={handleToggleEnabled}
                    aria-label={`Toggle webhook ${webhook.url}`}
                    disabled={updateMutation.isPending}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Delivery History Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-navy-950)]">
              Delivery history
            </h2>
            <p className="text-xs text-[var(--color-navy-500)]">
              Recent webhook dispatch attempts and server responses
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => query.refetch()}
            disabled={query.isRefetching}
            className="text-xs"
          >
            <RotateCw className={`h-3.5 w-3.5 mr-1.5 ${query.isRefetching ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </Button>
        </div>

        {deliveries.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-neutral-100)] text-[var(--color-neutral-600)] mb-2">
              <Send className="h-5 w-5" aria-hidden="true" />
            </div>
            <h3 className="text-sm font-semibold text-[var(--color-navy-900)]">
              No deliveries logged yet
            </h3>
            <p className="text-xs text-[var(--color-navy-500)] mt-1">
              Deliveries will be recorded here when subscribed events are triggered in the sandbox.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {deliveries.map((delivery) => {
              const isExpanded = expandedDeliveryId === delivery.id;
              const isRetrying = retryingDeliveryId === delivery.id;

              return (
                <Card key={delivery.id} className="overflow-hidden">
                  <div
                    role="button"
                    tabIndex={0}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-[var(--color-neutral-50)] transition-colors"
                    onClick={() =>
                      setExpandedDeliveryId((prev) => (prev === delivery.id ? null : delivery.id))
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setExpandedDeliveryId((prev) => (prev === delivery.id ? null : delivery.id));
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <StatusBadge status={delivery.status} />
                      <div>
                        <div className="font-mono text-xs font-semibold text-[var(--color-navy-900)]">
                          {delivery.eventType}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-[var(--color-navy-500)] mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            {format(new Date(delivery.lastAttemptAt), 'd MMM, HH:mm:ss')}
                          </span>
                          <span>•</span>
                          <span>
                            HTTP {delivery.httpStatus ?? '—'}
                          </span>
                          <span>•</span>
                          <span>
                            {delivery.attemptCount} attempt{delivery.attemptCount > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {canManage && delivery.status === 'FAILED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs text-[var(--color-danger-600)] border-[var(--color-danger-200)] hover:bg-[var(--color-danger-50)]"
                          loading={isRetrying}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRetryDelivery(delivery);
                          }}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" aria-hidden="true" />
                          Retry
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        aria-label={isExpanded ? 'Collapse payload' : 'Expand payload'}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="h-4 w-4" aria-hidden="true" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Payload Details */}
                  {isExpanded && (
                    <div className="border-t border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] p-4 space-y-3 text-xs">
                      <div>
                        <span className="font-semibold text-[var(--color-navy-900)] block mb-1">
                          Request Payload (JSON)
                        </span>
                        <pre className="rounded-lg bg-[var(--color-navy-950)] text-emerald-300 p-3 font-mono text-[11px] overflow-x-auto leading-relaxed">
                          {JSON.stringify(delivery.payload, null, 2)}
                        </pre>
                      </div>

                      {delivery.responseSnippet && (
                        <div>
                          <span className="font-semibold text-[var(--color-navy-900)] block mb-1">
                            Endpoint Response Body
                          </span>
                          <pre className="rounded-lg bg-white border border-[var(--color-neutral-200)] text-[var(--color-navy-800)] p-3 font-mono text-[11px] overflow-x-auto leading-relaxed">
                            {delivery.responseSnippet}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Dialog for Rotating Secret */}
      <ConfirmationDialog
        open={confirmRotateOpen}
        onOpenChange={setConfirmRotateOpen}
        title="Rotate webhook signing secret"
        description="Are you sure you want to rotate this webhook signing secret? Any server verifying signatures with the current secret will reject incoming payloads until updated."
        confirmLabel="Rotate secret"
        cancelLabel="Cancel"
        destructive
        loading={rotateMutation.isPending}
        onConfirm={handleConfirmRotate}
      />

      {/* One-time New Secret Reveal Dialog */}
      <Dialog
        open={Boolean(revealedNewSecret)}
        onOpenChange={(open) => !open && setRevealedNewSecret(null)}
      >
        <DialogContent
          title="New webhook signing secret"
          description="Update your application server configuration with this new signing secret immediately."
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-xs text-amber-800 leading-relaxed">
                <strong>This is the only time the new secret will be displayed.</strong> Save it in your server's
                environment variables now.
              </p>
            </div>
            <div className="rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-navy-950)] p-4">
              <p className="font-mono text-xs text-emerald-300 break-all leading-relaxed select-all">
                {revealedNewSecret}
              </p>
            </div>
            <div className="flex items-center justify-between">
              <CopyButton value={revealedNewSecret ?? ''} label="Copy secret" />
              <DialogClose asChild>
                <Button variant="primary" size="sm">Done</Button>
              </DialogClose>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
