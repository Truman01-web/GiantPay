import {describe,expect,it} from 'vitest';
// JavaScript is intentional: the production CI runner executes directly in Node.
// @ts-ignore -- the helper is an ESM JavaScript module used by the Node runner.
import {formatVitestFailureReport} from '../scripts/run-tests-report.mjs';

describe('Vitest CI failure reporting',()=>{
  it('prints each failed file, full test name, message, stack, stdout and stderr',()=>{
    const report=formatVitestFailureReport({testResults:[
      {name:'/workspace/test/first.test.ts',assertionResults:[{status:'failed',fullName:'suite first failure',failureMessages:['AssertionError: expected true\n    at first.test.ts:10:4']}]},
      {name:'/workspace/test/second.test.ts',assertionResults:[{status:'passed',fullName:'suite passes'},{status:'failed',ancestorTitles:['outer','inner'],title:'second failure',failureDetails:[{message:'database rejected row',stack:'Error: database rejected row\n    at second.test.ts:20:8'}]}]},
    ]},'captured standard output\n','captured standard error\n');
    expect(report).toContain('File: /workspace/test/first.test.ts');
    expect(report).toContain('Test: suite first failure');
    expect(report).toContain('Failure: AssertionError: expected true');
    expect(report).toContain('at first.test.ts:10:4');
    expect(report).toContain('File: /workspace/test/second.test.ts');
    expect(report).toContain('Test: outer > inner > second failure');
    expect(report).toContain('database rejected row');
    expect(report).toContain('Captured stdout:\ncaptured standard output');
    expect(report).toContain('Captured stderr:\ncaptured standard error');
  });
});
