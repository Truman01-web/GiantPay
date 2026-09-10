import { apiClient } from './client';

export interface DashboardSummary {
  environment: 'sandbox' | 'production';
  currency: string;
  totalProcessed: { amountMinor: number };
  successfulCount: number;
  pendingCount: number;
  failedCount: number;
  refundedAmountMinor: number;
  feesAmountMinor: number;
  successRate: number;
  reconciliation: { matched: number; unmatched: number; exceptions: number };
  settlements: { available: number; pending: number; processing: number; completed: number };
  attentionQueue: Array<{
    id: string;
    kind: 'FAILED_WEBHOOK' | 'INFORMATION_REQUIRED' | 'RECONCILIATION_EXCEPTION';
    label: string;
    occurredAt: string;
    href: string;
  }>;
  recentTransactions: Array<{
    id: string;
    reference: string;
    customerName: string | null;
    amountMinor: number;
    status: string;
    createdAt: string;
  }>;
}

export interface VolumePoint {
  date: string;
  volumeMinor: number;
  transactionCount: number;
  successRate: number;
}

export const dashboardApi = {
  getSummary: (params: { from: string; to: string }, options?: { signal?: AbortSignal }) =>
    apiClient.get<DashboardSummary>(`/dashboard/summary?from=${params.from}&to=${params.to}`, options),

  getVolume: (params: { from: string; to: string }, options?: { signal?: AbortSignal }) =>
    apiClient.get<VolumePoint[]>(`/dashboard/volume?from=${params.from}&to=${params.to}`, options),
};
