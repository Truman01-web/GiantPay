import { createHash } from 'node:crypto';

export const exceptionClassifications=['MISSING_INTERNAL_RECORD','MISSING_PROVIDER_RECORD','DUPLICATE_INTERNAL_RECORD','DUPLICATE_PROVIDER_RECORD','AMOUNT_MISMATCH','CURRENCY_MISMATCH','STATUS_MISMATCH','LEDGER_IMBALANCE','MISSING_LEDGER_POSTING','DUPLICATE_LEDGER_POSTING','MISSING_OUTBOX_EVENT','LATE_PROVIDER_EVENT','REFUND_PAYMENT_RELATIONSHIP_MISMATCH'] as const;
export type ExceptionClassification=typeof exceptionClassifications[number];
export interface ReconciliationRecord { reference:string;internalId?:string;amountMinor:bigint;currency:string;status:string;eventAt:string;receivedAt?:string;ledgerPostingCount?:number;ledgerBalanced?:boolean;hasRequiredOutbox?:boolean;refundPaymentValid?:boolean }
export interface MatchException {classification:ExceptionClassification;reference:string;evidence:Record<string,unknown>}
export interface MatchResult {matched:number;unmatched:number;sourceCount:number;exceptions:MatchException[];sourceTotalMinor:bigint;internalTotalMinor:bigint;sourceHash:string}

const canonical=(value:unknown):string=>Array.isArray(value)?`[${value.map(canonical).join(',')}]`:value&&typeof value==='object'?`{${Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`:typeof value==='bigint'?JSON.stringify(value.toString()):JSON.stringify(value);
export const evidenceHash=(value:unknown)=>createHash('sha256').update(canonical(value)).digest('hex');

export function reconcileRecords(internal:ReconciliationRecord[],provider:ReconciliationRecord[],periodEnd:string):MatchResult{
  const exceptions:MatchException[]=[];
  const grouped=(rows:ReconciliationRecord[])=>{const map=new Map<string,ReconciliationRecord[]>();for(const row of rows)map.set(row.reference,[...(map.get(row.reference)??[]),row]);return map;};
  const left=grouped(internal),right=grouped(provider),refs=[...new Set([...left.keys(),...right.keys()])].sort();let matched=0;
  const add=(classification:ExceptionClassification,reference:string,evidence:Record<string,unknown>)=>exceptions.push({classification,reference,evidence});
  for(const reference of refs){const i=left.get(reference)??[],p=right.get(reference)??[];
    if(i.length>1)add('DUPLICATE_INTERNAL_RECORD',reference,{count:i.length,internalIds:i.map(x=>x.internalId).sort()});
    if(p.length>1)add('DUPLICATE_PROVIDER_RECORD',reference,{count:p.length});
    if(!i.length){add('MISSING_INTERNAL_RECORD',reference,{providerReference:reference});continue;}if(!p.length){add('MISSING_PROVIDER_RECORD',reference,{internalId:i[0]!.internalId});continue;}
    const a=i[0]!,b=p[0]!;let clean=i.length===1&&p.length===1;
    if(a.amountMinor!==b.amountMinor){add('AMOUNT_MISMATCH',reference,{internalMinor:a.amountMinor.toString(),providerMinor:b.amountMinor.toString()});clean=false;}
    if(a.currency!==b.currency){add('CURRENCY_MISMATCH',reference,{internalCurrency:a.currency,providerCurrency:b.currency});clean=false;}
    if(a.status!==b.status){add('STATUS_MISMATCH',reference,{internalStatus:a.status,providerStatus:b.status});clean=false;}
    if(b.receivedAt&&new Date(b.receivedAt)>new Date(periodEnd)){add('LATE_PROVIDER_EVENT',reference,{eventAt:b.eventAt,receivedAt:b.receivedAt,periodEnd});clean=false;}
    if(a.ledgerBalanced===false){add('LEDGER_IMBALANCE',reference,{internalId:a.internalId});clean=false;}
    if(a.ledgerPostingCount===0){add('MISSING_LEDGER_POSTING',reference,{internalId:a.internalId});clean=false;}else if((a.ledgerPostingCount??1)>1){add('DUPLICATE_LEDGER_POSTING',reference,{internalId:a.internalId,count:a.ledgerPostingCount});clean=false;}
    if(a.hasRequiredOutbox===false){add('MISSING_OUTBOX_EVENT',reference,{internalId:a.internalId});clean=false;}
    if(a.refundPaymentValid===false){add('REFUND_PAYMENT_RELATIONSHIP_MISMATCH',reference,{internalId:a.internalId});clean=false;}
    if(clean)matched++;
  }
  const sortedProvider=[...provider].sort((a,b)=>a.reference.localeCompare(b.reference));
  return{matched,unmatched:new Set(exceptions.map(x=>x.reference)).size,sourceCount:refs.length,exceptions,sourceTotalMinor:provider.reduce((n,x)=>n+x.amountMinor,0n),internalTotalMinor:internal.reduce((n,x)=>n+x.amountMinor,0n),sourceHash:evidenceHash(sortedProvider)};
}
