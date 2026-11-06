import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'public');
await fs.rm(out,{recursive:true,force:true});
await fs.mkdir(path.join(out,'src'),{recursive:true});
await fs.copyFile(path.join(root,'index.html'),path.join(out,'index.html'));
for(const name of ['app.js','core.js','extract.js','sha256.js','voice.js','styles.css']){
  await fs.copyFile(path.join(root,'src',name),path.join(out,'src',name));
}
console.log('Public static assets built (no backend, keys, or tests in public/)');
