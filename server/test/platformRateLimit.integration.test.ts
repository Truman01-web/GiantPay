import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { readFile,readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import pg from 'pg';
import { afterAll,beforeAll,describe,expect,it } from 'vitest';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { RedisRateLimitStore } from '../src/rateLimit.js';
import { tokenHash } from '../src/security.js';
import { requireSafeTestDatabase } from './integrationGuard.js';

const databaseUrl=process.env.TEST_DATABASE_URL?requireSafeTestDatabase(process.env.TEST_DATABASE_URL,process.env.ALLOW_REMOTE_TEST_DATABASE==='true').toString():undefined,redisUrl=process.env.TEST_REDIS_URL,suite=databaseUrl&&redisUrl?describe:describe.skip,schema=`support_rate_${randomUUID().replaceAll('-','')}`;
let admin:pg.Pool,db:pg.Pool,app:Awaited<ReturnType<typeof buildApp>>;
const session=(token:string)=>({cookie:`giantpay_session=${token}; giantpay_csrf=c`,origin:'http://127.0.0.1:5173','x-csrf-token':'c'});
suite('Phase 7 endpoint Redis limits',()=>{
 beforeAll(async()=>{
  admin=new pg.Pool({connectionString:databaseUrl!});await admin.query(`CREATE SCHEMA ${schema}`);db=new pg.Pool({connectionString:databaseUrl!,options:`-c search_path=${schema}`});
  for(const name of (await readdir(resolve('migrations'))).filter(x=>x.endsWith('.sql')).sort())await db.query(await readFile(resolve('migrations',name),'utf8'));
  await db.query(`INSERT INTO merchants(id,name) VALUES('rm1','Rate Merchant One'),('rm2','Rate Merchant Two')`);
  await db.query(`INSERT INTO users(id,merchant_id,name,email,normalized_email,password_hash,role,permissions,status) VALUES('ru1','rm1','Rate One','rate1@example.invalid','rate1@example.invalid','x','OWNER',ARRAY['support:read','support:write'],'ACTIVE'),('ru2','rm2','Rate Two','rate2@example.invalid','rate2@example.invalid','x','OWNER',ARRAY['support:read','support:write'],'ACTIVE'),('rs1',NULL,'Rate Staff One','staff-rate1@example.invalid','staff-rate1@example.invalid','x','PLATFORM_ADMIN',ARRAY['platform.support.read'],'ACTIVE'),('rs2',NULL,'Rate Staff Two','staff-rate2@example.invalid','staff-rate2@example.invalid','x','PLATFORM_ADMIN',ARRAY['platform.support.read'],'ACTIVE')`);
  await db.query(`INSERT INTO sessions(token_hash,user_id,expires_at,absolute_expires_at,last_seen_at) VALUES($1,'ru1',now()+interval '1 hour',now()+interval '2 hours',now()),($2,'ru2',now()+interval '1 hour',now()+interval '2 hours',now()),($3,'rs1',now()+interval '1 hour',now()+interval '2 hours',now()),($4,'rs2',now()+interval '1 hour',now()+interval '2 hours',now())`,['rate-one','rate-two','rate-staff-one','rate-staff-two'].map(tokenHash));
  const store=await RedisRateLimitStore.connect(redisUrl!);app=await buildApp(loadConfig({NODE_ENV:'test',DATABASE_URL:databaseUrl!,PASSWORD_PEPPER:'p'.repeat(32),COOKIE_SECRET:'c'.repeat(32),FRONTEND_ORIGIN:'http://127.0.0.1:5173',PAYMENT_PROVIDER:'sandbox',SANDBOX_WEBHOOK_SECRET:'w'.repeat(32),RATE_LIMIT_NAMESPACE:`phase7:${randomUUID().replaceAll('-','')}`}),db,undefined,undefined,store);
 },60_000);
 afterAll(async()=>{await app?.close();await db?.end();await admin?.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await admin?.end();},60_000);
 const create=(token:string,i:number)=>app.inject({method:'POST',url:'/v1/support/cases',headers:{...session(token),'idempotency-key':`rate-case-${i}`},payload:{category:'OTHER',subject:`Fictional rate case ${i}`,message:'Fictional support content'}});
 it('returns normalized endpoint 429 and isolates merchant case-creation identities',async()=>{for(let i=0;i<10;i++)expect((await create('rate-one',i)).statusCode).toBe(201);const denied=await create('rate-one',10);expect(denied.statusCode).toBe(429);expect(denied.json().error.code).toBe('RATE_LIMITED');expect(denied.headers['retry-after']).toBeTruthy();expect((await create('rate-two',20)).statusCode).toBe(201);});
 it('returns normalized reply 429 responses and isolates merchant identities',async()=>{const one=(await db.query(`SELECT id FROM support_cases WHERE merchant_id='rm1' ORDER BY created_at LIMIT 1`)).rows[0].id,two=(await db.query(`SELECT id FROM support_cases WHERE merchant_id='rm2' ORDER BY created_at LIMIT 1`)).rows[0].id,reply=(token:string,id:string,i:number)=>app.inject({method:'POST',url:`/v1/support/cases/${id}/replies`,headers:{...session(token),'idempotency-key':`rate-reply-${i}`},payload:{message:`Fictional rate reply ${i}`}});for(let i=0;i<30;i++)expect((await reply('rate-one',one,i)).statusCode).toBe(201);expect((await reply('rate-one',one,30)).statusCode).toBe(429);expect((await reply('rate-two',two,100)).statusCode).toBe(201);});
 it('isolates platform search identities and exposes retry metadata',async()=>{for(let i=0;i<60;i++)expect((await app.inject({url:'/v1/platform/support/cases',headers:session('rate-staff-one')})).statusCode).toBe(200);const denied=await app.inject({url:'/v1/platform/support/cases',headers:session('rate-staff-one')});expect(denied.statusCode).toBe(429);expect(denied.headers).toMatchObject({'ratelimit-limit':'60','ratelimit-remaining':'0'});expect((await app.inject({url:'/v1/platform/support/cases',headers:session('rate-staff-two')})).statusCode).toBe(200);});
});
