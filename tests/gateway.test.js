import test,{before,after} from 'node:test';import assert from 'node:assert/strict';
import {createSunoSahiServer} from '../server.js';
const audio=(()=>{const n=3200,b=Buffer.alloc(44+n);b.write('RIFF',0);b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(16000,24);b.writeUInt32LE(32000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n,40);return b;})();
let server,url,calls=[];
before(async()=>{
  server=createSunoSahiServer({env:{ENABLE_LIVE_GNANI:'1',GNANI_API_KEY:'test_mock_not_real',DEMO_ACCESS_TOKEN:'local-test-access'},fetchImpl:async(endpoint,opts)=>{calls.push({endpoint,header:opts.headers['X-API-Key-ID'],body:opts.body});if(endpoint.includes('/stt/v3'))return Response.json({success:true,transcript:'१५ दिन रोज ६५०',request_id:'test-123'});return new Response(audio,{headers:{'content-type':'audio/wav'}});}});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));url=`http://127.0.0.1:${server.address().port}`;
});
after(async()=>{await new Promise(resolve=>server.close(resolve));});
const post=(route,body,headers={})=>fetch(url+route,{method:'POST',headers:{Authorization:'Bearer local-test-access',...headers},body});

test('configured status never exposes API key',async()=>{const res=await fetch(url+'/api/status');const t=await res.text();assert.equal(res.status,200);assert.match(t,/liveAvailable/);assert.doesNotMatch(t,/test_mock_not_real/);});
test('rejects unauthorized live calls before contacting Gnani',async()=>{const n=calls.length;const r=await fetch(url+'/api/gnani/stt',{method:'POST',headers:{'Content-Type':'audio/wav'},body:audio});assert.equal(r.status,401);assert.equal(calls.length,n);});
test('rejects mismatched Origin',async()=>{const r=await post('/api/gnani/stt',audio,{'Content-Type':'audio/wav',Origin:'https://attacker.example'});assert.equal(r.status,403);});
test('rejects invalid file type',async()=>{const r=await post('/api/gnani/stt',Buffer.from('evil'),{'Content-Type':'text/plain'});assert.equal(r.status,415);});
test('rejects malformed WAV',async()=>{const r=await post('/api/gnani/stt',Buffer.from('not a WAV'),{'Content-Type':'audio/wav'});assert.equal(r.status,400);});
test('Gnani STT mock contract with header, transcript and no saved key',async()=>{const r=await post('/api/gnani/stt',audio,{'Content-Type':'audio/wav','X-Language-Code':'hi-IN'});const data=await r.json();assert.equal(r.status,200);assert.equal(data.provider,'Gnani Prisma');assert.equal(data.transcript,'१५ दिन रोज ६५०');const call=calls.at(-1);assert.equal(call.endpoint,'https://api.vachana.ai/stt/v3');assert.equal(call.header,'test_mock_not_real');assert.equal(call.body.get('format'),'transcribe');assert.equal(call.body.get('language_code'),'hi-IN');assert.equal(call.body.get('preferred_language'),'hi-IN');});
test('TTS mock contract produces real WAV response from fake provider',async()=>{const r=await post('/api/gnani/tts',JSON.stringify({text:'यह एक परीक्षण है',language:'hi-IN'}),{'Content-Type':'application/json'});assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'audio/wav');const call=calls.at(-1);const payload=JSON.parse(call.body);assert.equal(call.endpoint,'https://api.vachana.ai/api/v1/tts/inference');assert.equal(payload.model,'timbre-v2.5');assert.equal(payload.voice,'Nalini');assert.equal(payload.audio_config.container,'wav');assert.equal(payload.audio_config.sample_rate,16000);});
test('TTS rejects empty and very long payload',async()=>{let r=await post('/api/gnani/tts',JSON.stringify({text:'',language:'hi-IN'}),{'Content-Type':'application/json'});assert.equal(r.status,400);r=await post('/api/gnani/tts',JSON.stringify({text:'a'.repeat(501),language:'hi-IN'}),{'Content-Type':'application/json'});assert.equal(r.status,400);});
test('TTS rejects unsupported language',async()=>{const r=await post('/api/gnani/tts',JSON.stringify({text:'hello',language:'xx-ZZ'}),{'Content-Type':'application/json'});assert.equal(r.status,400);});
test('no secrets or source maps served by path traversal',async()=>{const r=await fetch(url+'/../.env');assert.equal(r.status,404);});

test('key rejection is surfaced to operator without exposing secret or provider body', async () => {
  const privateServer = createSunoSahiServer({
    env:{ ENABLE_LIVE_GNANI:'1', GNANI_API_KEY:'private-value-must-not-appear', DEMO_ACCESS_TOKEN:'check-only' },
    fetchImpl:async()=>new Response('private-value-must-not-appear invalid', {status:401})
  });
  await new Promise(resolve=>privateServer.listen(0,'127.0.0.1',resolve));
  try {
    const endpoint=`http://127.0.0.1:${privateServer.address().port}/api/gnani/tts`;
    const r=await fetch(endpoint,{
      method:'POST',headers:{Authorization:'Bearer check-only','Content-Type':'application/json'},
      body:JSON.stringify({text:'नमस्ते',language:'hi-IN'})
    });
    const result=await r.text();
    assert.equal(r.status,502);
    assert.match(result,/gnani_auth_failed/);
    assert.doesNotMatch(result,/private-value-must-not-appear/);
  } finally {
    await new Promise(resolve=>privateServer.close(resolve));
  }
});

test('selftest endpoint uses mock Gnani TTS and STT with no leaked credential', async () => {
  const observed=[];
  const server2=createSunoSahiServer({
    env:{ENABLE_LIVE_GNANI:'1',GNANI_API_KEY:'private-not-to-leak',DEMO_ACCESS_TOKEN:'selftest-secret'},
    fetchImpl:async (u,opts)=>{observed.push({url:u,header:opts.headers['X-API-Key-ID']});
      if(u.includes('/tts/inference'))return new Response(audio,{headers:{'content-type':'audio/wav'}});
      return Response.json({success:true,transcript:'नमस्ते यह सुनो सही का परीक्षण है',request_id:'test-mock'});
    }
  });
  await new Promise(resolve=>server2.listen(0,'127.0.0.1',resolve));
  const endpoint=`http://127.0.0.1:${server2.address().port}/api/gnani/selftest`;
  try{
    const r=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer selftest-secret'}});
    const result=await r.text();
    assert.equal(r.status,200);
    assert.equal(JSON.parse(result).stage,'complete');
    assert.equal(observed.length,2);
    assert.doesNotMatch(result,/private-not-to-leak|selftest-secret/);
  }finally{await new Promise(resolve=>server2.close(resolve));}
});
