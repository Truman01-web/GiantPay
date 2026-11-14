import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { EncryptedFileStore } from '../src/evidence/encryptedFileStore.js';

const roots:string[]=[];
const make=async(quota=1024*1024)=>{const root=await mkdtemp(join(tmpdir(),'giantpay-evidence-'));roots.push(root);return{root,store:new EncryptedFileStore(root,Buffer.alloc(32,7),quota,1000)}};
afterEach(async()=>{while(roots.length)await rm(roots.pop()!,{recursive:true,force:true})});

describe('encrypted private evidence store',()=>{
  it('round trips encrypted bytes without plaintext at rest',async()=>{const {root,store}=await make(),value=Buffer.from('private evidence');await store.put('evd_12345678',value);expect(await store.get('evd_12345678',100)).toEqual(value);expect((await readFile(join(root,'evd_12345678.bin'))).includes(value)).toBe(false)});
  it('uses exclusive object creation',async()=>{const {store}=await make();await store.put('evd_12345678',Buffer.from('one'));await expect(store.put('evd_12345678',Buffer.from('two'))).rejects.toMatchObject({code:'EEXIST'})});
  it('detects ciphertext tampering',async()=>{const {root,store}=await make();await store.put('evd_12345678',Buffer.from('one'));const path=join(root,'evd_12345678.bin'),value=await readFile(path);const last=value.length-1;value[last]=(value[last]??0)^1;await writeFile(path,value);await expect(store.get('evd_12345678',100)).rejects.toThrow()});
  it('rejects traversal identifiers',async()=>{const {store}=await make();await expect(store.put('../escape',Buffer.from('x'))).rejects.toThrow(/identifier/)});
  it('enforces storage quota',async()=>{const {store}=await make(40);await expect(store.put('evd_12345678',Buffer.alloc(20))).rejects.toThrow(/quota/)});
  it('enforces bounded reads before decryption',async()=>{const {store}=await make();await store.put('evd_12345678',Buffer.alloc(100));await expect(store.get('evd_12345678',10)).rejects.toThrow(/oversized/)});
  it('rejects symlink objects',async()=>{const {root,store}=await make();const outside=join(root,'outside');await writeFile(outside,'x');await symlink(outside,join(root,'evd_12345678.bin'));await expect(store.get('evd_12345678',100)).rejects.toThrow(/invalid|Symlink|symbolic/i)});
  it('deletes objects idempotently',async()=>{const {store}=await make();await store.put('evd_12345678',Buffer.from('x'));await store.delete('evd_12345678');await expect(store.delete('evd_12345678')).resolves.toBeUndefined()});
});
