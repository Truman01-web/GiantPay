import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('disposable demo seed', () => {
  it('populates the normalized email used by real merchant login', async () => {
    const source = await readFile(resolve('src/seed.ts'), 'utf8');
    expect(source).toContain('email,normalized_email,password_hash');
    expect(source).toContain('normalized_email=excluded.normalized_email');
  });
});
