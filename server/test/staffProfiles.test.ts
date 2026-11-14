import {describe,expect,it} from 'vitest';
import {isExactStaffEmail,STAFF_PROFILES} from '../src/staff/profiles.js';

describe('staff access profiles',()=>{
 it.each(['person@giantplus-mw.com','PERSON@GIANTPLUS-MW.COM'])('accepts the exact normalized staff domain: %s',email=>expect(isExactStaffEmail(email)).toBe(true));
 it.each(['person@giantpay.mw','person@admin.giantplus-mw.com','person@giantplus-mw.com.evil.test','person+test@giantplus-mw.co','person@@giantplus-mw.com'])('rejects non-exact or lookalike staff domains: %s',email=>expect(isExactStaffEmail(email)).toBe(false));
 it('keeps profiles least-privilege and separates security administration',()=>{
  for(const [profile,permissions] of Object.entries(STAFF_PROFILES)){expect(new Set(permissions).size).toBe(permissions.length);expect(permissions.length).toBeGreaterThan(0);if(profile!=='SECURITY_ADMIN')expect(permissions).not.toContain('platform.staff.manage');}
  expect(STAFF_PROFILES.SECURITY_ADMIN).not.toContain('compliance:approve');
  expect(STAFF_PROFILES.COMPLIANCE).not.toContain('admin.refunds:approve');
 });
});
