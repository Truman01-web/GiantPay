import { api, type RequestOptions } from './client';
import { env } from '@/app/config/env';

export type ReportType =
  | 'TRANSACTION_ACTIVITY'
  | 'REFUND_ACTIVITY'
  | 'PLATFORM_FEES'
  | 'MERCHANT_LEDGER'
  | 'RECONCILIATION_RESULTS'
  | 'SANDBOX_SETTLEMENT_SUMMARIES';

export interface OperationalReportSummary {
  reportType: ReportType;
  currency: 'MWK' | 'USD';
  periodStart: string;
  periodEnd: string;
  totalVolumeMinor: number;
  totalTransactions: number;
  totalFeesMinor: number;
  netSettlementMinor: number;
  generatedAt: string;
}

export interface OperationalReportExport {
  id: string;
  reportType: ReportType;
  currency: string;
  periodStart: string;
  periodEnd: string;
  rowCount: number;
  fileSizeBytes: number;
  sha256Hash: string;
  createdAt: string;
  status: 'COMPLETED' | 'FAILED';
}

export const reportsApi = {
  getSummary(params: {
    reportType: ReportType;
    currency: 'MWK' | 'USD';
    periodStart: string;
    periodEnd: string;
  }, options?: RequestOptions): Promise<OperationalReportSummary> {
    const query = new URLSearchParams({
      reportType: params.reportType,
      currency: params.currency,
      periodStart: params.periodStart,
      periodEnd: params.periodEnd,
    });
    return api.get<OperationalReportSummary>(`/reports/summary?${query.toString()}`, options);
  },

  listExports(params?: { page?: number; pageSize?: number }, options?: RequestOptions): Promise<{ items: OperationalReportExport[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.pageSize) query.set('pageSize', String(params.pageSize));
    const qs = query.toString();
    return api.get<{ items: OperationalReportExport[]; total: number }>(`/report-exports${qs ? `?${qs}` : ''}`, options);
  },

  createExport(
    data: {
      reportType: ReportType;
      currency: 'MWK' | 'USD';
      periodStart: string;
      periodEnd: string;
    },
    options?: RequestOptions,
  ): Promise<OperationalReportExport> {
    return api.post<OperationalReportExport>('/report-exports', data, options);
  },

  getDownloadUrl(id: string): string {
    return `${env.apiUrl}/v1/report-exports/${encodeURIComponent(id)}/download`;
  },
};
