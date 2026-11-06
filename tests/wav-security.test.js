import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createSunoSahiServer } from '../server.js';

function validWav(){
  const audioBytes=3200;
  const wav=Buffer.alloc(44+audioBytes);
  wav.write('RIFF',0);wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);
  wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);
  wav.writeUInt32LE(16000,24);wav.writeUInt32LE(32000,28);
  wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);
  wav.write('data',36);wav.writeUInt32LE(audioBytes,40);
  return wav;
}
let server,base,providerCalls=0;
before(async()=>{
  server=createSunoSahiServer({
    env:{ENABLE_LIVE_GNANI:'1',GNANI_API_KEY:'mock-provider-only',DEMO_ACCESS_TOKEN:'mock-access'},
    fetchImpl:async()=>{providerCalls++;return Response.json({success:true,transcript:'synthetic test'});}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  base=`http://127.0.0.1:${server.address().port}`;
});
after(async()=>{await new Promise(resolve=>server.close(resolve));});
async function send(bytes){
  const old=providerCalls;
  const response=await fetch(base+'/api/gnani/stt',{method:'POST',headers:{
    Authorization:'Bearer mock-access','Content-Type':'audio/wav','X-Language-Code':'hi-IN'
  },body:bytes});
  return {response,providerUsed:providerCalls>old};
}
test('valid 100ms PCM WAV reaches mock provider',async()=>{
  const r=await send(validWav());assert.equal(r.response.status,200);assert.equal(r.providerUsed,true);
});
test('incorrect RIFF file size is rejected before paid API',async()=>{
  const wav=validWav();wav.writeUInt32LE(wav.length-12,4);
  const r=await send(wav);assert.equal(r.response.status,400);assert.equal(r.providerUsed,false);
});
test('forged byte rate cannot bypass duration checks',async()=>{
  const wav=validWav();wav.writeUInt32LE(999999,28);
  const r=await send(wav);assert.equal(r.response.status,400);assert.equal(r.providerUsed,false);
});
test('wrong block alignment is rejected',async()=>{
  const wav=validWav();wav.writeUInt16LE(1,32);
  const r=await send(wav);assert.equal(r.response.status,400);assert.equal(r.providerUsed,false);
});
test('truncated data chunk is rejected',async()=>{
  const wav=validWav();wav.writeUInt32LE(6000,40);
  const r=await send(wav);assert.equal(r.response.status,400);assert.equal(r.providerUsed,false);
});
test('tampered sample rate is rejected',async()=>{
  const wav=validWav();wav.writeUInt32LE(192000,24);
  const r=await send(wav);assert.equal(r.response.status,400);assert.equal(r.providerUsed,false);
});
test('source files and env files never served from public HTTP',async()=>{
  for(const suffix of ['/.env','/server.js','/tests/wav-security.test.js','/src/gnani-live-smoke.js']){
    const response=await fetch(base+suffix);assert.equal(response.status,404,suffix);
  }
});
test('security headers restrict framing, sniffs and cross-domain API requests',async()=>{
  const status=await fetch(base+'/api/status');
  assert.equal(status.headers.get('x-frame-options'),'DENY');
  assert.equal(status.headers.get('x-content-type-options'),'nosniff');
  const wav=validWav();
  const response=await fetch(base+'/api/gnani/stt',{method:'POST',headers:{
    Authorization:'Bearer mock-access','Content-Type':'audio/wav',Origin:'https://other.example'
  },body:wav});
  assert.equal(response.status,403);
});
