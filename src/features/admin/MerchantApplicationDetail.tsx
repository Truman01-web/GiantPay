import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { FileText, User, Building2, Flag, AlertTriangle, CheckCircle2, XCircle, PauseCircle, Info } from 'lucide-react';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';
import { PageHeader } from '@/components/navigation/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { Skeleton } from '@/components/feedback/Skeleton';
import { ErrorState } from '@/components/feedback/ErrorState';
import { Alert } from '@/components/feedback/Alert';
import { FormField } from '@/components/forms/FormField';
import { Textarea } from '@/components/ui/Textarea';
import { StatusBadge } from '@/components/data-display/StatusBadge';
import { toast } from '@/components/feedback/toastStore';
import { ApiError } from '@/services/api/errors';
import {
  useComplianceApplication,
  useComplianceDecisions,
  useBeginReview,
  useRequestInformation,
  useClassifyRisk,
  useApproveApplication,
  useRejectApplication,
  useSuspendApplication,
} from './useAdminQueries';
import type { ComplianceApplication, ComplianceDecision } from '@/services/api/admin';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4 text-[var(--color-neutral-500)]" aria-hidden="true" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-5">{children}</CardContent>
    </Card>
  );
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[length:var(--text-label)] text-[var(--color-neutral-500)]">{label}</dt>
      <dd className="mt-0.5 text-[length:var(--text-body)] text-[var(--color-neutral-900)]">{value ?? '—'}</dd>
    </div>
  );
}

function RiskPill({ level }: { level: ComplianceApplication['riskLevel'] }) {
  if (!level) return <span className="text-[var(--color-neutral-400)]">Not classified</span>;
  const colors: Record<string, string> = {
    LOW: 'bg-[var(--color-green-100)] text-[var(--color-green-800)]',
    MEDIUM: 'bg-[var(--color-amber-100)] text-[var(--color-amber-800)]',
    HIGH: 'bg-[var(--color-red-100)] text-[var(--color-red-800)]',
    PROHIBITED: 'bg-[var(--color-red-200)] text-[var(--color-red-900)] font-semibold',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[length:var(--text-label)] ${colors[level] ?? ''}`}>
      {level}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Action dialogs
// ---------------------------------------------------------------------------

type DialogKind = 'request-info' | 'classify-risk' | 'reject' | 'suspend' | null;

function RequestInfoDialog({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const [note, setNote] = useState('');
  const mutation = useRequestInformation(id);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    setError(null);
    try {
      await mutation.mutateAsync({ note });
      toast({ variant: 'success', title: 'Information request sent' });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to send request.');
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Request Additional Information" description="Describe what information or documents are needed.">
        {error && <div className="mb-4"><Alert variant="danger">{error}</Alert></div>}
        <FormField label="Note for merchant" required>
          {(fp) => (
            <Textarea
              {...fp}
              rows={4}
              placeholder="Please provide an updated certificate of incorporation and director ID..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          )}
        </FormField>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handle} loading={mutation.isPending} disabled={!note.trim()}>
            Send request
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ClassifyRiskDialog({
  id,
  current,
  onClose,
}: {
  id: string;
  current: ComplianceApplication['riskLevel'];
  onClose: () => void;
}) {
  const [riskLevel, setRiskLevel] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'PROHIBITED'>(current ?? 'LOW');
  const [note, setNote] = useState('');
  const mutation = useClassifyRisk(id);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    setError(null);
    try {
      await mutation.mutateAsync({ riskLevel, note: note || undefined });
      toast({ variant: 'success', title: `Risk classified as ${riskLevel}` });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to classify risk.');
    }
  }

  const levels: Array<{ value: 'LOW' | 'MEDIUM' | 'HIGH' | 'PROHIBITED'; label: string; desc: string }> = [
    { value: 'LOW', label: 'Low', desc: 'Standard merchant, no elevated risk indicators.' },
    { value: 'MEDIUM', label: 'Medium', desc: 'Some risk factors noted; enhanced monitoring required.' },
    { value: 'HIGH', label: 'High', desc: 'Significant risk indicators; requires senior sign-off.' },
    { value: 'PROHIBITED', label: 'Prohibited', desc: 'Business activity falls within prohibited categories.' },
  ];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Classify Risk Level" description="Select the AML/KYB risk classification for this merchant.">
        {error && <div className="mb-4"><Alert variant="danger">{error}</Alert></div>}
        <fieldset className="mb-4 flex flex-col gap-2">
          <legend className="sr-only">Risk level</legend>
          {levels.map((lvl) => (
            <label
              key={lvl.value}
              className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border p-3 transition-colors ${
                riskLevel === lvl.value
                  ? 'border-[var(--color-blue-500)] bg-[var(--color-blue-50)]'
                  : 'border-[var(--color-neutral-200)] hover:border-[var(--color-neutral-300)]'
              }`}
            >
              <input
                type="radio"
                className="mt-0.5"
                name="riskLevel"
                value={lvl.value}
                checked={riskLevel === lvl.value}
                onChange={() => setRiskLevel(lvl.value)}
              />
              <div>
                <span className="font-medium text-[var(--color-neutral-900)]">{lvl.label}</span>
                <p className="text-[length:var(--text-help)] text-[var(--color-neutral-600)]">{lvl.desc}</p>
              </div>
            </label>
          ))}
        </fieldset>
        <FormField label="Note (optional)">
          {(fp) => (
            <Textarea
              {...fp}
              rows={3}
              placeholder="Reasoning for this classification..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          )}
        </FormField>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handle} loading={mutation.isPending}>Save classification</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const mutation = useRejectApplication(id);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    setError(null);
    try {
      await mutation.mutateAsync({ reason, note });
      toast({ variant: 'success', title: 'Application rejected' });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to reject application.');
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Reject Application" description="This action will notify the merchant and close the application.">
        {error && <div className="mb-4"><Alert variant="danger">{error}</Alert></div>}
        <div className="flex flex-col gap-4">
          <FormField label="Rejection reason" required>
            {(fp) => (
              <Textarea
                {...fp}
                rows={3}
                placeholder="The business type is not supported in our current operating jurisdiction..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            )}
          </FormField>
          <FormField label="Internal note" required>
            {(fp) => (
              <Textarea
                {...fp}
                rows={3}
                placeholder="Internal compliance notes..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            )}
          </FormField>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={handle}
            loading={mutation.isPending}
            disabled={!reason.trim() || !note.trim()}
          >
            Reject application
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SuspendDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const mutation = useSuspendApplication(id);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    setError(null);
    try {
      await mutation.mutateAsync({ reason });
      toast({ variant: 'success', title: 'Merchant account suspended' });
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to suspend account.');
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent title="Suspend Account" description="The merchant will be unable to process payments while suspended.">
        {error && <div className="mb-4"><Alert variant="danger">{error}</Alert></div>}
        <FormField label="Reason for suspension" required>
          {(fp) => (
            <Textarea
              {...fp}
              rows={3}
              placeholder="Suspicious transaction pattern detected, pending investigation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          )}
        </FormField>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={handle}
            loading={mutation.isPending}
            disabled={!reason.trim()}
          >
            Suspend account
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Decision timeline
// ---------------------------------------------------------------------------

function DecisionTimeline({ decisions }: { decisions: ComplianceDecision[] }) {
  if (decisions.length === 0) return null;
  return (
    <ol className="flex flex-col gap-4">
      {decisions.map((d) => (
        <li key={d.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--color-neutral-300)] bg-white text-[length:var(--text-help)] font-medium text-[var(--color-neutral-600)]">
              {d.actorName.charAt(0).toUpperCase()}
            </span>
            <span className="mt-1 w-px flex-1 bg-[var(--color-neutral-200)]" aria-hidden="true" />
          </div>
          <div className="pb-4">
            <p className="text-[length:var(--text-body)] font-medium text-[var(--color-neutral-900)]">
              {d.action.replace(/_/g, ' ')}
            </p>
            <p className="text-[length:var(--text-help)] text-[var(--color-neutral-500)]">
              {d.actorName} · {format(new Date(d.createdAt), 'd MMM yyyy, HH:mm')}
            </p>
            {d.note && (
              <p className="mt-1 text-[length:var(--text-body)] text-[var(--color-neutral-600)]">"{d.note}"</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function MerchantApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const query = useComplianceApplication(id);
  const decisionsQuery = useComplianceDecisions(id);
  const beginReview = useBeginReview(id);
  const approveApplication = useApproveApplication(id);
  const [activeDialog, setActiveDialog] = useState<DialogKind>(null);

  if (query.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-56" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <ErrorState
        title="Couldn't load this application"
        message={query.error instanceof ApiError ? query.error.message : 'Please try again.'}
        onRetry={() => query.refetch()}
      />
    );
  }

  const app = query.data;
  const decisions = decisionsQuery.data?.items ?? [];

  const canBeginReview = app.status === 'SUBMITTED';
  const canApprove = app.status === 'UNDER_REVIEW' && app.riskLevel !== 'PROHIBITED';
  const canReject = app.status === 'SUBMITTED' || app.status === 'UNDER_REVIEW' || app.status === 'INFO_REQUESTED';
  const canSuspend = app.status === 'APPROVED';

  async function handleBeginReview() {
    try {
      await beginReview.mutateAsync();
      toast({ variant: 'success', title: 'Review started', description: 'Application is now under review.' });
    } catch (err) {
      toast({ variant: 'error', title: 'Failed to begin review', description: err instanceof ApiError ? err.message : 'Please try again.' });
    }
  }

  async function handleApprove() {
    try {
      await approveApplication.mutateAsync();
      toast({ variant: 'success', title: 'Application approved', description: `${app.businessName} has been approved.` });
    } catch (err) {
      toast({ variant: 'error', title: 'Failed to approve', description: err instanceof ApiError ? err.message : 'Please try again.' });
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[
          { label: 'Merchant Applications', to: '/admin/merchant-applications' },
          { label: app.businessName },
        ]}
      />

      <PageHeader
        title={app.businessName}
        description={`Application ID: ${app.id}`}
      >
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={app.status} />
          <RiskPill level={app.riskLevel} />
        </div>
      </PageHeader>

      {/* Action panel */}
      <Card className="border-[var(--color-blue-200)] bg-[var(--color-blue-50)]">
        <CardContent className="p-4">
          <p className="mb-3 text-[length:var(--text-label)] font-semibold text-[var(--color-blue-900)]">
            Available Actions
          </p>
          <div className="flex flex-wrap gap-2">
            {canBeginReview && (
              <Button
                size="sm"
                onClick={handleBeginReview}
                loading={beginReview.isPending}
              >
                Begin Review
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveDialog('classify-risk')}
            >
              <Flag className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
              Classify Risk
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveDialog('request-info')}
            >
              <Info className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
              Request Info
            </Button>
            {canApprove && (
              <Button
                size="sm"
                variant="outline"
                className="border-[var(--color-green-600)] text-[var(--color-green-700)] hover:bg-[var(--color-green-50)]"
                onClick={handleApprove}
                loading={approveApplication.isPending}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                Approve
              </Button>
            )}
            {canReject && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setActiveDialog('reject')}
              >
                <XCircle className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                Reject
              </Button>
            )}
            {canSuspend && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setActiveDialog('suspend')}
              >
                <PauseCircle className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                Suspend
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Business information */}
          <Section title="Business Information" icon={Building2}>
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <KV label="Legal name" value={app.businessName} />
              <KV label="Business type" value={app.businessType} />
              <KV label="Registration number" value={app.registrationNumber} />
              <KV label="Tax number (TPIN)" value={app.taxNumber} />
              <KV label="Submitted" value={format(new Date(app.submittedAt), 'd MMM yyyy, HH:mm')} />
              <KV label="Reviewed by" value={app.reviewedBy} />
            </dl>
            {app.addresses && app.addresses.length > 0 && (
              <div className="mt-4 border-t border-[var(--color-neutral-100)] pt-4">
                <p className="mb-2 text-[length:var(--text-label)] text-[var(--color-neutral-500)]">Addresses</p>
                {app.addresses.map((addr, i) => (
                  <p key={i} className="text-[length:var(--text-body)] text-[var(--color-neutral-800)]">
                    <span className="font-medium">{addr.type}:</span> {addr.addressLine1}, {addr.city}, {addr.country}
                  </p>
                ))}
              </div>
            )}
          </Section>

          {/* Directors & beneficial owners */}
          {(app.directors && app.directors.length > 0) || (app.beneficialOwners && app.beneficialOwners.length > 0) ? (
            <Section title="Directors & Beneficial Owners" icon={User}>
              {app.directors && app.directors.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-[length:var(--text-label)] font-medium text-[var(--color-neutral-600)]">Directors</p>
                  <div className="flex flex-col gap-2">
                    {app.directors.map((d, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-neutral-200)] px-3 py-2">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-navy-100)] text-[length:var(--text-label)] font-medium text-[var(--color-navy-700)]">
                          {d.fullName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-[var(--color-neutral-900)]">{d.fullName}</p>
                          <p className="text-[length:var(--text-help)] text-[var(--color-neutral-500)]">
                            {d.nationality}
                            {d.isPep && (
                              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-[var(--color-amber-100)] px-2 py-0.5 text-[length:var(--text-help)] font-medium text-[var(--color-amber-800)]">
                                <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" /> PEP
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {app.beneficialOwners && app.beneficialOwners.length > 0 && (
                <div>
                  <p className="mb-2 text-[length:var(--text-label)] font-medium text-[var(--color-neutral-600)]">Beneficial Owners</p>
                  <div className="flex flex-col gap-2">
                    {app.beneficialOwners.map((bo, i) => (
                      <div key={i} className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-neutral-200)] px-3 py-2">
                        <span className="font-medium text-[var(--color-neutral-900)]">{bo.fullName}</span>
                        <span className="text-[length:var(--text-label)] text-[var(--color-neutral-600)]">
                          {(bo.percentageBasisPoints / 100).toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          ) : null}

          {/* Evidence files */}
          {app.evidenceFiles && app.evidenceFiles.length > 0 && (
            <Section title="Evidence Documents" icon={FileText}>
              <ul className="flex flex-col gap-2">
                {app.evidenceFiles.map((f) => (
                  <li key={f.id} className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-neutral-200)] px-3 py-2.5">
                    <FileText className="h-4 w-4 shrink-0 text-[var(--color-neutral-400)]" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--color-neutral-900)]">{f.originalFilename}</p>
                      <p className="text-[length:var(--text-help)] text-[var(--color-neutral-500)]">{f.category.replace(/_/g, ' ')}</p>
                    </div>
                    <Badge variant="neutral" className="ml-auto shrink-0">
                      {f.id}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>

        {/* Sidebar: decisions + declarations */}
        <div className="space-y-6">
          {/* Decision timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Decision History</CardTitle>
            </CardHeader>
            <CardContent className="pb-5">
              {decisionsQuery.isPending ? (
                <Skeleton className="h-24" />
              ) : decisions.length === 0 ? (
                <p className="text-[length:var(--text-body)] text-[var(--color-neutral-500)]">No decisions recorded yet.</p>
              ) : (
                <DecisionTimeline decisions={decisions} />
              )}
            </CardContent>
          </Card>

          {/* Declarations */}
          {app.declarations && Object.keys(app.declarations).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Declarations</CardTitle>
              </CardHeader>
              <CardContent className="pb-5">
                <ul className="flex flex-col gap-2">
                  {Object.entries(app.declarations).map(([key, val]) => (
                    <li key={key} className="flex items-center gap-2">
                      {val ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--color-green-600)]" aria-hidden="true" />
                      ) : (
                        <XCircle className="h-4 w-4 shrink-0 text-[var(--color-red-500)]" aria-hidden="true" />
                      )}
                      <span className="text-[length:var(--text-body)] text-[var(--color-neutral-800)]">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Action dialogs */}
      {activeDialog === 'request-info' && id && (
        <RequestInfoDialog id={id} onClose={() => setActiveDialog(null)} />
      )}
      {activeDialog === 'classify-risk' && id && (
        <ClassifyRiskDialog id={id} current={app.riskLevel} onClose={() => setActiveDialog(null)} />
      )}
      {activeDialog === 'reject' && id && (
        <RejectDialog id={id} onClose={() => setActiveDialog(null)} />
      )}
      {activeDialog === 'suspend' && id && (
        <SuspendDialog id={id} onClose={() => setActiveDialog(null)} />
      )}
    </div>
  );
}
