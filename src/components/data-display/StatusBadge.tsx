import { CheckCircle2, Clock, XCircle, AlertTriangle, RotateCcw, Ban, PauseCircle, Loader2, Search, ArrowUpCircle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { PaymentStatus, RefundStatus, CheckoutStatus } from '@/types/payments';
import type { MerchantApplicationStatus } from '@/types/onboarding';
import type { SettlementStatus } from '@/types/settlements';
import type { ReconciliationExceptionStatus, ReconciliationRunStatus } from '@/types/reconciliation';

type KnownStatus =
  | PaymentStatus
  | RefundStatus
  | CheckoutStatus
  | MerchantApplicationStatus
  | SettlementStatus
  | ReconciliationExceptionStatus
  | ReconciliationRunStatus;

const STATUS_CONFIG: Record<string, { label: string; variant: 'neutral' | 'blue' | 'success' | 'warning' | 'danger'; icon: typeof CheckCircle2 }> = {
  CREATED: { label: 'Created', variant: 'neutral', icon: Clock },
  REQUIRES_ACTION: { label: 'Requires action', variant: 'warning', icon: AlertTriangle },
  PROCESSING: { label: 'Processing', variant: 'blue', icon: Loader2 },
  PENDING: { label: 'Pending', variant: 'warning', icon: Clock },
  SUCCEEDED: { label: 'Succeeded', variant: 'success', icon: CheckCircle2 },
  SUCCESS: { label: 'Success', variant: 'success', icon: CheckCircle2 },
  FAILED: { label: 'Failed', variant: 'danger', icon: XCircle },
  EXPIRED: { label: 'Expired', variant: 'neutral', icon: Clock },
  CANCELLED: { label: 'Cancelled', variant: 'neutral', icon: Ban },
  PARTIALLY_REFUNDED: { label: 'Partially refunded', variant: 'warning', icon: RotateCcw },
  REFUND_PENDING: { label: 'Refund pending', variant: 'warning', icon: Clock },
  REFUNDED: { label: 'Refunded', variant: 'neutral', icon: RotateCcw },
  READY: { label: 'Ready', variant: 'blue', icon: CheckCircle2 },
  INITIALIZING: { label: 'Initializing', variant: 'neutral', icon: Loader2 },
  SUBMITTING: { label: 'Submitting', variant: 'blue', icon: Loader2 },
  REQUESTED: { label: 'Requested', variant: 'neutral', icon: Clock },
  PENDING_APPROVAL: { label: 'Pending approval', variant: 'warning', icon: Clock },
  APPROVED: { label: 'Approved', variant: 'success', icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', variant: 'danger', icon: XCircle },
  DRAFT: { label: 'Draft', variant: 'neutral', icon: Clock },
  SUBMITTED: { label: 'Submitted', variant: 'blue', icon: Clock },
  UNDER_REVIEW: { label: 'Under review', variant: 'warning', icon: Clock },
  INFORMATION_REQUIRED: { label: 'Information required', variant: 'warning', icon: AlertTriangle },
  SUSPENDED: { label: 'Suspended', variant: 'danger', icon: PauseCircle },
  ACTIVE: { label: 'Active', variant: 'success', icon: CheckCircle2 },
  REVOKED: { label: 'Revoked', variant: 'danger', icon: Ban },
  DELIVERED: { label: 'Delivered', variant: 'success', icon: CheckCircle2 },
  RETRYING: { label: 'Retrying', variant: 'warning', icon: RotateCcw },
  DISABLED: { label: 'Disabled', variant: 'neutral', icon: Ban },
  AVAILABLE: { label: 'Available', variant: 'success', icon: CheckCircle2 },
  COMPLETED: { label: 'Completed', variant: 'success', icon: CheckCircle2 },
  RUNNING: { label: 'Running', variant: 'blue', icon: Loader2 },
  OPEN: { label: 'Open', variant: 'warning', icon: AlertTriangle },
  INVESTIGATING: { label: 'Investigating', variant: 'blue', icon: Search },
  ACTION_REQUIRED: { label: 'Action required', variant: 'danger', icon: AlertTriangle },
  RESOLVED: { label: 'Resolved', variant: 'success', icon: CheckCircle2 },
  ESCALATED: { label: 'Escalated', variant: 'danger', icon: ArrowUpCircle },
};

/**
 * Renders any GiantPay status enum with icon + colour + text label together
 * — status is never communicated by colour alone (WCAG 1.4.1).
 */
export function StatusBadge({ status }: { status: KnownStatus | string }) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: 'neutral' as const, icon: Clock };
  const Icon = config.icon;
  const spinning = status === 'PROCESSING' || status === 'SUBMITTING' || status === 'INITIALIZING' || status === 'RUNNING';
  return (
    <Badge variant={config.variant}>
      <Icon className={spinning ? 'h-3 w-3 animate-spin' : 'h-3 w-3'} aria-hidden="true" />
      {config.label}
    </Badge>
  );
}
