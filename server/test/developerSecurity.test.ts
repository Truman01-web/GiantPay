import { createHmac } from 'node:crypto';
import { describe,expect,it } from 'vitest';
import { apiKeyVerifier,generateApiKey } from '../src/developer/apiKeys.js';
import { decryptSecret,encryptSecret,signWebhook,validateWebhookUrl } from '../src/developer/webhookSecurity.js';

describe('developer platform security primitives',()=>{
  it('generates recognizable high-entropy keys and only a keyed verifier is suitable for storage',()=>{const a=generateApiKey(),b=generateApiKey();expect(a.plaintext).toMatch(/^gp_test_[A-Za-z0-9_-]{12}_[A-Za-z0-9_-]{43}$/);expect(a.plaintext).not.toBe(b.plaintext);const verifier=apiKeyVerifier(a.plaintext,'p'.repeat(32));expect(verifier).toHaveLength(64);expect(verifier).not.toContain(a.plaintext);expect(a.fingerprint).not.toContain(a.plaintext.split('_').at(-1)!);});
  it('encrypts recoverable delivery secrets without storing plaintext',()=>{const secret='whsec_'+ 's'.repeat(43),encrypted=encryptSecret(secret,'k'.repeat(32));expect(encrypted).not.toContain(secret);expect(decryptSecret(encrypted,'k'.repeat(32))).toBe(secret);});
  it('signs the timestamp and exact raw bytes',()=>{const raw=Buffer.from('{"amount":100}'),timestamp=1700000000;expect(signWebhook('secret',timestamp,raw)).toBe(createHmac('sha256','secret').update(`${timestamp}.`).update(raw).digest('hex'));expect(signWebhook('secret',timestamp,raw)).not.toBe(signWebhook('secret',timestamp,Buffer.from('{ "amount": 100 }')));});
  it('rejects loopback, private IPv4 and IPv6 targets',async()=>{await expect(validateWebhookUrl('https://127.0.0.1/hook')).rejects.toThrow();await expect(validateWebhookUrl('https://10.0.0.1/hook')).rejects.toThrow();await expect(validateWebhookUrl('https://[::1]/hook')).rejects.toThrow();});
  it('rejects credentials, non-HTTPS and restricted ports',async()=>{await expect(validateWebhookUrl('https://user:pass@example.com/hook')).rejects.toThrow();await expect(validateWebhookUrl('http://example.com/hook')).rejects.toThrow();await expect(validateWebhookUrl('https://example.com:8443/hook')).rejects.toThrow();});
});
