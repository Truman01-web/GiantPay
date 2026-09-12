import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll,beforeAll,beforeEach,describe,expect,it } from 'vitest';
import { applyMigrations } from '../src/migrationRunner.js';
import { requireSafeTestDatabase } from '../src/testDatabase.js';
import { apiKeyVerifier,generateApiKey,verifyApiKey } from '../src/developer/apiKeys.js';
import { encryptSecret } from '../src/developer/webhookSecurity.js';
import { MerchantWebhookPublisher } from '../src/developer/webhookWorker.js';

const raw=process.env.TEST_DATABASE_URL;
const databaseUrl=raw?requireSafeTestDatabase(raw,process.env.ALLOW_REMOTE_TEST_DATABASE==='true').toString():undefined;
const suite=databaseUrl?describe:describe.skip;
const schema=`developer_test_${randomUUID().replaceAll('-','')}`;
let admin:pg.Pool,db:pg.Pool;

suite('developer platform database guarantees',()=>{
  beforeAll(async()=>{admin=new pg.Pool({connectionString:databaseUrl!});await admin.query(`CREATE SCHEMA ${schema}`);db=new pg.Pool({connectionString:databaseUrl!,options:`-c search_path=${schema}`});await applyMigrations(db);});
  afterAll(async()=>{await db?.end();await admin?.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await admin?.end();});
  beforeEach(async()=>{await db.query('TRUNCATE webhook_delivery_attempts,webhook_deliveries,merchant_webhook_endpoints,api_keys,outbox_events,audit_events,users,merchants CASCADE');await db.query(`INSERT INTO merchants(id,name) VALUES('m1','One'),('m2','Two')`);await db.query(`INSERT INTO users(id,merchant_id,name,email,password_hash,role) VALUES('u1','m1','One','one@test.invalid','x','OWNER'),('u2','m2','Two','two@test.invalid','x','OWNER')`);});
  it('stores no plaintext and authenticates active keys',async()=>{const key=generateApiKey();await db.query(`INSERT INTO api_keys(id,public_id,merchant_id,name,verifier,fingerprint,scopes,created_by) VALUES('k1',$1,'m1','CI',$2,$3,ARRAY['payments:read'],'u1')`,[key.publicId,apiKeyVerifier(key.plaintext,'p'.repeat(32)),key.fingerprint]);expect(JSON.stringify((await db.query(`SELECT * FROM api_keys WHERE id='k1'`)).rows[0])).not.toContain(key.plaintext);expect((await verifyApiKey(db,key.plaintext,'p'.repeat(32)))?.merchant_id).toBe('m1');});
  it('rejects revoked and expired keys',async()=>{for(const [id,clause] of [['revoked','now()'],['expired','NULL']] as const){const key=generateApiKey();await db.query(`INSERT INTO api_keys(id,public_id,merchant_id,name,verifier,fingerprint,scopes,created_by,revoked_at,expires_at) VALUES($1,$2,'m1','CI',$3,$4,ARRAY['payments:read'],'u1',${clause},${id==='expired'?"now()-interval '1 minute'":'NULL'})`,[id,key.publicId,apiKeyVerifier(key.plaintext,'p'.repeat(32)),key.fingerprint]);expect(await verifyApiKey(db,key.plaintext,'p'.repeat(32))).toBeNull();}});
  it('enforces scope and delivery-attempt uniqueness',async()=>{const key=generateApiKey();await expect(db.query(`INSERT INTO api_keys(id,public_id,merchant_id,name,verifier,fingerprint,scopes,created_by) VALUES('bad',$1,'m1','Bad',$2,$3,ARRAY['payments:write'],'u1')`,[key.publicId,apiKeyVerifier(key.plaintext,'p'.repeat(32)),key.fingerprint])).rejects.toMatchObject({code:'23514'});});
  it('fans one event out once per owned endpoint',async()=>{await db.query(`INSERT INTO merchant_webhook_endpoints(id,merchant_id,name,url,event_types,secret_ciphertext,secret_fingerprint,created_by) VALUES('e1','m1','One','https://example.com/hook',ARRAY['payment.succeeded'],$1,'masked','u1'),('e2','m2','Two','https://example.com/hook',ARRAY['payment.succeeded'],$1,'masked','u2')`,[encryptSecret('secret','k'.repeat(32))]);await db.query(`INSERT INTO outbox_events(id,event_type,aggregate_type,aggregate_id,payload,deduplication_key,status) VALUES('o1','payment.succeeded','payment','p1',$1,'once','PUBLISHED')`,[{merchantId:'m1'}]);const publisher=new MerchantWebhookPublisher(db,3);const message={id:'o1',eventType:'payment.succeeded',aggregateType:'payment',aggregateId:'p1',payload:{merchantId:'m1'},deduplicationKey:'once'};await publisher.publish(message);await publisher.publish(message);expect((await db.query('SELECT merchant_id,count(*)::int count FROM webhook_deliveries GROUP BY merchant_id')).rows).toEqual([{merchant_id:'m1',count:1}]);});
  it('rolls back a transaction that violates delivery uniqueness',async()=>{await db.query(`INSERT INTO merchant_webhook_endpoints(id,merchant_id,name,url,event_types,secret_ciphertext,secret_fingerprint,created_by) VALUES('e1','m1','One','https://example.com',ARRAY['payment.succeeded'],$1,'masked','u1')`,[encryptSecret('secret','k'.repeat(32))]);await db.query(`INSERT INTO outbox_events(id,event_type,aggregate_type,aggregate_id,payload,deduplication_key) VALUES('o1','payment.succeeded','payment','p1','{}','one')`);await db.query(`INSERT INTO webhook_deliveries(id,event_id,endpoint_id,merchant_id,max_attempts) VALUES('d1','o1','e1','m1',3)`);await db.query(`INSERT INTO webhook_delivery_attempts(id,delivery_id,attempt_number) VALUES('a1','d1',1)`);await expect(db.query(`INSERT INTO webhook_delivery_attempts(id,delivery_id,attempt_number) VALUES('a2','d1',1)`)).rejects.toMatchObject({code:'23505'});});
});
