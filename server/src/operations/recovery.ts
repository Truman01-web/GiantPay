import type { Db } from '../db.js';

export function assertDisposableRestoreTarget(connectionString:string){
 const url=new URL(connectionString),database=url.pathname.slice(1);
 if(!database.endsWith('_test'))throw new Error('RESTORE_TARGET_MUST_BE_DISPOSABLE_TEST_DATABASE');
 return database;
}

export async function verifyLedgerIntegrity(db:Db){
 const imbalance=await db.query(`SELECT transaction_id,currency,sum(CASE WHEN direction='CREDIT' THEN amount_minor ELSE -amount_minor END) balance FROM ledger_entries GROUP BY transaction_id,currency HAVING sum(CASE WHEN direction='CREDIT' THEN amount_minor ELSE -amount_minor END)<>0 LIMIT 1`);
 if(imbalance.rowCount)throw new Error('LEDGER_INTEGRITY_CHECK_FAILED');
 return {balanced:true};
}
