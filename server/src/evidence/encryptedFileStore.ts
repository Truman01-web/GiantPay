import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { lstat, mkdir, open, readdir, stat, unlink } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import type { EvidenceStore } from './service.js';

const HEADER = Buffer.from('GPE1');
const withDeadline = async <T>(promise: Promise<T>, ms: number): Promise<T> => Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('evidence storage deadline exceeded')), ms))]);

export class EncryptedFileStore implements EvidenceStore {
  private root: string;
  constructor(root: string, private key: Buffer, private quotaBytes = 512 * 1024 * 1024, private operationTimeoutMs = 5_000) {
    if (key.length !== 32) throw new Error('Evidence encryption key must contain exactly 32 bytes');
    this.root = resolve(root);
  }
  private path(id: string) {
    if (!/^evd_[A-Za-z0-9_-]{8,100}$/.test(id)) throw new Error('Invalid evidence object identifier');
    const path = resolve(this.root, `${id}.bin`);
    if (!path.startsWith(`${this.root}${sep}`)) throw new Error('Evidence path escaped its private root');
    return path;
  }
  private async prepare() {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    const rootStat = await lstat(this.root);
    if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) throw new Error('Evidence root must be a private directory');
  }
  private async usage() {
    let total = 0;
    for (const name of await readdir(this.root)) {
      const item = await lstat(resolve(this.root, name));
      if (item.isSymbolicLink()) throw new Error('Symlinks are forbidden in evidence storage');
      if (item.isFile()) total += item.size;
    }
    return total;
  }
  async put(id: string, value: Buffer) {
    await withDeadline((async () => {
      await this.prepare();
      const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', this.key, iv);
      const encrypted = Buffer.concat([cipher.update(value), cipher.final()]), tag = cipher.getAuthTag();
      const payload = Buffer.concat([HEADER, iv, tag, encrypted]);
      if ((await this.usage()) + payload.length > this.quotaBytes) throw new Error('Evidence storage quota exceeded');
      const handle = await open(this.path(id), 'wx', 0o600);
      try { await handle.writeFile(payload); await handle.sync(); } catch (error) { await handle.close(); await unlink(this.path(id)).catch(() => undefined); throw error; }
      await handle.close();
    })(), this.operationTimeoutMs);
  }
  async get(id: string, maximumBytes: number) {
    return withDeadline((async () => {
      await this.prepare(); const path = this.path(id); const item = await lstat(path);
      if (item.isSymbolicLink() || !item.isFile() || item.size > maximumBytes + 64) throw new Error('Stored evidence object is invalid or oversized');
      const handle = await open(path, 'r'); const payload = await handle.readFile(); await handle.close();
      if (!payload.subarray(0, 4).equals(HEADER) || payload.length < 32) throw new Error('Stored evidence object is invalid');
      const decipher = createDecipheriv('aes-256-gcm', this.key, payload.subarray(4, 16)); decipher.setAuthTag(payload.subarray(16, 32));
      const value = Buffer.concat([decipher.update(payload.subarray(32)), decipher.final()]);
      if (value.length > maximumBytes) throw new Error('Stored evidence object is oversized');
      return value;
    })(), this.operationTimeoutMs);
  }
  async delete(id: string) { await withDeadline(unlink(this.path(id)).catch((e: NodeJS.ErrnoException) => { if (e.code !== 'ENOENT') throw e; }), this.operationTimeoutMs); }
}
