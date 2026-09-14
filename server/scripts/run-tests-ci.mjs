import { spawnSync } from 'node:child_process';
import { existsSync,mkdtempSync,readFileSync,rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { formatVitestFailureReport } from './run-tests-report.mjs';

if(!process.env.TEST_DATABASE_URL)throw new Error('TEST_DATABASE_URL is required by test:ci.');
const directory=mkdtempSync(join(tmpdir(),'giantpay-tests-')),report=join(directory,'report.json');
try {
  const result=spawnSync(process.platform==='win32'?'pnpm.cmd':'pnpm',['exec','vitest','run','--reporter=json',`--outputFile=${report}`,'--maxWorkers=1'],{encoding:'utf8',env:{...process.env,REQUIRE_INTEGRATION_TESTS:'true'},shell:process.platform==='win32'});
  const stdout=result.stdout??'',stderr=result.stderr??'';
  if(result.status!==0){
    let summary;
    try { if(existsSync(report))summary=JSON.parse(readFileSync(report,'utf8')); }
    catch(error){console.error(`Unable to parse Vitest JSON report: ${error instanceof Error?error.message:'unknown error'}`);}
    console.error(formatVitestFailureReport(summary,stdout,stderr));
    if(result.error)console.error(result.error.message);
    process.exitCode=result.status??1;
  } else {
    if(stdout)process.stdout.write(stdout);
    if(stderr)process.stderr.write(stderr);
    const summary=JSON.parse(readFileSync(report,'utf8'));
    if(summary.numPendingTests!==0)throw new Error(`Unexpected skipped tests: ${summary.numPendingTests}`);
    console.log(`${summary.numPassedTests} tests passed with zero skips.`);
  }
} finally { rmSync(directory,{recursive:true,force:true}); }
