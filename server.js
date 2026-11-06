/** SunoSahi HTTPS-ready, consent-first Gnani gateway. Requires Node 20+. */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { timingSafeEqual } from 'node:crypto';
import { verifyGnaniLive } from './src/gnani-live-smoke.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const TYPES = { '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8' };
const STT_URL='https://api.vachana.ai/stt/v3';
const TTS_URL='https://api.vachana.ai/api/v1/tts/inference';
const MAX_AUDIO=4*1024*1024, MAX_SECONDS=60, MAX_TTS_CHARS=500;
const ALLOWED_LANGUAGES=new Set(['hi-IN','en-IN','bn-IN','gu-IN','kn-IN','ml-IN','mr-IN','pa-IN','ta-IN','te-IN']);

function json(res,status,payload){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(payload));}
function fail(res,status,code,message){json(res,status,{ok:false,code,message});}
function equalSafe(a,b){if(!a||!b)return false;const x=Buffer.from(String(a)),y=Buffer.from(String(b));return x.length===y.length&&timingSafeEqual(x,y);}
function readBody(req,max){
  // Vercel's Node handler may pre-parse req.body, unlike a raw Node HTTP server.
  if(req.body!==undefined && req.body!==null){
    const ct=String(req.headers?.['content-type']||'');
    const b=Buffer.isBuffer(req.body)?req.body: req.body instanceof Uint8Array?Buffer.from(req.body):
      typeof req.body==='string'?Buffer.from(req.body,'utf8'):
      typeof req.body==='object' && ct.includes('application/json')?Buffer.from(JSON.stringify(req.body),'utf8'):null;
    if(!b) return Promise.reject(Object.assign(new Error('invalid_body'),{status:400}));
    if(b.length>max) return Promise.reject(Object.assign(new Error('request_too_large'),{status:413}));
    return Promise.resolve(b);
  }
  return new Promise((resolve,reject)=>{
    let size=0;const chunks=[];
    req.on('data',chunk=>{
      size+=chunk.length;
      if(size>max){reject(Object.assign(new Error('request_too_large'),{status:413}));req.destroy();}
      else chunks.push(chunk);
    });
    req.on('end',()=>resolve(Buffer.concat(chunks)));
    req.on('error',reject);
  });
}
function securityHeaders(res){res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Frame-Options','DENY');res.setHeader('Permissions-Policy','microphone=(self), camera=(), geolocation=()');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; font-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'");}
function wavDuration(data){
  // Only accept structurally consistent, uncompressed PCM WAV with a truthful size and byte rate.
  // This is a validation boundary before forwarding recordings to a paid external service.
  if(data.length<44||data.subarray(0,4).toString('ascii')!=='RIFF'||data.subarray(8,12).toString('ascii')!=='WAVE')return null;
  if(data.readUInt32LE(4)+8!==data.length)return null;
  let cursor=12,fmt=null,audioBytes=null;
  while(cursor+8<=data.length){
    const name=data.toString('ascii',cursor,cursor+4);
    const length=data.readUInt32LE(cursor+4),start=cursor+8;
    const next=start+length+(length%2);
    if(next>data.length)return null;
    if(name==='fmt '){
      if(fmt!==null||length<16)return null;
      fmt={audioFormat:data.readUInt16LE(start),channels:data.readUInt16LE(start+2),
        sampleRate:data.readUInt32LE(start+4),byteRate:data.readUInt32LE(start+8),
        blockAlign:data.readUInt16LE(start+12),bits:data.readUInt16LE(start+14)};
    }
    if(name==='data'){
      if(audioBytes!==null)return null;
      audioBytes=length;
    }
    cursor=next;
  }
  if(cursor!==data.length||!fmt||audioBytes===null||audioBytes===0)return null;
  if(fmt.audioFormat!==1||![1,2].includes(fmt.channels)||![8,16,24,32].includes(fmt.bits))return null;
  if(fmt.sampleRate<8000||fmt.sampleRate>48000)return null;
  const expectedAlign=fmt.channels*fmt.bits/8;
  if(fmt.blockAlign!==expectedAlign||fmt.byteRate!==fmt.sampleRate*expectedAlign)return null;
  if(audioBytes%fmt.blockAlign!==0)return null;
  const duration=audioBytes/fmt.byteRate;
  return Number.isFinite(duration)&&duration>=.05&&duration<=MAX_SECONDS?duration:null;
}
function newLimiter(){const windows=new Map();return (ip)=>{const now=Date.now(),minute=Math.floor(now/60000);const key=ip+':'+minute;for(const [k,v] of windows){if(v.time<minute-1)windows.delete(k);}const v=windows.get(key)||{time:minute,count:0};v.count++;windows.set(key,v);return v.count<=12;};}
const checkOrigin=(req)=>{const origin=req.headers.origin;if(!origin)return true;try{return new URL(origin).host===req.headers.host;}catch{return false;}};
function upstreamFailure(res,status,service){
  if(status===401||status===403) return fail(res,502,'gnani_auth_failed',`Gnani ${service} rejected the configured server API credentials`);
  if(status===429){res.setHeader('Retry-After','60');return fail(res,429,'gnani_rate_limited',`Gnani ${service} rate limit reached`);}
  if(status===400||status===415)return fail(res,502,'gnani_invalid_request',`Gnani ${service} rejected the prepared request`);
  if(status===503)return fail(res,503,'gnani_unavailable',`Gnani ${service} is temporarily unavailable`);
  return fail(res,502,'gnani_upstream_error',`Gnani ${service} returned an unexpected status`);
}

export function createSunoSahiHandler({env=process.env,fetchImpl=fetch,root=ROOT}={}){
  const limiter=newLimiter();
  const smokeUsage=new Map();
  return async(req,res)=>{
    securityHeaders(res);res.setHeader('Cache-Control','no-store');
    const method=req.method||'GET';let url;
    try{url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);}catch{fail(res,400,'bad_request','Invalid URL');return;}
    const route=url.pathname;
    if(route==='/api/status'){
      if(method!=='GET'){fail(res,405,'method_not_allowed','Use GET');return;}
      json(res,200,{ok:true,mode:'synthetic_demo',liveAvailable:Boolean(env.GNANI_API_KEY&&env.ENABLE_LIVE_GNANI==='1'&&env.DEMO_ACCESS_TOKEN),gnaniModelAccuracyMeasured:false,demoAudioStored:false,models:['Prisma STT v2.5','Timbre TTS v2.5']});return;
    }
    if(route.startsWith('/api/gnani/')){
      if(method!=='POST'){fail(res,405,'method_not_allowed','Use POST');return;}
      if(!checkOrigin(req)||req.headers['sec-fetch-site']==='cross-site'){fail(res,403,'forbidden','Cross-origin requests are not allowed');return;}
      if(!env.GNANI_API_KEY||env.ENABLE_LIVE_GNANI!=='1'||!env.DEMO_ACCESS_TOKEN){fail(res,503,'not_configured','Live Gnani mode is off. The synthetic demo still works.');return;}
      const bearer=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
      if(!equalSafe(bearer,env.DEMO_ACCESS_TOKEN)){fail(res,401,'unauthorized','Enter the private demo access passphrase, not the Gnani API key');return;}
      const ip=req.socket.remoteAddress||'unknown';if(!limiter(ip)){res.setHeader('Retry-After','60');fail(res,429,'rate_limited','Demo voice request limit reached');return;}
      try{
        if(route==='/api/gnani/selftest'){
          // Small, explicitly requested synthetic probe; each request uses paid TTS + STT.
          const now=Date.now(), used=smokeUsage.get(ip)||[];
          const recent=used.filter(t=>now-t<3600000);
          if(recent.length>=2){res.setHeader('Retry-After','3600');fail(res,429,'selftest_rate_limited','Synthetic verification is limited to two runs per hour');return;}
          recent.push(now);smokeUsage.set(ip,recent);
          const outcome=await verifyGnaniLive({apiKey:env.GNANI_API_KEY,fetchImpl,timeoutMs:25000});
          json(res,outcome.ok?200:502,outcome);return;
        }
        if(route==='/api/gnani/stt'){
          const language=String(req.headers['x-language-code']||'hi-IN');if(!ALLOWED_LANGUAGES.has(language)){fail(res,400,'invalid_language','Unsupported language');return;}
          if(!String(req.headers['content-type']||'').includes('audio/wav')){fail(res,415,'invalid_audio','Send a PCM WAV file');return;}
          if(Number(req.headers['content-length']||0)>MAX_AUDIO){fail(res,413,'audio_too_large','Audio must be 4 MB or smaller');return;}
          const audio=await readBody(req,MAX_AUDIO),dur=wavDuration(audio);
          if(!dur){fail(res,400,'invalid_audio','Expected a valid PCM WAV between 0 and 60 seconds');return;}
          const form=new FormData();form.append('audio_file',new Blob([audio],{type:'audio/wav'}),'recording.wav');form.append('language_code',language);form.append('preferred_language',language);form.append('format','transcribe');form.append('itn_native_numerals','false');
          const upstream=await fetchImpl(STT_URL,{method:'POST',headers:{'X-API-Key-ID':env.GNANI_API_KEY},body:form,signal:AbortSignal.timeout(25000)});
          if(!upstream.ok){upstreamFailure(res,upstream.status,'STT');return;}
          const data=await upstream.json();if(data?.success!==true||typeof data.transcript!=='string'){fail(res,502,'upstream_unexpected','Gnani returned an unexpected transcription response');return;}
          json(res,200,{ok:true,provider:'Gnani Prisma',transcript:data.transcript,language,request_id:typeof data.request_id==='string'?data.request_id:null,duration_s:Number(dur.toFixed(2))});return;
        }
        if(route==='/api/gnani/tts'){
          if(!String(req.headers['content-type']||'').startsWith('application/json')){fail(res,415,'invalid_json','Expected JSON');return;}
          const body=JSON.parse((await readBody(req,2048)).toString('utf8'));
          const language=body?.language??'hi-IN',text=body?.text;
          if(!ALLOWED_LANGUAGES.has(language)||typeof text!=='string'||text.trim().length<1||text.length>MAX_TTS_CHARS){fail(res,400,'invalid_text','Provide 1–500 characters and a supported language');return;}
          const payload={text:text.trim(),voice:'Nalini',model:'timbre-v2.5',language,speed:1,audio_config:{sample_rate:16000,num_channels:1,sample_width:2,encoding:'linear_pcm',container:'wav'}};
          const upstream=await fetchImpl(TTS_URL,{method:'POST',headers:{'X-API-Key-ID':env.GNANI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(25000)});
          if(!upstream.ok){upstreamFailure(res,upstream.status,'TTS');return;}
          const ct=String(upstream.headers.get('content-type')||'');let audio;
          if(ct.includes('audio/')||ct.includes('application/octet-stream')) audio=Buffer.from(await upstream.arrayBuffer());
          else if(ct.includes('application/json')){
            const data=await upstream.json();const base64=data?.audio_base64||data?.audio||data?.data?.audio_base64;
            if(typeof base64!=='string'||!base64||!/^[a-zA-Z0-9+/=\r\n]+$/.test(base64)){fail(res,502,'upstream_unexpected','Gnani TTS did not return supported WAV audio');return;}audio=Buffer.from(base64,'base64');
          }else{fail(res,502,'upstream_unexpected','Gnani TTS returned unexpected content type');return;}
          if(audio.length>8*1024*1024||audio.subarray(0,4).toString('ascii')!=='RIFF'){fail(res,502,'upstream_unexpected','Gnani TTS audio must be WAV');return;}
          res.writeHead(200,{'Content-Type':'audio/wav','Cache-Control':'no-store','Content-Length':audio.length});res.end(audio);return;
        }
        fail(res,404,'not_found','Unknown API operation');return;
      }catch(e){if(!res.writableEnded){const code=e?.name==='TimeoutError'?'timeout':e?.message==='request_too_large'?'audio_too_large':'service_error';fail(res,code==='audio_too_large'?413:502,code,code==='timeout'?'Gnani request timed out':'Voice processing failed safely');}return;}
    }
    if(method!=='GET'&&method!=='HEAD'){fail(res,405,'method_not_allowed','Only GET allowed');return;}
    if(route.includes('\0')){fail(res,400,'bad_path','Invalid path');return;}
    // Serve only public UI assets; never expose .env, backend source, tests or config.
    if(!(route==='/'||route==='/index.html'||/^\/src\/(?:app|core|extract|sha256|voice)\.js$/.test(route)||route==='/src/styles.css'||/^\/public\/[a-zA-Z0-9_.-]+\.(?:svg|ico|txt)$/.test(route))){fail(res,404,'not_found','Not found');return;}
    let filePath;
    try{filePath=path.resolve(root,'.'+(route==='/'?'/index.html':decodeURIComponent(route)));}catch{fail(res,400,'bad_path','Invalid path');return;}
    if(!filePath.startsWith(root+path.sep)&&filePath!==path.join(root,'index.html')){fail(res,403,'forbidden','Forbidden');return;}
    try{const contents=await fs.readFile(filePath);res.writeHead(200,{'Content-Type':TYPES[path.extname(filePath)]||'application/octet-stream'});if(method==='GET')res.end(contents);else res.end();}catch{fail(res,404,'not_found','Not found');}
  };
}
export function createSunoSahiServer(options={}) {return http.createServer(createSunoSahiHandler(options));}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const port=Number(process.env.PORT||4173);createSunoSahiServer().listen(port,()=>console.log(`SunoSahi listening on http://localhost:${port} (no key is logged)`));
}
