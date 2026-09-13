import { describe,expect,it } from 'vitest';
import { evidenceHash,reconcileRecords,type ReconciliationRecord } from '../src/reconciliation/matching.js';
import { safeCsvCell,settlementCsv } from '../src/reconciliation/csv.js';

const end='2026-09-13T00:00:00.000Z';
const record=(overrides:Partial<ReconciliationRecord>={}):ReconciliationRecord=>({reference:'sandbox-reference-1',internalId:'payment-1',amountMinor:1000n,currency:'MWK',status:'SUCCEEDED',eventAt:'2026-09-12T10:00:00.000Z',receivedAt:'2026-09-12T10:00:01.000Z',ledgerPostingCount:1,ledgerBalanced:true,hasRequiredOutbox:true,refundPaymentValid:true,...overrides});

describe('deterministic reconciliation matching',()=>{
  it('matches exact records and produces order-independent source evidence hashes',()=>{const result=reconcileRecords([record()],[record()],end);expect(result).toMatchObject({matched:1,exceptions:[],sourceTotalMinor:1000n,internalTotalMinor:1000n});expect(result.sourceHash).toBe(evidenceHash([record()]));});
  it.each([
    ['AMOUNT_MISMATCH',{amountMinor:999n}],['CURRENCY_MISMATCH',{currency:'USD'}],['STATUS_MISMATCH',{status:'FAILED'}],
    ['LATE_PROVIDER_EVENT',{receivedAt:'2026-09-13T00:00:01.000Z'}],
  ] as const)('classifies %s exactly', (classification,change)=>expect(reconcileRecords([record()],[record(change)],end).exceptions.map(x=>x.classification)).toContain(classification));
  it('classifies missing and duplicate provider/internal records',()=>{expect(reconcileRecords([],[record()],end).exceptions[0]?.classification).toBe('MISSING_INTERNAL_RECORD');expect(reconcileRecords([record()],[],end).exceptions[0]?.classification).toBe('MISSING_PROVIDER_RECORD');expect(reconcileRecords([record(),record({internalId:'payment-2'})],[record()],end).exceptions.map(x=>x.classification)).toContain('DUPLICATE_INTERNAL_RECORD');expect(reconcileRecords([record()],[record(),record()],end).exceptions.map(x=>x.classification)).toContain('DUPLICATE_PROVIDER_RECORD');});
  it.each([
    ['LEDGER_IMBALANCE',{ledgerBalanced:false}],['MISSING_LEDGER_POSTING',{ledgerPostingCount:0}],['DUPLICATE_LEDGER_POSTING',{ledgerPostingCount:2}],['MISSING_OUTBOX_EVENT',{hasRequiredOutbox:false}],['REFUND_PAYMENT_RELATIONSHIP_MISMATCH',{refundPaymentValid:false}],
  ] as const)('classifies %s integrity failures', (classification,change)=>expect(reconcileRecords([record(change)],[record()],end).exceptions.map(x=>x.classification)).toContain(classification));
  it('uses integer minor-unit totals without floating point',()=>{const result=reconcileRecords([record({amountMinor:9007199254740993n})],[record({amountMinor:9007199254740993n})],end);expect(result.sourceTotalMinor).toBe(9007199254740993n);});
});

describe('sandbox settlement CSV',()=>{
  it('uses stable columns, explicit no-transfer status and CRLF encoding',()=>{const csv=settlementCsv({settlementId:'stl-1',reconciliationId:'rec-1',currency:'MWK',periodStart:'2026-09-12T00:00:00Z',periodEnd:end,grossMinor:1000n,refundsMinor:100n,feesMinor:20n,netMinor:880n});expect(csv.split('\r\n')[0]).toBe('settlement_id,reconciliation_id,currency,period_start_utc,period_end_utc,gross_minor,refunds_minor,fees_minor,net_minor,external_transfer_executed');expect(csv).toContain(',880,false\r\n');});
  it.each(['=1+1','+cmd','-2+3','@evil','\tformula','\rformula'])('neutralizes spreadsheet formula input %s',value=>expect(safeCsvCell(value).startsWith("'")||safeCsvCell(value).startsWith('"\'')).toBe(true));
  it('quotes commas, quotes and newlines safely',()=>expect(safeCsvCell('a,"b"\nc')).toBe('"a,""b""\nc"'));
});
