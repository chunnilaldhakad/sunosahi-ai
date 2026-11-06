import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ignored=new Set(['.git','node_modules','public','.vercel','qa','qa-file','qa-artifacts']);
const hits=[]; let scanned=0;
async function walk(dir){
 for(const entry of await fs.readdir(dir,{withFileTypes:true})){
  const f=path.join(dir,entry.name);
  if(entry.isDirectory()){if(!ignored.has(entry.name))await walk(f);continue;}
  if(!entry.isFile())continue;
  const rel=path.relative(root,f);
  if(/^\.env($|\.)/.test(entry.name)&&entry.name!=='.env.example')hits.push(rel+': private environment file');
  if(!/\.(js|mjs|json|md|yml|yaml|html|css|txt)$/.test(entry.name))continue;
  const body=await fs.readFile(f,'utf8');scanned++;
  if(/vach_[A-Za-z0-9_-]{55,}/.test(body))hits.push(rel+': possible Gnani secret');
  if(/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/.test(body))hits.push(rel+': private key');
 }
}
await walk(root);
if(hits.length){console.error('Credential safety preflight FAILED:',hits.join('; '));process.exitCode=1;}
else console.log('Credential preflight passed ('+scanned+' files)');
