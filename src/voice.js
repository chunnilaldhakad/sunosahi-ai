/** Local audio helpers. No network activity in this module. */
export async function toMonoPcmWav(blob){
  if(blob.size>10*1024*1024)throw new Error('Recording exceeds local 10 MB limit');
  const Ctx=window.AudioContext||window.webkitAudioContext;
  if(!Ctx)throw new Error('Audio conversion unsupported in this browser');
  const ctx=new Ctx();
  try{
    const decoded=await ctx.decodeAudioData(await blob.arrayBuffer());
    if(decoded.duration>60||decoded.duration<.08)throw new Error('Record between 0.1 and 60 seconds');
    const destRate=16000, count=Math.ceil(decoded.duration*destRate);
    if(count*2+44>5*1024*1024)throw new Error('Audio too large');
    const combined=new Float32Array(decoded.length);
    for(let ch=0;ch<decoded.numberOfChannels;ch++){const data=decoded.getChannelData(ch);for(let i=0;i<data.length;i++)combined[i]+=data[i]/decoded.numberOfChannels;}
    const wav=new ArrayBuffer(44+count*2),view=new DataView(wav);
    const ascii=(start,v)=>{for(let i=0;i<v.length;i++)view.setUint8(start+i,v.charCodeAt(i));};
    ascii(0,'RIFF');view.setUint32(4,wav.byteLength-8,true);ascii(8,'WAVE');ascii(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,destRate,true);view.setUint32(28,destRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);ascii(36,'data');view.setUint32(40,count*2,true);
    for(let i=0;i<count;i++){const pos=i*decoded.sampleRate/destRate;const a=Math.floor(pos);const b=Math.min(a+1,combined.length-1);const v=combined[a]*(1-(pos-a))+combined[b]*(pos-a);const clamped=Math.max(-1,Math.min(1,v||0));view.setInt16(44+i*2,Math.round(clamped<0?clamped*32768:clamped*32767),true);}
    return new Blob([wav],{type:'audio/wav'});
  }finally{await ctx.close();}
}
export function recordMicrophone({maxMs=30000,onComplete,onError,onStop}){
  let stream,recorder,chunks=[],stopTimer;
  const start=async()=>{
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('Microphone requires HTTPS/localhost and browser permission');
    stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});
    recorder=new MediaRecorder(stream);recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    recorder.onstop=()=>{clearTimeout(stopTimer);stream.getTracks().forEach(t=>t.stop());onComplete(new Blob(chunks,{type:recorder.mimeType||'audio/webm'}));onStop?.();};
    recorder.onerror=()=>{onError?.('Recorder failed');stream.getTracks().forEach(t=>t.stop());};
    recorder.start();stopTimer=setTimeout(()=>{if(recorder.state==='recording')recorder.stop();},maxMs);
  };
  const stop=()=>{if(recorder?.state==='recording')recorder.stop();};
  return {start,stop};
}
