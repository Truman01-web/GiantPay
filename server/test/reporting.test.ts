import {describe,expect,it} from 'vitest';
import {MAX_REPORT_DAYS,ReportError,reportCsv,safeAuditMetadata,sha256,validateReportRequest} from '../src/reporting/reporting.js';
describe('sandbox operational reporting',()=>{
  const base={reportType:'TRANSACTION_ACTIVITY',currency:'MWK',periodStart:'2026-01-01T00:00:00Z',periodEnd:'2026-01-02T00:00:00Z'};
  it('validates periods and maximum range',()=>{expect(validateReportRequest(base).reportType).toBe('TRANSACTION_ACTIVITY');expect(()=>validateReportRequest({...base,periodEnd:base.periodStart})).toThrowError(expect.objectContaining({code:'INVALID_REPORTING_PERIOD'}));expect(()=>validateReportRequest({...base,periodEnd:new Date(Date.parse(base.periodStart)+(MAX_REPORT_DAYS+1)*86400000).toISOString()})).toThrowError(expect.objectContaining({code:'REPORTING_RANGE_EXCEEDED'}));});
  it('creates deterministic, quoted and formula-safe CSV with integer text',()=>{const rows=[{id:'=cmd',amount_minor:'9007199254740993',note:'a,"b"'}];const a=reportCsv(['id','amount_minor','note'],rows);expect(a).toBe(reportCsv(['id','amount_minor','note'],rows));expect(a).toContain("'=cmd,9007199254740993,\"a,\"\"b\"\"\"");expect(sha256(a)).toHaveLength(64);});
  it('redacts sensitive audit metadata recursively',()=>expect(safeAuditMetadata({ok:'yes',authorization:'Bearer x',nested:{password:'x',reference:'safe'}})).toEqual({ok:'yes',nested:{reference:'safe'}}));
  it('uses stable errors for unsupported types and currencies',()=>{expect(()=>validateReportRequest({...base,reportType:'TAX_RETURN'})).toThrowError(expect.objectContaining({code:'UNSUPPORTED_REPORT_TYPE'}));expect(()=>validateReportRequest({...base,currency:'mwk'})).toThrowError(ReportError);});
});
