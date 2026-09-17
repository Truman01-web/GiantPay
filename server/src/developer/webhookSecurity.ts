import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto';
import { isIP } from 'node:net';
import { promises as dns } from 'node:dns';

const key = (material: string) => createHash('sha256').update(material).digest();
export function encryptSecret(secret: string, material: string) { const iv=randomBytes(12); const c=createCipheriv('aes-256-gcm',key(material),iv); const body=Buffer.concat([c.update(secret,'utf8'),c.final()]); return Buffer.concat([iv,c.getAuthTag(),body]).toString('base64url'); }
export function decryptSecret(value: string, material: string) { const b=Buffer.from(value,'base64url'); const d=createDecipheriv('aes-256-gcm',key(material),b.subarray(0,12)); d.setAuthTag(b.subarray(12,28)); return Buffer.concat([d.update(b.subarray(28)),d.final()]).toString('utf8'); }
export function encryptVersionedSecret(secret:string,version:string,material:string){if(!/^[A-Za-z0-9_-]{1,32}$/.test(version))throw new Error('INVALID_KEY_VERSION');return `${version}.${encryptSecret(secret,material)}`;}
export function decryptVersionedSecret(value:string,keyring:Readonly<Record<string,string>>){const separator=value.indexOf('.');if(separator<1)throw new Error('UNKNOWN_KEY_VERSION');const version=value.slice(0,separator),material=keyring[version];if(!material)throw new Error('UNKNOWN_KEY_VERSION');return decryptSecret(value.slice(separator+1),material);}
export function signWebhook(secret:string,timestamp:number,body:Buffer) { return createHmac('sha256',secret).update(String(timestamp)).update('.').update(body).digest('hex'); }

function forbiddenIp(address:string) {
  if (isIP(address)===4) { const p=address.split('.').map(Number); return p[0]===0||p[0]===10||p[0]===127||p[0]!>=224||(p[0]===169&&p[1]===254)||(p[0]===172&&p[1]!>=16&&p[1]!<=31)||(p[0]===192&&p[1]===168)||(p[0]===100&&p[1]!>=64&&p[1]!<=127); }
  const x=address.toLowerCase(); return x==='::'||x==='::1'||x.startsWith('fc')||x.startsWith('fd')||x.startsWith('fe8')||x.startsWith('fe9')||x.startsWith('fea')||x.startsWith('feb')||x.startsWith('ff')||x.startsWith('::ffff:');
}
export async function validateWebhookUrl(raw:string, allowHttpDevelopment=false) {
  let url:URL; try { url=new URL(raw); } catch { throw new Error('Webhook URL is invalid.'); }
  if (url.username||url.password) throw new Error('Embedded URL credentials are forbidden.');
  if (url.protocol!=='https:' && !(allowHttpDevelopment&&url.protocol==='http:')) throw new Error('Webhook URL must use HTTPS.');
  if (url.port && url.port!=='443' && !(allowHttpDevelopment&&url.port==='80')) throw new Error('Webhook URL port is forbidden.');
  if (url.hostname==='localhost'||url.hostname.endsWith('.localhost')) throw new Error('Local webhook targets are forbidden.');
  const addresses=isIP(url.hostname)?[{address:url.hostname}]:(await dns.lookup(url.hostname,{all:true,verbatim:true}));
  if (!addresses.length||addresses.some((x)=>forbiddenIp(x.address))) throw new Error('Webhook target address is forbidden.');
  return url;
}
