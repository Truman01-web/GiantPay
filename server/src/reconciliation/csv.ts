export function safeCsvCell(value:string|number|bigint){let text=String(value);if(/^[=+\-@\t\r]/.test(text))text=`'${text}`;return /[",\r\n]/.test(text)?`"${text.replaceAll('"','""')}"`:text;}
export function settlementCsv(row:{settlementId:string;reconciliationId:string;currency:string;periodStart:string;periodEnd:string;grossMinor:string|number|bigint;refundsMinor:string|number|bigint;feesMinor:string|number|bigint;netMinor:string|number|bigint}){
  const columns=['settlement_id','reconciliation_id','currency','period_start_utc','period_end_utc','gross_minor','refunds_minor','fees_minor','net_minor','external_transfer_executed'];
  const values=[row.settlementId,row.reconciliationId,row.currency,row.periodStart,row.periodEnd,row.grossMinor,row.refundsMinor,row.feesMinor,row.netMinor,'false'];
  return `${columns.join(',')}\r\n${values.map(safeCsvCell).join(',')}\r\n`;
}
