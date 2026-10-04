import argon2 from 'argon2';
import type {FastifyInstance} from 'fastify';
import {createHash} from 'node:crypto';
import {z} from 'zod';
import type {Config} from '../config.js';
import type {Db} from '../db.js';
import {transaction} from '../db.js';
import {decryptSecret,encryptSecret} from '../developer/webhookSecurity.js';
import {rateLimit,type RateLimitStore} from '../rateLimit.js';
import {apiError,authenticateStaff,newId,newToken,STAFF_CSRF_COOKIE,STAFF_SESSION_COOKIE,tokenHash} from '../security.js';
import {generateTotpSecret,recoveryCodes,verifyTotp} from '../team/security.js';
import {isExactStaffEmail} from './profiles.js';

const DUMMY='$argon2id$v=19$m=65536,t=3,p=4$YWJjZGVmZ2hpamtsbW5vcA$YuIh0YVN5xU7dyzPqj9xSRZVZbsUJPC2joN1qz5NqJE';
const response=(u:any,config?:Config)=>{const environment=config?.DEPLOYMENT_ENVIRONMENT==='production'?'production':'sandbox';return {user:{id:u.id,name:u.name,email:u.email,role:'PLATFORM_ADMIN',permissions:u.permissions,merchantId:null,merchantName:null,mfaEnabled:true,staffProfile:u.staff_profile??u.staffProfile},environment,environments:[environment]};};
const cookieOptions=(config:Config,maxAge:number)=>({path:'/',httpOnly:true,sameSite:'strict' as const,secure:config.NODE_ENV==='production'||config.COOKIE_SECURE===true,maxAge});

export async function registerStaffRoutes(app:FastifyInstance,config:Config,db:Db,limits:RateLimitStore){
 const generic=(r:any,p:any)=>p.code(401).send(apiError(r,'INVALID_CREDENTIALS','That email or password is incorrect.'));
 app.post('/v1/staff/auth/login',{preHandler:[rateLimit(limits,config,'staff-login:ip',8,900,r=>r.ip),rateLimit(limits,config,'staff-login:identity',5,900,r=>String((r.body as any)?.email??''))]},async(r,p)=>{
  const b=z.object({email:z.email(),password:z.string().min(1)}).parse(r.body),normalized=b.email.trim().toLowerCase();
  const u=(await db.query(`SELECT * FROM users WHERE normalized_email=$1`,[normalized])).rows[0];
  const valid=await argon2.verify(u?.password_hash??DUMMY,b.password+config.PASSWORD_PEPPER);
  if(!valid||!u||u.status!=='ACTIVE'||u.merchant_id!==null||u.role!=='PLATFORM_ADMIN'||!u.staff_profile||!u.email_verified_at||!isExactStaffEmail(normalized))return generic(r,p);
  const enrollment=(await db.query('SELECT verified_at FROM mfa_enrollments WHERE user_id=$1',[u.id])).rows[0];
  const token=newToken(),purpose=enrollment?.verified_at?'LOGIN':'MFA_ENROLLMENT';
  await db.query(`INSERT INTO authentication_challenges(id,user_id,purpose,session_context,expires_at) VALUES($1,$2,$3,'STAFF',now()+interval '5 minutes')`,[tokenHash(token),u.id,purpose]);
  return {status:purpose==='LOGIN'?'MFA_REQUIRED':'MFA_ENROLLMENT_REQUIRED',challengeId:token,expiresAt:new Date(Date.now()+300000).toISOString()};
 });
 app.post('/v1/staff/auth/mfa/enrollment',async(r,p)=>{
  const {challengeId}=z.object({challengeId:z.string().min(32)}).parse(r.body);
  const out=await transaction(db,async c=>{const ch=(await c.query(`SELECT ch.*,u.email FROM authentication_challenges ch JOIN users u ON u.id=ch.user_id WHERE ch.id=$1 AND ch.purpose='MFA_ENROLLMENT' AND ch.session_context='STAFF' AND ch.used_at IS NULL AND ch.expires_at>now() AND u.status='ACTIVE' FOR UPDATE`,[tokenHash(challengeId)])).rows[0];if(!ch)return null;const existing=(await c.query('SELECT verified_at FROM mfa_enrollments WHERE user_id=$1',[ch.user_id])).rows[0];if(existing?.verified_at)return null;const secret=generateTotpSecret();await c.query(`INSERT INTO mfa_enrollments(user_id,secret_ciphertext) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET secret_ciphertext=excluded.secret_ciphertext,updated_at=now() WHERE mfa_enrollments.verified_at IS NULL`,[ch.user_id,encryptSecret(secret,config.WEBHOOK_SECRET_KEY??config.COOKIE_SECRET)]);return {secret,email:ch.email};});
  return out?{secret:out.secret,otpauthUri:`otpauth://totp/GiantPlus:${encodeURIComponent(out.email)}?secret=${out.secret}&issuer=GiantPlus&digits=6&period=30`}:p.code(401).send(apiError(r,'MFA_ENROLLMENT_INVALID','Enrollment request is invalid or expired.'));
 });
 app.post('/v1/staff/auth/mfa/enrollment/verify',async(r,p)=>{
  const b=z.object({challengeId:z.string().min(32),code:z.string().regex(/^\d{6}$/)}).parse(r.body);
  const codes=await transaction(db,async c=>{const row=(await c.query(`SELECT ch.id,ch.user_id,e.secret_ciphertext,e.last_counter FROM authentication_challenges ch JOIN mfa_enrollments e ON e.user_id=ch.user_id WHERE ch.id=$1 AND ch.purpose='MFA_ENROLLMENT' AND ch.session_context='STAFF' AND ch.used_at IS NULL AND ch.expires_at>now() FOR UPDATE`,[tokenHash(b.challengeId)])).rows[0];if(!row)return null;const counter=verifyTotp(decryptSecret(row.secret_ciphertext,config.WEBHOOK_SECRET_KEY??config.COOKIE_SECRET),b.code,row.last_counter===null?null:Number(row.last_counter));if(counter===null)return null;const generated=recoveryCodes();await c.query('UPDATE mfa_enrollments SET verified_at=now(),last_counter=$1,updated_at=now() WHERE user_id=$2',[counter,row.user_id]);for(const code of generated)await c.query('INSERT INTO mfa_recovery_codes(id,user_id,code_hash) VALUES($1,$2,$3)',[newId('mrc'),row.user_id,createHash('sha256').update(code).digest('hex')]);await c.query('UPDATE users SET mfa_enabled=true WHERE id=$1',[row.user_id]);await c.query('UPDATE authentication_challenges SET used_at=now() WHERE id=$1',[row.id]);return generated;});
  return codes?{enrolled:true,recoveryCodes:codes,message:'MFA enrolled. Store these one-time recovery codes securely, then sign in again.'}:p.code(401).send(apiError(r,'INVALID_MFA_CODE','Verification failed.'));
 });
 app.post('/v1/staff/auth/mfa/verify',{preHandler:[rateLimit(limits,config,'staff-mfa:ip',10,900,r=>r.ip),rateLimit(limits,config,'staff-mfa:challenge',5,900,r=>String((r.body as {challengeId?:string})?.challengeId??''))]},async(r,p)=>{
  const b=z.object({challengeId:z.string().min(32),code:z.string().min(6).max(64)}).parse(r.body);
  const result=await transaction(db,async c=>{const row=(await c.query(`SELECT ch.id challenge_id,ch.user_id,e.secret_ciphertext,e.last_counter,u.* FROM authentication_challenges ch JOIN users u ON u.id=ch.user_id JOIN mfa_enrollments e ON e.user_id=u.id AND e.verified_at IS NOT NULL WHERE ch.id=$1 AND ch.purpose='LOGIN' AND ch.session_context='STAFF' AND ch.used_at IS NULL AND ch.expires_at>now() AND u.status='ACTIVE' AND u.staff_profile IS NOT NULL AND u.email_verified_at IS NOT NULL FOR UPDATE`,[tokenHash(b.challengeId)])).rows[0];if(!row||!isExactStaffEmail(row.normalized_email))return null;let counter:number|null=null,recoveryId:string|null=null;if(/^\d{6}$/.test(b.code))counter=verifyTotp(decryptSecret(row.secret_ciphertext,config.WEBHOOK_SECRET_KEY??config.COOKIE_SECRET),b.code,row.last_counter===null?null:Number(row.last_counter));else recoveryId=(await c.query(`SELECT id FROM mfa_recovery_codes WHERE user_id=$1 AND code_hash=$2 AND used_at IS NULL FOR UPDATE`,[row.user_id,createHash('sha256').update(b.code).digest('hex')])).rows[0]?.id??null;if(counter===null&&!recoveryId)return null;await c.query('UPDATE authentication_challenges SET used_at=now() WHERE id=$1',[row.challenge_id]);if(counter!==null)await c.query('UPDATE mfa_enrollments SET last_counter=$1 WHERE user_id=$2',[counter,row.user_id]);else await c.query('UPDATE mfa_recovery_codes SET used_at=now() WHERE id=$1',[recoveryId]);const token=newToken(),csrf=newToken();await c.query(`INSERT INTO sessions(token_hash,public_id,user_id,expires_at,absolute_expires_at,last_seen_at,mfa_verified_at,session_context) VALUES($1,$2,$3,now()+interval '12 hours',now()+interval '24 hours',now(),now(),'STAFF')`,[tokenHash(token),newId('ses'),row.user_id]);return {row,token,csrf};});
  if(!result)return p.code(401).send(apiError(r,'INVALID_MFA_CODE','Verification failed.'));const maxAge=43200;p.setCookie(STAFF_SESSION_COOKIE,result.token,cookieOptions(config,maxAge)).setCookie(STAFF_CSRF_COOKIE,result.csrf,{...cookieOptions(config,maxAge),httpOnly:false});return {status:'AUTHENTICATED',session:response(result.row,config),csrfToken:result.csrf};
 });
 app.get('/v1/staff/auth/session',{preHandler:[authenticateStaff.bind(null,db,config)]},async r=>({session:response(r.actor,config)}));
 app.post('/v1/staff/auth/logout',async(r,p)=>{const token=r.cookies[STAFF_SESSION_COOKIE];if(token)await db.query(`UPDATE sessions SET revoked_at=coalesce(revoked_at,now()) WHERE token_hash=$1 AND session_context='STAFF'`,[tokenHash(token)]);return p.clearCookie(STAFF_SESSION_COOKIE,{path:'/'}).clearCookie(STAFF_CSRF_COOKIE,{path:'/'}).code(204).send();});
}
