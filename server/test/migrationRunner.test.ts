import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe,expect,it } from 'vitest';
import { EXPECTED_MIGRATIONS } from '../src/migrationRunner.js';

describe('migration manifest',()=>{
  it('contains migrations 001 through 012 exactly once in lexical order',async()=>{const files=(await readdir(resolve('migrations'))).filter(x=>x.endsWith('.sql')).sort();expect(files).toEqual([...EXPECTED_MIGRATIONS]);expect(new Set(files).size).toBe(12);});
});
