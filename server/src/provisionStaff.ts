import argon2 from 'argon2';
import {readFileSync} from 'node:fs';
import {z} from 'zod';
import {loadConfig} from './config.js';
import {createDb,transaction} from './db.js';
import {newId} from './security.js';
import {isExactStaffEmail,STAFF_PROFILES,type StaffProfile} from './staff/profiles.js';

if(process.argv.length>2)throw new Error('Staff provisioning accepts no command-line arguments; use the documented environment and secret-file inputs.');
const input=z.object({
 STAFF_ACTION:z.enum(['create','verify-mailbox','update-profile','suspend','activate','revoke']),
 STAFF_EMAIL:z.email(),STAFF_NAME:z.string().trim().min(2).max(120).optional(),
 STAFF_PROFILE:z.enum(['COMPLIANCE','SUPPORT','FINANCE','OPERATIONS','SECURITY_ADMIN']).optional(),
 STAFF_PASSWORD_FILE:z.string().min(1).optional(),STAFF_OPERATOR:z.string().trim().min(2).max(120),
 STAFF_VERIFICATION_REFERENCE:z.string().trim().min(8).max(200).optional(),
}).parse(process.env);
const email=input.STAFF_EMAIL.trim().toLowerCase();
if(!isExactStaffEmail(email))throw new Error('STAFF_EMAIL must use the exact @giantplus-mw.com domain.');
if(['create','update-profile'].includes(input.STAFF_ACTION)&&!input.STAFF_PROFILE)throw new Error('STAFF_PROFILE is required.');
if(input.STAFF_ACTION==='create'&&(!input.STAFF_NAME||!input.STAFF_PASSWORD_FILE))throw new Error('STAFF_NAME and STAFF_PASSWORD_FILE are required for creation.');
if(input.STAFF_ACTION==='verify-mailbox'&&!input.STAFF_VERIFICATION_REFERENCE)throw new Error('STAFF_VERIFICATION_REFERENCE is required to record independently completed mailbox-ownership verification.');
const config=loadConfig(),db=createDb(config.DATABASE_URL);
try{
 await transaction(db,async c=>{
  const existing=(await c.query('SELECT * FROM users WHERE normalized_email=$1 FOR UPDATE',[email])).rows[0];
  if(input.STAFF_ACTION==='create'){
   if(existing)throw new Error('A user with this normalized email already exists.');
   const password=readFileSync(input.STAFF_PASSWORD_FILE!,'utf8').replace(/[\r\n]+$/,'');
   if(password.length<12)throw new Error('The password supplied through STAFF_PASSWORD_FILE must be at least 12 characters.');
   const hash=await argon2.hash(password+config.PASSWORD_PEPPER,{type:argon2.argon2id}),id=newId('usr');
   await c.query(`INSERT INTO users(id,merchant_id,name,email,normalized_email,password_hash,role,permissions,mfa_enabled,status,email_verified_at,staff_profile,staff_provisioned_at,staff_provisioned_by) VALUES($1,NULL,$2,$3,$3,$4,'PLATFORM_ADMIN',$5,false,'PENDING_VERIFICATION',NULL,$6,now(),$7)`,[id,input.STAFF_NAME,email,hash,[...STAFF_PROFILES[input.STAFF_PROFILE as StaffProfile]],input.STAFF_PROFILE,input.STAFF_OPERATOR]);
   await c.query(`INSERT INTO audit_events(id,actor_id,merchant_id,action,resource_type,resource_id,metadata) VALUES($1,NULL,NULL,'STAFF_PROVISIONED','staff_user',$2,$3)`,[newId('aud'),id,{operator:input.STAFF_OPERATOR,profile:input.STAFF_PROFILE,delivery:'none'}]);
   process.stdout.write(`Provisioned pending staff identity ${id}; mailbox ownership must be verified before sign-in.\n`);return;
  }
  if(!existing?.staff_profile||existing.merchant_id!==null)throw new Error('Explicitly provisioned staff identity not found.');
  if(input.STAFF_ACTION==='verify-mailbox'){
   if(existing.status==='REMOVED')throw new Error('Revoked staff identities cannot be verified or reactivated.');
   await c.query(`UPDATE users SET email_verified_at=coalesce(email_verified_at,now()),status='ACTIVE',staff_provisioned_by=$1 WHERE id=$2`,[input.STAFF_OPERATOR,existing.id]);
   await c.query(`INSERT INTO audit_events(id,actor_id,merchant_id,action,resource_type,resource_id,metadata) VALUES($1,NULL,NULL,'STAFF_MAILBOX_VERIFIED','staff_user',$2,$3)`,[newId('aud'),existing.id,{operator:input.STAFF_OPERATOR,verificationReference:input.STAFF_VERIFICATION_REFERENCE}]);
   process.stdout.write(`Recorded mailbox verification for staff identity ${existing.id}.\n`);return;
  }
  if(input.STAFF_ACTION==='activate'&&existing.status==='REMOVED')throw new Error('Revoked staff identities cannot be reactivated; provision a new identity after fresh approval.');
  const status=input.STAFF_ACTION==='suspend'?'SUSPENDED':input.STAFF_ACTION==='revoke'?'REMOVED':input.STAFF_ACTION==='activate'?'ACTIVE':existing.status;
  const profile=(input.STAFF_PROFILE??existing.staff_profile) as StaffProfile;
  await c.query(`UPDATE users SET status=$1,staff_profile=$2,permissions=$3,staff_provisioned_by=$4,staff_provisioned_at=now() WHERE id=$5`,[status,profile,[...STAFF_PROFILES[profile]],input.STAFF_OPERATOR,existing.id]);
  if(['revoke','suspend','update-profile'].includes(input.STAFF_ACTION))await c.query('UPDATE sessions SET revoked_at=coalesce(revoked_at,now()) WHERE user_id=$1',[existing.id]);
  await c.query(`INSERT INTO audit_events(id,actor_id,merchant_id,action,resource_type,resource_id,metadata) VALUES($1,NULL,NULL,$2,'staff_user',$3,$4)`,[newId('aud'),`STAFF_${input.STAFF_ACTION.replace('-','_').toUpperCase()}`,existing.id,{operator:input.STAFF_OPERATOR,profile,status}]);
  process.stdout.write(`Updated staff identity ${existing.id}: ${input.STAFF_ACTION}.\n`);
 });
}finally{await db.end();}
