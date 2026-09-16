import { describe,expect,it,vi } from 'vitest';
import { buildApp } from '../src/app.js';
import type { Config } from '../src/config.js';
import type { Db } from '../src/db.js';
import { SandboxPaymentProvider } from '../src/providers/sandboxProvider.js';

const config={NODE_ENV:'test',HOST:'127.0.0.1',PORT:4000,DATABASE_URL:'postgres://localhost/giantpay_test',PASSWORD_PEPPER:'p'.repeat(32),COOKIE_SECRET:'c'.repeat(32),FRONTEND_ORIGIN:'http://127.0.0.1:5173',TRUSTED_PROXIES:'',COOKIE_SECURE:false,SESSION_IDLE_MINUTES:30,SESSION_ABSOLUTE_HOURS:24,RATE_LIMIT_NAMESPACE:'test:rate',RATE_LIMIT_GENERAL_MAX:300,RATE_LIMIT_GENERAL_WINDOW_SECONDS:60,PAYMENT_PROVIDER:'sandbox',SANDBOX_WEBHOOK_SECRET:'w'.repeat(32),WEBHOOK_TOLERANCE_SECONDS:300,OUTBOX_WORKER_ENABLED:false,OUTBOX_POLL_MS:1000,SESSION_TTL_HOURS:12,WEBHOOK_ALLOW_HTTP_DEVELOPMENT:false,WEBHOOK_DELIVERY_TIMEOUT_MS:5000,WEBHOOK_MAX_RESPONSE_BYTES:8192,WEBHOOK_MAX_ATTEMPTS:8,LOG_LEVEL:'info',HEALTH_CHECK_TIMEOUT_MS:1500,WORKER_BATCH_SIZE:10,WORKER_LEASE_SECONDS:60,GRACEFUL_SHUTDOWN_TIMEOUT_MS:15000,EXTERNAL_DELIVERY_ENABLED:false,REAL_PAYOUTS_ENABLED:false} satisfies Config;
const provider=new SandboxPaymentProvider(config.SANDBOX_WEBHOOK_SECRET,300,'test');

describe('health semantics',()=>{
  it('keeps liveness independent from database readiness',async()=>{const db={query:vi.fn().mockRejectedValue(new Error('down'))} as unknown as Db;const app=await buildApp(config,db,provider);expect((await app.inject('/v1/health/live')).statusCode).toBe(200);expect((await app.inject('/v1/health/ready')).statusCode).toBe(503);await app.close();});
  it('requires database and workers for readiness',async()=>{const db={query:vi.fn().mockResolvedValue({rows:[],rowCount:1})} as unknown as Db;const app=await buildApp(config,db,provider,()=>false);const response=await app.inject('/v1/health/ready');expect(response.statusCode).toBe(503);expect(response.json()).toEqual({status:'unavailable'});await app.close();});
  it('reports ready without exposing configuration',async()=>{const db={query:vi.fn().mockResolvedValue({rows:[],rowCount:1})} as unknown as Db;const app=await buildApp(config,db,provider,()=>true);const response=await app.inject('/v1/health/ready');expect(response.statusCode).toBe(200);expect(response.json()).toEqual({status:'ready'});await app.close();});
});
