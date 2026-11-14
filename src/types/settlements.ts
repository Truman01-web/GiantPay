export type SettlementStatus = 'DRAFT' | 'AWAITING_APPROVAL' | 'APPROVED' | 'EXPORTED' | 'CANCELLED';

export interface SettlementListItem {
  id: string;
  currency: string;
  periodStart: string;
  periodEnd: string;
  status: SettlementStatus;
  grossMinor: string;
  refundsMinor: string;
  feesMinor: string;
  netMinor: string;
  createdAt: string;
  createdBy: string | null;
  submittedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  exportedAt: string | null;
  externalTransferExecuted: false;
  sandboxOnly: true;
}

export type Settlement = SettlementListItem;
