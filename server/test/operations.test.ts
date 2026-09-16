import {describe,expect,it,vi} from 'vitest';
import {MetricsRegistry} from '../src/operations/metrics.js';
import {GracefulLifecycle} from '../src/operations/lifecycle.js';
import {assertDisposableRestoreTarget,verifyLedgerIntegrity} from '../src/operations/recovery.js';
import {workerAllowed} from '../src/operations/controls.js';
import {decryptVersionedSecret,encryptVersionedSecret} from '../src/developer/webhookSecurity.js';
import {NotificationDeliveryWorker} from '../src/notifications/service.js';

describe('Phase 10 operational primitives',()=>{
 it('records bounded low-cardinality metrics and rejects sensitive labels',()=>{const metrics=new MetricsRegistry();metrics.increment('http_requests_total',{method:'GET',route:'/v1/incidents/:id',statusClass:'2xx'});expect(metrics.snapshot().counters).toEqual({'http_requests_total{method=GET,route=/v1/incidents/:id,statusClass=2xx}':1});for(const unsafe of ['person@example.com','+265991234567','gp_live_secret','bearer-secret','/v1/payments/pay_123456789012345678901234'])expect(()=>metrics.increment('http_requests_total',{method:'GET',route:unsafe,statusClass:'2xx'})).toThrow('UNSAFE_METRIC_LABEL');expect(()=>metrics.increment('custom_metric_total',{merchantId:'m1'})).toThrow('UNSAFE_METRIC_LABEL');});
 it('stops claims, bounds draining, closes dependencies, and makes repeated shutdown safe',async()=>{vi.useFakeTimers();const calls:string[]=[];let release!:()=>void;const drain=new Promise<void>(r=>release=r);const lifecycle=new GracefulLifecycle([{name:'worker',stopClaims:()=>{calls.push('stop');},drain:()=>drain,close:async()=>{calls.push('close');}}],25);const first=lifecycle.shutdown(),second=lifecycle.shutdown();expect(first).toBe(second);await vi.advanceTimersByTimeAsync(25);await expect(first).resolves.toEqual({timedOut:true});expect(calls).toEqual(['stop','close']);release();vi.useRealTimers();});
 it('fails closed when worker control state cannot be verified',async()=>{const db={query:vi.fn().mockRejectedValue(new Error('database unavailable'))};await expect(workerAllowed(db as any,'OUTBOX_PROCESSING_PAUSED')).resolves.toBe(false);});
 it('prevents notification workers from claiming when operational controls are active',async()=>{const db={query:vi.fn()};const worker=new NotificationDeliveryWorker(db as any,60,async()=>false);await expect(worker.claim('worker-a')).resolves.toEqual([]);expect(db.query).not.toHaveBeenCalled();});
 it('accepts only disposable restore databases ending in _test',()=>{expect(assertDisposableRestoreTarget('postgresql://localhost/restore_test')).toBe('restore_test');expect(()=>assertDisposableRestoreTarget('postgresql://localhost/production')).toThrow('RESTORE_TARGET_MUST_BE_DISPOSABLE_TEST_DATABASE');});
 it('detects ledger imbalance during restore verification',async()=>{const db={query:vi.fn().mockResolvedValue({rowCount:1,rows:[{transaction_id:'txn_1',currency:'MWK',balance:100}]})};await expect(verifyLedgerIntegrity(db as any)).rejects.toThrow('LEDGER_INTEGRITY_CHECK_FAILED');});
 it('decrypts known key versions and fails closed for unknown versions',()=>{const material='a'.repeat(32),value=encryptVersionedSecret('secret','v1',material);expect(decryptVersionedSecret(value,{v1:material})).toBe('secret');expect(()=>decryptVersionedSecret(value,{v2:'b'.repeat(32)})).toThrow('UNKNOWN_KEY_VERSION');});
});
