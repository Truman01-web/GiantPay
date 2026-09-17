import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root=resolve(import.meta.dirname,'..'), output=resolve(process.env.RELEASE_OUTPUT_DIR??join(root,'release'));
const version=process.env.RELEASE_VERSION, gitSha=process.env.GIT_SHA, epoch=process.env.SOURCE_DATE_EPOCH;
if(!version||!/^\d+\.\d+\.\d+(?:[-+][\w.-]+)?$/.test(version))throw new Error('RELEASE_VERSION must be a semantic version');
if(!gitSha||!/^[0-9a-f]{40}$/.test(gitSha))throw new Error('GIT_SHA must be a full lowercase Git SHA');
if(!epoch||!/^\d+$/.test(epoch))throw new Error('SOURCE_DATE_EPOCH is required for deterministic metadata');
const migrations=readdirSync(join(root,'migrations')).filter(x=>/^\d+_.+\.sql$/.test(x)).sort();
const manifest={schemaVersion:1,application:'giantpay-api',version,gitSha,migrationVersion:migrations.at(-1)?.split('_')[0]??null,builtAt:new Date(Number(epoch)*1000).toISOString(),deployment:'sandbox',providers:{payments:'sandbox',payouts:false,email:false,sms:false}};
mkdirSync(output,{recursive:true});
writeFileSync(join(output,'release-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
const listed=JSON.parse(process.platform==='win32'
  ? execFileSync('cmd.exe',['/d','/s','/c','pnpm.cmd list --prod --json --depth Infinity'],{cwd:root,encoding:'utf8'})
  : execFileSync('pnpm',['list','--prod','--json','--depth','Infinity'],{cwd:root,encoding:'utf8'}))[0];
const packages=new Map();
const visit=(deps={})=>Object.entries(deps).forEach(([name,value])=>{const item=value??{};packages.set(`${name}@${item.version}`,{SPDXID:`SPDXRef-${createHash('sha256').update(`${name}@${item.version}`).digest('hex').slice(0,16)}`,name,versionInfo:item.version??'unknown',downloadLocation:'NOASSERTION',filesAnalyzed:false});visit(item.dependencies);});
visit(listed.dependencies);
const sbom={spdxVersion:'SPDX-2.3',dataLicense:'CC0-1.0',SPDXID:'SPDXRef-DOCUMENT',name:`giantpay-api-${version}`,documentNamespace:`https://giantpay.mw/sbom/${gitSha}`,creationInfo:{created:manifest.builtAt,creators:['Organization: GiantPay']},packages:[...packages.values()].sort((a,b)=>a.name.localeCompare(b.name))};
writeFileSync(join(output,'sbom.spdx.json'),JSON.stringify(sbom,null,2)+'\n');
const files=[];const walk=dir=>{for(const name of readdirSync(dir)){const path=join(dir,name);if(statSync(path).isDirectory())walk(path);else files.push(path);}};
for(const path of [join(root,'dist'),join(root,'migrations'),join(root,'openapi'),join(output,'release-manifest.json'),join(output,'sbom.spdx.json')]){if(statSync(path).isDirectory())walk(path);else files.push(path);}
const checksums=files.sort().map(path=>`${createHash('sha256').update(readFileSync(path)).digest('hex')}  ${relative(root,path).replaceAll('\\','/')}`).join('\n')+'\n';
writeFileSync(join(output,'SHA256SUMS'),checksums);
console.log(JSON.stringify({event:'release_metadata_created',version,gitSha,migrationVersion:manifest.migrationVersion,artifacts:files.length}));
