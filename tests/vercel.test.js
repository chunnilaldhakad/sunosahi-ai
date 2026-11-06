import test from 'node:test';
import assert from 'node:assert/strict';
import {createSunoSahiHandler} from '../server.js';
import fs from 'node:fs/promises';
import path from 'node:path';

function fakeRes(){
  const headers={};let status=200;let output;
  return {
    setHeader(k,v){headers[k.toLowerCase()]=v;},
    writeHead(s,h={}){status=s;for(const [k,v] of Object.entries(h))headers[k.toLowerCase()]=v;},
    end(data){output=data;this.writableEnded=true;},
    get status(){return status;},get data(){return output;},get headers(){return headers;},writableEnded:false
  };
}
const conf={ENABLE_LIVE_GNANI:'1',GNANI_API_KEY:'mock-unit-only',DEMO_ACCESS_TOKEN:'private-mock-access'};
test('serverless configured status does not leak key',async()=>{
 const handle=createSunoSahiHandler({env:conf});const res=fakeRes();
 await handle({url:'/api/status',headers:{host:'example.vercel.app'},method:'GET'},res);
 assert.equal(res.status,200);assert.equal(JSON.parse(res.data).liveAvailable,true);
 assert.doesNotMatch(res.data,/mock-unit-only/);
});
test('Vercel parsed JSON request body allows safe TTS proxy',async()=>{
 let called=0;
 const handle=createSunoSahiHandler({env:conf,fetchImpl:async(url,req)=>{
  called++;
  assert.equal(req.headers['X-API-Key-ID'],'mock-unit-only');
  const audio=Buffer.alloc(44);audio.write('RIFF');audio.write('WAVE',8);
  return new Response(audio,{headers:{'content-type':'audio/wav'}});
 }});
 const res=fakeRes();
 await handle({url:'/api/gnani/tts',method:'POST',headers:{host:'example.vercel.app','content-type':'application/json',authorization:'Bearer private-mock-access'},body:{language:'hi-IN',text:'नमस्ते'},socket:{remoteAddress:'127.0.0.1'}},res);
 assert.equal(res.status,200);assert.equal(called,1);assert.equal(res.headers['content-type'],'audio/wav');
});
test('serverless function refuses calls when not configured',async()=>{
 const handle=createSunoSahiHandler({env:{}});const res=fakeRes();
 await handle({url:'/api/gnani/selftest',method:'POST',headers:{host:'example.vercel.app'},socket:{remoteAddress:'127.0.0.1'}},res);
 assert.equal(res.status,503);assert.equal(JSON.parse(res.data).code,'not_configured');
});
test('serverless wrappers and public output config exist',async()=>{
 const root=path.resolve(import.meta.dirname,'..');
 const config=JSON.parse(await fs.readFile(path.join(root,'vercel.json'),'utf8'));
 assert.equal(config.outputDirectory,'public');
 for(const p of ['api/status.js','api/gnani/stt.js','api/gnani/tts.js','api/gnani/selftest.js']){
  const content=await fs.readFile(path.join(root,p),'utf8');
  assert.match(content,/createSunoSahiHandler/);
 }
});
