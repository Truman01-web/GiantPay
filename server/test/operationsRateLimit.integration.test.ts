import 'dotenv/config';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import pg from 'pg';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {buildApp} from '../src/app.js';
import {loadConfig} from '../src/config.js';
import {RedisRateLimitStore} from '../src/rateLimit.js';
import {tokenHash} from '../src/security.js';
import {requireSafeTestDatabase} from './integrationGuard.js';

const databaseUrl=process.env.TEST_DATABASE_URL?requireSafeTestDatabase(process.env.TEST_DATABASE_URL,process.env.ALLOW_REMOTE_TEST_DATABASE==='true').toString():undefined;
const redisUrl=process.env.TEST_REDIS_URL;
const suite=databaseUrl&&redisUrl?describe:describe.skip;
const schema=`operations_rate_${randomUUID().replaceAll('-','')}`;
let admin:pg.Pool,db:pg.Pool,app:Awaited<ReturnType<typeof buildApp>>;
const session=(token:string)=>({cookie:`giantpay_session=${token}; giantpay_csrf=c`,origin:'http://127.0.0.1:5173','x-csrf-token':'c'});

suite('Phase 10 endpoint Redis limits',()=>{
 beforeAll(async()=>{
  admin=new pg.Pool({connectionString:databaseUrl!});
  await admin.query(`CREATE SCHEMA ${schema}`);
  db=new pg.Pool({connectionString:databaseUrl!,options:`-c search_path=${schema}`});
  for(const name of (await readdir(resolve('migrations'))).filter(x=>x.endsWith('.sql')).sort())await db.query(await readFile(resolve('migrations',name),'utf8'));
  await db.query(`INSERT INTO users(id,merchant_id,name,email,normalized_email,password_hash,role,permissions,status) VALUES('maker',NULL,'Maker','maker@example.invalid','maker@example.invalid','x','PLATFORM_ADMIN',ARRAY['platform.operations.read','platform.incidents.read','platform.incidents.manage','platform.controls.read','platform.controls.propose','platform.controls.approve','platform.metrics.read'],'ACTIVE'),('checker',NULL,'Checker','checker@example.invalid','checker@example.invalid','x','PLATFORM_ADMIN',ARRAY['platform.operations.read','platform.incidents.read','platform.incidents.manage','platform.controls.read','platform.controls.propose','platform.controls.approve','platform.metrics.read'],'ACTIVE')`);
  for(const [token,user] of [['maker-token','maker'],['checker-token','checker']] as const)await db.query(`INSERT INTO sessions(token_hash,user_id,expires_at,absolute_expires_at,last_seen_at) VALUES($1,$2,now()+interval '1 hour',now()+interval '2 hours',now())`,[tokenHash(token),user]);
  const store=await RedisRateLimitStore.connect(redisUrl!);
  app=await buildApp(loadConfig({NODE_ENV:'test',DATABASE_URL:databaseUrl!,PASSWORD_PEPPER:'p'.repeat(32),COOKIE_SECRET:'c'.repeat(32),FRONTEND_ORIGIN:'http://127.0.0.1:5173',PAYMENT_PROVIDER:'sandbox',SANDBOX_WEBHOOK_SECRET:'w'.repeat(32),RATE_LIMIT_NAMESPACE:`phase10:${randomUUID()}`}),db,undefined,undefined,store);
 },60_000);
 afterAll(async()=>{await app?.close();await db?.end();await admin?.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await admin?.end();},60_000);

 it('returns normalized 429 responses and preserves platform identity isolation',async()=>{
  const create=(token:string,index:number)=>app.inject({method:'POST',url:'/v1/platform/operations/incidents',headers:{...session(token),'idempotency-key':`incident-rate-${token}-${index}`},payload:{reference:`INC-RATE-${token}-${index}`,title:`Rate test ${index}`,summary:'Fictional rate-limit acceptance incident',severity:'SEV4',impactScope:'OTHER',reason:'Rate-limit acceptance coverage'}});
  for(let i=0;i<10;i++)expect((await create('maker-token',i)).statusCode).toBe(201);
  const limited=await create('maker-token',10);
  expect(limited.statusCode,limited.body).toBe(429);
  expect(limited.json().error.code).toBe('RATE_LIMITED');
  expect(limited.headers['retry-after']).toBeDefined();
  expect((await create('checker-token',0)).statusCode).toBe(201);
 });
});
