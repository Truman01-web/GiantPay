import SwaggerParser from '@apidevtools/swagger-parser';
import { resolve } from 'node:path';

const api=await SwaggerParser.validate(resolve('openapi/giantpay-v1.yaml'));
const ids=[];
for(const item of Object.values(api.paths??{}))for(const operation of Object.values(item??{}))if(operation&&typeof operation==='object'&&'operationId' in operation)ids.push(operation.operationId);
const duplicates=ids.filter((id,index)=>ids.indexOf(id)!==index);
if(duplicates.length)throw new Error(`Duplicate operationId: ${[...new Set(duplicates)].join(', ')}`);
for(const path of ['/developer/api-keys','/developer/webhooks'])if(!api.paths?.[path])throw new Error(`Missing developer endpoint ${path}`);
for(const scheme of ['cookieSession','sandboxApiKey'])if(!api.components?.securitySchemes?.[scheme])throw new Error(`Missing authentication scheme ${scheme}`);
console.log(`Validated OpenAPI ${api.openapi}: ${Object.keys(api.paths??{}).length} paths, ${ids.length} operations.`);
