import { readdir } from 'node:fs/promises';
async function walk(path){const entries=await readdir(path,{withFileTypes:true});return (await Promise.all(entries.map(entry=>entry.isDirectory()?walk(`${path}/${entry.name}`):[`${path}/${entry.name}`]))).flat();}
const files=await walk('dist').catch(()=>[]),bad=files.filter(x=>/\.(test|spec)\.[cm]?js$/.test(x)||/[\\/]test[\\/]/.test(x));
if(bad.length)throw new Error(`Compiled tests found: ${bad.join(', ')}`);
console.log('No compiled tests found in server/dist.');
