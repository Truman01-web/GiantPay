import { http, HttpResponse } from 'msw';
import { env } from '@/app/config/env';
import type { OperationalReportExport, ReportType } from '@/services/api/reports';

const BASE_URL = `${env.apiUrl}/v1`;

const mockExports: OperationalReportExport[] = [
  {
    id: 'exp_01j7abc123',
    reportType: 'TRANSACTION_ACTIVITY',
    currency: 'MWK',
    periodStart: new Date(Date.now() - 30 * 86400000).toISOString(),
    periodEnd: new Date().toISOString(),
    rowCount: 142,
    fileSizeBytes: 24500,
    sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    status: 'COMPLETED',
  },
  {
    id: 'exp_01j7abc456',
    reportType: 'RECONCILIATION_RESULTS',
    currency: 'MWK',
    periodStart: new Date(Date.now() - 14 * 86400000).toISOString(),
    periodEnd: new Date().toISOString(),
    rowCount: 38,
    fileSizeBytes: 8200,
    sha256Hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    status: 'COMPLETED',
  },
];

export const reportsHandlers = [
  http.get(`${BASE_URL}/reports/summary`, ({ request }) => {
    const url = new URL(request.url);
    const currency = (url.searchParams.get('currency') ?? 'MWK') as 'MWK' | 'USD';
    const reportType = (url.searchParams.get('reportType') ?? 'TRANSACTION_ACTIVITY') as ReportType;
    const periodStart = url.searchParams.get('periodStart') ?? new Date(Date.now() - 30 * 86400000).toISOString();
    const periodEnd = url.searchParams.get('periodEnd') ?? new Date().toISOString();

    return HttpResponse.json({
      reportType,
      currency,
      periodStart,
      periodEnd,
      totalVolumeMinor: 485000000,
      totalTransactions: 312,
      totalFeesMinor: 7275000,
      netSettlementMinor: 477725000,
      generatedAt: new Date().toISOString(),
    });
  }),

  http.get(`${BASE_URL}/report-exports`, () => {
    return HttpResponse.json({
      items: mockExports,
      total: mockExports.length,
    });
  }),

  http.post(`${BASE_URL}/report-exports`, async ({ request }) => {
    const body = (await request.json()) as Pick<OperationalReportExport, 'reportType' | 'currency' | 'periodStart' | 'periodEnd'>;
    const newExport: OperationalReportExport = {
      id: `exp_${crypto.randomUUID().slice(0, 8)}`,
      reportType: body.reportType,
      currency: body.currency,
      periodStart: body.periodStart,
      periodEnd: body.periodEnd,
      rowCount: 45,
      fileSizeBytes: 9800,
      sha256Hash: 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
      createdAt: new Date().toISOString(),
      status: 'COMPLETED',
    };
    mockExports.unshift(newExport);
    return HttpResponse.json(newExport, { status: 201 });
  }),

  http.get(`${BASE_URL}/report-exports/:id/download`, ({ params }) => {
    const csvContent =
      'Date,Reference,Type,AmountMinor,Currency,Status,FeeMinor\n' +
      `2026-09-10,gp_tx_001,PAYMENT,5000000,MWK,SUCCEEDED,75000\n` +
      `2026-09-11,gp_tx_002,PAYMENT,12500000,MWK,SUCCEEDED,187500\n` +
      `2026-09-12,gp_rf_001,REFUND,-2000000,MWK,COMPLETED,0\n`;

    return new HttpResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="report_${params.id}.csv"`,
      },
    });
  }),
];
