import { spawnSync } from 'node:child_process';
import { mkdtempSync,readFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
if(!process.env.TEST_DATABASE_URL)throw new Error('TEST_DATABASE_URL is required by test:ci.');
const directory=mkdtempSync(join(tmpdir(),'giantpay-tests-')),report=join(directory,'report.json');
try {
  const result=spawnSync(process.platform==='win32'?'pnpm.cmd':'pnpm',['exec','vitest','run','--reporter=json',`--outputFile=${report}`],{stdio:'inherit',env:{...process.env,REQUIRE_INTEGRATION_TESTS:'true'}});
  if(result.status!==0)throw new Error(`Vitest failed with exit code ${result.status??1}.`);
  const summary=JSON.parse(readFileSync(report,'utf8'));
  if(summary.numPendingTests!==0)throw new Error(`Unexpected skipped tests: ${summary.numPendingTests}`);
  console.log(`${summary.numPassedTests} tests passed with zero skips.`);
} finally { rmSync(directory,{recursive:true,force:true}); }
