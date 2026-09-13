import { createHash } from 'node:crypto';
import { safeCsvCell } from '../reconciliation/csv.js';

export const REPORT_TYPES=['TRANSACTION_ACTIVITY','REFUND_ACTIVITY','PLATFORM_FEES','MERCHANT_LEDGER','RECONCILIATION_RESULTS','SANDBOX_SETTLEMENT_SUMMARIES'] as const;
export const SUPPORTED_REPORT_CURRENCIES=['MWK','USD'] as const;
export type ReportType=(typeof REPORT_TYPES)[number];
export const MAX_REPORT_DAYS=93,MAX_REPORT_ROWS=10_000;
export class ReportError extends Error { constructor(public code:string,message:string,public statusCode=422){super(message);} }
export function validateReportRequest(value:{reportType:string;currency:string;periodStart:string;periodEnd:string}){
  if(!REPORT_TYPES.includes(value.reportType as ReportType))throw new ReportError('UNSUPPORTED_REPORT_TYPE','The requested report type is unsupported.');
  if(!SUPPORTED_REPORT_CURRENCIES.includes(value.currency as any))throw new ReportError('UNSUPPORTED_CURRENCY','Currency is not supported for operational reports.');
  const start=new Date(value.periodStart),end=new Date(value.periodEnd);
  if(!Number.isFinite(start.valueOf())||!Number.isFinite(end.valueOf())||end<=start)throw new ReportError('INVALID_REPORTING_PERIOD','periodEnd must follow periodStart.');
  if(end.valueOf()-start.valueOf()>MAX_REPORT_DAYS*86_400_000)throw new ReportError('REPORTING_RANGE_EXCEEDED',`Reporting periods cannot exceed ${MAX_REPORT_DAYS} days.`);
  return {...value,reportType:value.reportType as ReportType,periodStart:start.toISOString(),periodEnd:end.toISOString()};
}
export const sha256=(value:string)=>createHash('sha256').update(value).digest('hex');
const ordered=(value:unknown):unknown=>Array.isArray(value)?value.map(ordered):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,ordered(item)])):value;
export const canonical=(value:unknown)=>JSON.stringify(ordered(value));
export function reportCsv(columns:string[],rows:Record<string,unknown>[]){return `${columns.join(',')}\r\n${rows.map(row=>columns.map(column=>safeCsvCell(String(row[column]??''))).join(',')).join('\r\n')}${rows.length?'\r\n':''}`;}
export function safeAuditMetadata(value:unknown):unknown{
  const blocked=/password|session|authorization|api.?key|verifier|secret|token|encryption|error|stack/i;
  if(Array.isArray(value))return value.map(safeAuditMetadata);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>!blocked.test(key)).map(([key,item])=>[key,safeAuditMetadata(item)]));
  return value;
}
