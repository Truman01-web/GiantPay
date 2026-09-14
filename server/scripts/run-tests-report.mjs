const text=(value)=>typeof value==='string'?value:String(value??'');

function messageAndStack(assertion){
  const failures=Array.isArray(assertion.failureMessages)?assertion.failureMessages.filter(Boolean):[];
  const details=Array.isArray(assertion.failureDetails)?assertion.failureDetails:[];
  const combined=failures.length?failures.map(text).join('\n'):details.map((detail)=>text(detail?.stack??detail?.message??detail)).join('\n');
  if(!combined)return{message:'No failure message was recorded.',stack:''};
  const lines=combined.split(/\r?\n/),stackAt=lines.findIndex((line,index)=>index>0&&/^\s*(at |Caused by:)/.test(line));
  return stackAt<0?{message:combined,stack:''}:{message:lines.slice(0,stackAt).join('\n'),stack:lines.slice(stackAt).join('\n')};
}

export function formatVitestFailureReport(summary,stdout='',stderr=''){
  const lines=['Vitest failed.'];let count=0;
  for(const file of summary?.testResults??[]){
    for(const assertion of file?.assertionResults??[]){
      if(assertion?.status!=='failed')continue;count++;
      const failure=messageAndStack(assertion),fullName=assertion.fullName??[...(assertion.ancestorTitles??[]),assertion.title].filter(Boolean).join(' > ');
      lines.push('',`Failed test ${count}:`,`File: ${file.name??file.filepath??'Unknown test file'}`,`Test: ${fullName||'Unknown test'}`,`Failure: ${failure.message}`);
      if(failure.stack)lines.push(`Stack:\n${failure.stack}`);
    }
  }
  if(count===0)lines.push('No failed assertion details were present in the JSON report.');
  lines.push('','Captured stdout:',stdout||'(empty)','', 'Captured stderr:',stderr||'(empty)');
  return lines.join('\n');
}
