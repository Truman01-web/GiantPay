import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { StatCard } from '@/components/data-display/StatCard';
import { AmountDisplay } from '@/components/data-display/AmountDisplay';
import { CopyButton } from '@/components/ui/CopyButton';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { reportsApi } from '@/services/api/reports';
import type { ReportType, OperationalReportSummary, OperationalReportExport } from '@/services/api/reports';

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  TRANSACTION_ACTIVITY: 'Transaction Activity',
  REFUND_ACTIVITY: 'Refund Activity',
  PLATFORM_FEES: 'Platform Fees',
  MERCHANT_LEDGER: 'Merchant Ledger',
  RECONCILIATION_RESULTS: 'Reconciliation Results',
  SANDBOX_SETTLEMENT_SUMMARIES: 'Sandbox Settlement Summaries',
};

const INITIAL_END_DATE = new Date().toISOString().split('T')[0];
const INITIAL_START_DATE = new Date(new Date().setUTCDate(new Date().getUTCDate() - 30)).toISOString().split('T')[0];

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function ReportsView() {
  const [activeTab, setActiveTab] = useState<'summary' | 'exports'>('summary');
  const [reportType, setReportType] = useState<ReportType>('TRANSACTION_ACTIVITY');
  const [currency, setCurrency] = useState<'MWK' | 'USD'>('MWK');

  const [periodStart, setPeriodStart] = useState(INITIAL_START_DATE);
  const [periodEnd, setPeriodEnd] = useState(INITIAL_END_DATE);

  const [summary, setSummary] = useState<OperationalReportSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [exportsList, setExportsList] = useState<OperationalReportExport[]>([]);
  const [exportsLoading, setExportsLoading] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportCreating, setExportCreating] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const fetchSummary = async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const data = await reportsApi.getSummary({
        reportType,
        currency,
        periodStart: new Date(periodStart).toISOString(),
        periodEnd: new Date(`${periodEnd}T23:59:59.999Z`).toISOString(),
      });
      setSummary(data);
    } catch (error: unknown) {
      setSummaryError(errorMessage(error, 'Failed to fetch report summary.'));
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchExports = async () => {
    setExportsLoading(true);
    try {
      const res = await reportsApi.listExports();
      setExportsList(res.items);
    } catch (error: unknown) {
      setExportError(errorMessage(error, 'Failed to fetch report exports.'));
    } finally {
      setExportsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'summary') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchSummary();
    } else {
      fetchExports();
    }
    // These fetch functions intentionally capture the currently applied filters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const handleCreateExport = async (e: FormEvent) => {
    e.preventDefault();
    setExportCreating(true);
    setExportError(null);
    try {
      await reportsApi.createExport(
        {
          reportType,
          currency,
          periodStart: new Date(periodStart).toISOString(),
          periodEnd: new Date(`${periodEnd}T23:59:59.999Z`).toISOString(),
        },
        { idempotencyKey: crypto.randomUUID() },
      );
      setIsExportDialogOpen(false);
      fetchExports();
    } catch (error: unknown) {
      setExportError(errorMessage(error, 'Failed to generate report export.'));
    } finally {
      setExportCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-navy-900)]">Operational Reports</h1>
          <p className="text-sm text-[var(--color-neutral-600)] mt-1">
            Backend-calculated operational activity, fee breakdowns, and sandbox reconciliation exports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg bg-[var(--color-neutral-100)] p-1">
            <button
              onClick={() => setActiveTab('summary')}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === 'summary'
                  ? 'bg-white text-[var(--color-navy-900)] shadow-sm'
                  : 'text-[var(--color-neutral-600)] hover:text-[var(--color-navy-900)]'
              }`}
            >
              Summary View
            </button>
            <button
              onClick={() => setActiveTab('exports')}
              className={`rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                activeTab === 'exports'
                  ? 'bg-white text-[var(--color-navy-900)] shadow-sm'
                  : 'text-[var(--color-neutral-600)] hover:text-[var(--color-navy-900)]'
              }`}
            >
              CSV Exports
            </button>
          </div>

          <Button
            size="sm"
            onClick={() => setIsExportDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            Export CSV
          </Button>
        </div>
      </div>

      {/* Honest Disclaimer Banner */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4 text-xs text-blue-800 flex items-start gap-3">
        <svg className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div>
          <span className="font-semibold">Sandbox Operational Notice:</span> Periods are UTC and limited to a 93-day range. These records reflect simulated backend ledger postings and do not constitute official bank statements or tax filings.
        </div>
      </div>

      {/* Filter Controls Card */}
      <Card className="p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label htmlFor="report-type" className="block text-xs font-medium text-[var(--color-neutral-700)] mb-1">
              Report Type
            </label>
            <select
              id="report-type"
              className="h-10 w-full rounded-[var(--radius-sm)] border border-[var(--color-neutral-300)] bg-white px-3 text-sm"
              value={reportType}
              onChange={(event) => setReportType(event.target.value as ReportType)}
            >
              {Object.entries(REPORT_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="report-currency" className="block text-xs font-medium text-[var(--color-neutral-700)] mb-1">
              Currency
            </label>
            <select
              id="report-currency"
              className="h-10 w-full rounded-[var(--radius-sm)] border border-[var(--color-neutral-300)] bg-white px-3 text-sm"
              value={currency}
              onChange={(event) => setCurrency(event.target.value as 'MWK' | 'USD')}
            >
              <option value="MWK">Malawian Kwacha (MWK)</option>
              <option value="USD">US Dollar (USD)</option>
            </select>
          </div>

          <div>
            <label htmlFor="report-start" className="block text-xs font-medium text-[var(--color-neutral-700)] mb-1">
              Start Date (UTC)
            </label>
            <Input
              id="report-start"
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="report-end" className="block text-xs font-medium text-[var(--color-neutral-700)] mb-1">
              End Date (UTC)
            </label>
            <div className="flex gap-2">
              <Input
                id="report-end"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
              <Button
                variant="outline"
                onClick={fetchSummary}
                disabled={summaryLoading}
                className="shrink-0"
              >
                {summaryLoading ? 'Loading...' : 'Apply'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Content depending on Active Tab */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          {summaryError && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
              {summaryError}
            </div>
          )}

          {summaryLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-28 rounded-2xl bg-[var(--color-neutral-100)] animate-pulse" />
              ))}
            </div>
          ) : summary ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Gross Volume"
                value={<AmountDisplay amountMinor={Number(summary.grossPaymentMinor)} currency={summary.currency} />}
                subtitle="Aggregated transaction value"
              />
              <StatCard
                title="Total Transactions"
                value={summary.successfulPaymentCount.toLocaleString()}
                subtitle="Completed processing events"
              />
              <StatCard
                title="Calculated Platform Fees"
                value={<AmountDisplay amountMinor={Number(summary.feeMinor)} currency={summary.currency} />}
                subtitle="Calculated gateway fees"
              />
              <StatCard
                title="Net Sandbox Settlement"
                value={<AmountDisplay amountMinor={Number(summary.netMerchantMinor)} currency={summary.currency} />}
                subtitle="Simulated batch ledger balance"
              />
            </div>
          ) : null}

          <Card className="p-6">
            <h3 className="text-base font-semibold text-[var(--color-navy-900)] mb-3">
              Reporting Specifications
            </h3>
            <div className="grid sm:grid-cols-2 gap-4 text-xs text-[var(--color-neutral-600)]">
              <div className="p-3 rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)]">
                <span className="font-semibold text-[var(--color-navy-900)]">Rounding & Minor Units:</span>
                <p className="mt-1">All currency amounts are stored and calculated in integer minor units (tamabala / cents) to prevent floating-point discrepancies.</p>
              </div>
              <div className="p-3 rounded-lg border border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)]">
                <span className="font-semibold text-[var(--color-navy-900)]">Audit Trail:</span>
                <p className="mt-1">Every summary calculation and CSV download creates an append-only cryptographic event logged in the operational audit table.</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'exports' && (
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--color-neutral-200)] flex items-center justify-between">
            <h3 className="font-semibold text-sm text-[var(--color-navy-900)]">Available CSV Exports</h3>
            <span className="text-xs text-[var(--color-neutral-500)]">{exportsList.length} exports</span>
          </div>

          {exportsLoading ? (
            <div className="p-8 text-center text-sm text-[var(--color-neutral-500)]">Loading exports...</div>
          ) : exportsList.length === 0 ? (
            <div className="p-8 text-center text-sm text-[var(--color-neutral-500)]">
              No report exports found. Click &quot;Export CSV&quot; above to create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[var(--color-neutral-200)] bg-[var(--color-neutral-50)] text-[var(--color-neutral-500)] uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">Report Type</th>
                    <th className="px-4 py-3">Currency</th>
                    <th className="px-4 py-3">Period (UTC)</th>
                    <th className="px-4 py-3">Rows</th>
                    <th className="px-4 py-3">File Size</th>
                    <th className="px-4 py-3">SHA-256 Hash</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-neutral-200)]">
                  {exportsList.map((exp) => (
                    <tr key={exp.id} className="hover:bg-[var(--color-neutral-50)]">
                      <td className="px-4 py-3 font-medium text-[var(--color-navy-900)]">
                        {REPORT_TYPE_LABELS[exp.reportType] || exp.reportType}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="neutral">{exp.currency}</Badge>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-neutral-600)]">
                        {new Date(exp.periodStart).toLocaleDateString()} – {new Date(exp.periodEnd).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">{exp.rowCount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-[var(--color-neutral-500)]">{exp.rowCount.toLocaleString()} rows</td>
                      <td className="px-4 py-3 font-mono text-[11px] text-[var(--color-neutral-500)]">
                        <div className="flex items-center gap-1">
                          <span>{exp.contentSha256.slice(0, 12)}...</span>
                          <CopyButton value={exp.contentSha256} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={reportsApi.getDownloadUrl(exp.id)}
                          download={`report_${exp.id}.csv`}
                          className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Download
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* Create Export Modal Dialog */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent title="Generate Sandbox Report Export">
          <form onSubmit={handleCreateExport} className="space-y-4">
          {exportError && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {exportError}
            </div>
          )}
          <div>
            <label htmlFor="export-report-type" className="block text-xs font-medium text-[var(--color-neutral-700)] mb-1">
              Report Category
            </label>
            <select
              id="export-report-type"
              className="h-10 w-full rounded-[var(--radius-sm)] border border-[var(--color-neutral-300)] bg-white px-3 text-sm"
              value={reportType}
              onChange={(event) => setReportType(event.target.value as ReportType)}
            >
              {Object.entries(REPORT_TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="export-currency" className="block text-xs font-medium text-[var(--color-neutral-700)] mb-1">
              Currency
            </label>
            <select
              id="export-currency"
              className="h-10 w-full rounded-[var(--radius-sm)] border border-[var(--color-neutral-300)] bg-white px-3 text-sm"
              value={currency}
              onChange={(event) => setCurrency(event.target.value as 'MWK' | 'USD')}
            >
              <option value="MWK">Malawian Kwacha (MWK)</option>
              <option value="USD">US Dollar (USD)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="export-start" className="block text-xs font-medium text-[var(--color-neutral-700)] mb-1">
                Start Date (UTC)
              </label>
              <Input
                id="export-start"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="export-end" className="block text-xs font-medium text-[var(--color-neutral-700)] mb-1">
                End Date (UTC)
              </label>
              <Input
                id="export-end"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                required
              />
            </div>
          </div>

          <p className="text-[11px] text-[var(--color-neutral-500)]">
            Exports are immutable, deterministic CSV files with cryptographic SHA-256 hashes. Maximum 10,000 rows.
          </p>

          <div className="flex justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsExportDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={exportCreating}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {exportCreating ? 'Creating Export...' : 'Generate Export'}
            </Button>
          </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
