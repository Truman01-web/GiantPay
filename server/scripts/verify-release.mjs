import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
const root=resolve(import.meta.dirname,'..'), release=resolve(process.env.RELEASE_OUTPUT_DIR??join(root,'release'));
const sums=readFileSync(join(release,'SHA256SUMS'),'utf8').trim().split('\n');
for(const line of sums){const [expected,path]=line.split(/\s{2}/);const file=resolve(root,path);if(!existsSync(file))throw new Error(`Release artifact is missing: ${path}`);const actual=createHash('sha256').update(readFileSync(file)).digest('hex');if(actual!==expected)throw new Error(`Checksum mismatch: ${path}`);}
const forbidden=[];const walk=dir=>{for(const name of readdirSync(dir)){const path=join(dir,name);if(statSync(path).isDirectory())walk(path);else if(/(?:\.test\.|\.spec\.|\.map$|^\.env|credentials?)/i.test(basename(path)))forbidden.push(path);}};walk(join(root,'dist'));
if(forbidden.length)throw new Error(`Forbidden production output: ${forbidden.join(', ')}`);
const manifest=JSON.parse(readFileSync(join(release,'release-manifest.json'),'utf8'));if(manifest.deployment!=='sandbox'||manifest.providers.payments!=='sandbox'||manifest.providers.payouts||manifest.providers.email||manifest.providers.sms)throw new Error('Release manifest does not enforce sandbox providers');
console.log(JSON.stringify({event:'release_artifacts_verified',checksums:sums.length}));
