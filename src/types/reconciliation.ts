export type ReconciliationRunStatus = 'RUNNING' | 'COMPLETED' | 'FAILED';

export type ReconciliationExceptionStatus = 'OPEN' | 'INVESTIGATING' | 'ACTION_REQUIRED' | 'RESOLVED' | 'ESCALATED';

export type ReconciliationExceptionType =
  | 'AMOUNT_MISMATCH'
  | 'STATUS_MISMATCH'
  | 'MISSING_IN_PROVIDER'
  | 'MISSING_IN_LEDGER';

export type ReconciliationExceptionPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ReconciliationRunListItem {
  id: string;
  provider: string;
  periodStart: string;
  periodEnd: string;
  totalRecords: number;
  matchedCount: number;
  unmatchedCount: number;
  exceptionCount: number;
  status: ReconciliationRunStatus;
  completedAt: string | null;
}

export interface ReconciliationExceptionNote {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export interface ReconciliationException {
  id: string;
  runId: string;
  transactionId: string;
  transactionReference: string;
  type: ReconciliationExceptionType;
  /** Backend-formatted display strings (an amount or a status label,
   * depending on `type`) — never re-derived or recomputed on the frontend. */
  expected: string;
  observed: string;
  difference: string | null;
  owner: { id: string; name: string } | null;
  priority: ReconciliationExceptionPriority;
  status: ReconciliationExceptionStatus;
  createdAt: string;
  notes: ReconciliationExceptionNote[];
}

export interface ReconciliationRun extends ReconciliationRunListItem {
  exceptions: ReconciliationException[];
}
