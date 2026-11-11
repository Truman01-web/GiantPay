import 'dotenv/config';
import argon2 from 'argon2';
import {randomUUID} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import pg from 'pg';
import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {buildApp} from '../src/app.js';
import {loadConfig} from '../src/config.js';
import {MemoryRateLimitStore} from '../src/rateLimit.js';
import {tokenHash} from '../src/security.js';
import {totp} from '../src/team/security.js';
import {encryptSecret} from '../src/developer/webhookSecurity.js';
import {requireSafeTestDatabase} from './integrationGuard.js';

const databaseUrl=process.env.TEST_DATABASE_URL
  ? requireSafeTestDatabase(process.env.TEST_DATABASE_URL,process.env.ALLOW_REMOTE_TEST_DATABASE==='true').toString()
  : undefined;
const suite=databaseUrl?describe:describe.skip,schema=`staff_access_${randomUUID().replaceAll('-','')}`;
const merchantOrigin='http://127.0.0.1:5173',staffOrigin='http://127.0.0.1:5174';
const pepper='p'.repeat(32),password=['synthetic','password','only'].join('-');
let admin:pg.Pool,db:pg.Pool,app:Awaited<ReturnType<typeof buildApp>>;

const cookieValue=(headers:Record<string,unknown>,name:string)=>{
  const values=(headers['set-cookie'] as string[]|string|undefined)??[];
  const list=Array.isArray(values)?values:[values];
  return list.map(value=>new RegExp(`${name}=([^;]+)`).exec(value)?.[1]).find(Boolean);
};

suite('GiantPlus staff authentication boundary',()=>{
  it('verifies merchant TOTP with scoped row locks and rejects replay',async()=>{
    const challenge='merchant-totp-challenge'.padEnd(43,'x'),secret='JBSWY3DPEHPK3PXP';
    await db.query(`INSERT INTO merchants(id,name) VALUES('security-merchant','Synthetic Merchant'); INSERT INTO users(id,merchant_id,name,email,password_hash,role,mfa_enabled) VALUES('security-user','security-merchant','Merchant','merchant-security@example.test','synthetic','OWNER',true)`);
    await db.query(`INSERT INTO mfa_enrollments(user_id,secret_ciphertext,verified_at) VALUES('security-user',$1,now())`,[encryptSecret(secret,'k'.repeat(32))]);
    await db.query(`INSERT INTO authentication_challenges(id,user_id,purpose,session_context,expires_at) VALUES($1,'security-user','LOGIN','MERCHANT',now()+interval '5 minutes')`,[tokenHash(challenge)]);
    const payload={challengeId:challenge,code:totp(secret).code};
    const response=await app.inject({method:'POST',url:'/v1/auth/mfa/verify',payload});
    expect(response.statusCode,response.body).toBe(200);
    expect(response.json().session.user.merchantId).toBe('security-merchant');
    expect(response.headers['set-cookie']).toEqual(expect.arrayContaining([expect.stringContaining('Max-Age=3600')]));
    const lifetime=(await db.query(`SELECT extract(epoch FROM (expires_at-created_at))::float seconds,extract(epoch FROM (absolute_expires_at-created_at))::float absolute_seconds FROM sessions WHERE user_id='security-user'`)).rows[0];
    expect(lifetime.seconds).toBeLessThanOrEqual(3600);
    expect(lifetime.absolute_seconds).toBeLessThanOrEqual(3600);
    expect((await app.inject({method:'POST',url:'/v1/auth/mfa/verify',payload})).statusCode).toBe(401);
  });
  it('does not consume a staff challenge or recovery code through the merchant recovery route',async()=>{
    const challenge='cross-context-challenge'.padEnd(43,'x'),code='synthetic-cross-context-recovery';
    await db.query(`INSERT INTO authentication_challenges(id,user_id,purpose,session_context,expires_at) VALUES($1,'active','LOGIN','STAFF',now()+interval '5 minutes')`,[tokenHash(challenge)]);
    await db.query(`INSERT INTO mfa_recovery_codes(id,user_id,code_hash) VALUES('cross-code','active',$1)`,[tokenHash(code)]);
    const response=await app.inject({method:'POST',url:'/v1/auth/mfa/recovery',payload:{challengeId:challenge,recoveryCode:code}});
    expect(response.statusCode).toBe(401);
    expect((await db.query(`SELECT used_at FROM mfa_recovery_codes WHERE id='cross-code'`)).rows[0].used_at).toBeNull();
    expect((await db.query('SELECT used_at FROM authentication_challenges WHERE id=$1',[tokenHash(challenge)])).rows[0].used_at).toBeNull();
  });
  it('caps merchant recovery sessions and consumes each recovery code once under concurrency',async()=>{
    const challenge='merchant-recovery-challenge'.padEnd(43,'x'),code='synthetic-merchant-recovery';
    await db.query(`INSERT INTO authentication_challenges(id,user_id,purpose,session_context,expires_at) VALUES($1,'security-user','LOGIN','MERCHANT',now()+interval '5 minutes')`,[tokenHash(challenge)]);
    await db.query(`INSERT INTO mfa_recovery_codes(id,user_id,code_hash) VALUES('merchant-recovery','security-user',$1)`,[tokenHash(code)]);
    const responses=await Promise.all([1,2].map(()=>app.inject({method:'POST',url:'/v1/auth/mfa/recovery',payload:{challengeId:challenge,recoveryCode:code}})));
    expect(responses.map(r=>r.statusCode).sort()).toEqual([200,401]);
    const success=responses.find(r=>r.statusCode===200)!;
    expect(success.headers['set-cookie']).toEqual(expect.arrayContaining([expect.stringContaining('Max-Age=3600')]));
    const lifetime=(await db.query(`SELECT extract(epoch FROM (expires_at-created_at))::float seconds,extract(epoch FROM (absolute_expires_at-created_at))::float absolute_seconds FROM sessions WHERE token_hash=$1`,[tokenHash(cookieValue(success.headers,'giantpay_session')!)])).rows[0];
    expect(lifetime.seconds).toBeLessThanOrEqual(3600);
    expect(lifetime.absolute_seconds).toBeLessThanOrEqual(3600);
  });
  it.each(['','/verify'])('limits staff enrollment%s attempts by challenge across client IPs',async suffix=>{
    const challenge=('enrollment-limit'+suffix).padEnd(43,'x');
    for(let i=0;i<6;i++){
      const response=await app.inject({method:'POST',url:'/v1/staff/auth/mfa/enrollment'+suffix,remoteAddress:`192.0.2.${100+i}`,payload:{challengeId:challenge,code:'000000'}});
      expect(response.statusCode).toBe(i<5?401:429);
    }
  });
  it('invalidates outstanding authentication challenges when a password is reset',async()=>{
    const token='synthetic-reset-token'.padEnd(43,'x'),challenge='synthetic-stale-login'.padEnd(43,'x');
    await db.query(`INSERT INTO authentication_challenges(id,user_id,purpose,session_context,expires_at) VALUES($1,'pending','LOGIN','STAFF',now()+interval '5 minutes')`,[tokenHash(challenge)]);
    await db.query(`INSERT INTO password_reset_requests(id,user_id,token_hash,expires_at) VALUES('security-reset','pending',$1,now()+interval '5 minutes')`,[tokenHash(token)]);
    const response=await app.inject({method:'POST',url:'/v1/auth/password/reset',payload:{token,password:'New-synthetic-password-only'}});
    expect(response.statusCode).toBe(200);
    expect((await db.query('SELECT used_at FROM authentication_challenges WHERE id=$1',[tokenHash(challenge)])).rows[0].used_at).not.toBeNull();
  });
  beforeAll(async()=>{
    admin=new pg.Pool({connectionString:databaseUrl!});
    await admin.query(`CREATE SCHEMA ${schema}`);
    db=new pg.Pool({connectionString:databaseUrl!,options:`-c search_path=${schema}`});
    for(const name of (await readdir(resolve('migrations'))).filter(name=>name.endsWith('.sql')).sort())
      await db.query(await readFile(resolve('migrations',name),'utf8'));
    const hash=await argon2.hash(password+pepper,{type:argon2.argon2id});
    await db.query(`INSERT INTO users(id,merchant_id,name,email,normalized_email,password_hash,role,permissions,status,email_verified_at,staff_profile,staff_provisioned_at,staff_provisioned_by)
      VALUES('pending',NULL,'Pending Staff','pending@giantplus-mw.com','pending@giantplus-mw.com',$1,'PLATFORM_ADMIN',ARRAY['platform.health.read'],'PENDING_VERIFICATION',NULL,'OPERATIONS',now(),'test'),
            ('active',NULL,'Active Staff','active@giantplus-mw.com','active@giantplus-mw.com',$1,'PLATFORM_ADMIN',ARRAY['platform.health.read'],'ACTIVE',now(),'OPERATIONS',now(),'test')`,[hash]);
    app=await buildApp(loadConfig({NODE_ENV:'test',DATABASE_URL:databaseUrl!,PASSWORD_PEPPER:pepper,COOKIE_SECRET:'c'.repeat(32),WEBHOOK_SECRET_KEY:'k'.repeat(32),FRONTEND_ORIGIN:merchantOrigin,STAFF_FRONTEND_ORIGIN:staffOrigin,PAYMENT_PROVIDER:'sandbox',SANDBOX_WEBHOOK_SECRET:'w'.repeat(32),SESSION_TTL_HOURS:'2',SESSION_ABSOLUTE_HOURS:'1'}),db,undefined,undefined,new MemoryRateLimitStore());
  },60_000);
  afterAll(async()=>{await app?.close();await db?.end();await admin?.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await admin?.end();},60_000);

  it('enforces the exact staff domain at the database boundary and does not promote legacy platform users',async()=>{
    await expect(db.query(`INSERT INTO users(id,merchant_id,name,email,normalized_email,password_hash,role,permissions,status,email_verified_at,staff_profile) VALUES('lookalike',NULL,'Lookalike','person@giantplus-mw.com.evil.test','person@giantplus-mw.com.evil.test','x','PLATFORM_ADMIN','{}','ACTIVE',now(),'OPERATIONS')`)).rejects.toMatchObject({code:'23514'});
    await db.query(`INSERT INTO users(id,merchant_id,name,email,normalized_email,password_hash,role,permissions,status,email_verified_at) VALUES('legacy',NULL,'Legacy','legacy@example.invalid','legacy@example.invalid','x','PLATFORM_ADMIN','{}','ACTIVE',now())`);
    expect((await db.query(`SELECT staff_profile FROM users WHERE id='legacy'`)).rows[0].staff_profile).toBeNull();
  });

  it('denies pending mailbox verification and completes enrollment plus real-route MFA login',async()=>{
    const pending=await app.inject({method:'POST',url:'/v1/staff/auth/login',headers:{origin:staffOrigin},payload:{email:'pending@giantplus-mw.com',password}});
    expect(pending.statusCode).toBe(401);

    const login=await app.inject({method:'POST',url:'/v1/staff/auth/login',headers:{origin:staffOrigin},payload:{email:'active@giantplus-mw.com',password}});
    expect(login.statusCode).toBe(200);expect(login.json().status).toBe('MFA_ENROLLMENT_REQUIRED');
    const enrollment=await app.inject({method:'POST',url:'/v1/staff/auth/mfa/enrollment',headers:{origin:staffOrigin},payload:{challengeId:login.json().challengeId}});
    expect(enrollment.statusCode).toBe(200);
    const verified=await app.inject({method:'POST',url:'/v1/staff/auth/mfa/enrollment/verify',headers:{origin:staffOrigin},payload:{challengeId:login.json().challengeId,code:totp(enrollment.json().secret).code}});
    expect(verified.statusCode).toBe(200);expect(verified.json().recoveryCodes).toHaveLength(10);

    const secondLogin=await app.inject({method:'POST',url:'/v1/staff/auth/login',headers:{origin:staffOrigin},payload:{email:'active@giantplus-mw.com',password}});
    const recovery=verified.json().recoveryCodes[0] as string;
    const attempts=await Promise.all([1,2].map(()=>app.inject({method:'POST',url:'/v1/staff/auth/mfa/verify',headers:{origin:staffOrigin},payload:{challengeId:secondLogin.json().challengeId,code:recovery}})));
    expect(attempts.filter(result=>result.statusCode===200)).toHaveLength(1);
    expect(attempts.filter(result=>result.statusCode===401)).toHaveLength(1);
    const success=attempts.find(result=>result.statusCode===200)!;
    const staffCookie=cookieValue(success.headers,'giantpay_staff_session');
    expect(staffCookie).toBeTruthy();
    expect(success.headers['set-cookie']).toEqual(expect.arrayContaining([expect.stringContaining('Max-Age=3600')]));
    const lifetime=(await db.query(`SELECT extract(epoch FROM (expires_at-created_at))::float seconds,extract(epoch FROM (absolute_expires_at-created_at))::float absolute_seconds FROM sessions WHERE token_hash=$1`,[tokenHash(staffCookie!)])).rows[0];
    expect(lifetime.seconds).toBeLessThanOrEqual(3600);
    expect(lifetime.absolute_seconds).toBeLessThanOrEqual(3600);
    expect((await app.inject({url:'/v1/staff/auth/session',headers:{cookie:`giantpay_session=${staffCookie}`,origin:merchantOrigin}})).statusCode).toBe(403);
    expect((await app.inject({url:'/v1/staff/auth/session',headers:{cookie:`giantpay_staff_session=${staffCookie}`,origin:staffOrigin}})).statusCode).toBe(200);
  },30_000);

  it('rejects cross-context cookies, origins and CSRF and honors revocation',async()=>{
    await db.query(`INSERT INTO sessions(token_hash,user_id,expires_at,absolute_expires_at,last_seen_at,mfa_verified_at,session_context) VALUES($1,'active',now()+interval '1 hour',now()+interval '2 hours',now(),now(),'STAFF')`,[tokenHash('boundary-token')]);
    const cookie='giantpay_staff_session=boundary-token; giantpay_staff_csrf=csrf';
    expect((await app.inject({url:'/v1/staff/auth/session',headers:{cookie:'giantpay_session=boundary-token',origin:merchantOrigin}})).statusCode).toBe(403);
    expect((await app.inject({url:'/v1/staff/auth/session',headers:{cookie,origin:merchantOrigin}})).statusCode).toBe(403);
    expect((await app.inject({method:'POST',url:'/v1/staff/auth/logout',headers:{cookie,origin:merchantOrigin,'x-csrf-token':'csrf'}})).statusCode).toBe(403);
    expect((await app.inject({method:'POST',url:'/v1/staff/auth/logout',headers:{cookie,origin:staffOrigin,'x-csrf-token':'wrong'}})).statusCode).toBe(403);
    expect((await app.inject({url:'/v1/staff/auth/session',headers:{cookie,origin:staffOrigin}})).statusCode).toBe(200);
    await db.query(`UPDATE sessions SET revoked_at=now() WHERE token_hash=$1`,[tokenHash('boundary-token')]);
    expect((await app.inject({url:'/v1/staff/auth/session',headers:{cookie,origin:staffOrigin}})).statusCode).toBe(401);
  });
});
