import { describe,expect,it } from 'vitest';
import { requireSafeTestDatabase } from './integrationGuard.js';

describe('integration database guard',()=>{
  it('accepts an isolated local _test database',()=>expect(requireSafeTestDatabase('postgres://user:secret@127.0.0.1:55432/giantpay_test').pathname).toBe('/giantpay_test'));
  it.each([undefined,'','not a url','postgres://localhost/','postgres://localhost/giantpay','postgres://localhost/giantpay_dev','postgres://db.example.com/giantpay_test'] as const)('rejects unsafe target %s',(url)=>expect(()=>requireSafeTestDatabase(url)).toThrow());
  it('allows an explicitly approved remote test database',()=>expect(requireSafeTestDatabase('postgres://db.example.com/giantpay_test',true).hostname).toBe('db.example.com'));
});
