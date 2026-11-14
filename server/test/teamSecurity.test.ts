import {describe,expect,it} from 'vitest';
import {generateTotpSecret,normalizeEmail,PERMISSIONS,recoveryCodes,SYSTEM_ROLES,totp,validatePermissions,verifyTotp} from '../src/team/security.js';
import { invitationResponse } from '../src/team/routes.js';
describe('team access security primitives',()=>{
 it('defines canonical system roles and permissions',()=>{expect(SYSTEM_ROLES).toEqual(['Owner','Administrator','Finance','Developer','Support','Viewer']);expect(PERMISSIONS).toContain('security:manage:self');});
 it('normalizes invitations and rejects unknown or escalated permissions',()=>{expect(normalizeEmail(' User@Example.COM ')).toBe('user@example.com');expect(()=>validatePermissions(['unknown'],[],true)).toThrow('UNKNOWN_PERMISSION');expect(()=>validatePermissions(['team:manage'],['team:read'])).toThrow('PERMISSION_ESCALATION');});
 it('generates and verifies RFC 6238 style TOTP with replay counters',()=>{const secret=generateTotpSecret(),now=1_700_000_000_000,{code,counter}=totp(secret,now);expect(verifyTotp(secret,code,null,now)).toBe(counter);expect(verifyTotp(secret,code,counter,now)).toBeNull();});
 it('matches the RFC 6238 SHA-1 vector truncated to six digits',()=>expect(totp('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ',59_000).code).toBe('287082'));
 it('creates independent one-time recovery code material',()=>{const codes=recoveryCodes();expect(codes).toHaveLength(10);expect(new Set(codes).size).toBe(10);expect(codes.every(x=>x.length>=12)).toBe(true);});
 it('never exposes invitation delivery tokens in production responses',()=>{const row={id:'inv_1',normalized_email:'user@example.test',role_id:'role_1',role_name:'Viewer',status:'PENDING',expires_at:new Date().toISOString(),created_at:new Date().toISOString()};expect(invitationResponse(row,'secret-token','production')).not.toHaveProperty('deliveryToken');expect(invitationResponse(row,'secret-token','test')).toHaveProperty('deliveryToken','secret-token');});
});
