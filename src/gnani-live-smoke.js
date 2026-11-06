/**
 * Two-call, synthetic-data-only live Gnani verification.
 * Never log the key, responses containing it, or the audio payload.
 * This smoke test verifies the wire contract only, not real-world ASR accuracy.
 */
export const GNANI_STT = 'https://api.vachana.ai/stt/v3';
export const GNANI_TTS = 'https://api.vachana.ai/api/v1/tts/inference';
export const TEST_UTTERANCE = 'नमस्ते। यह सुनो सही का एक परीक्षण है।';
const MAX_TEST_AUDIO = 2 * 1024 * 1024;

function safeResult(stage, code, httpStatus = null) {
  return { ok: false, stage, code, httpStatus };
}
function httpCode(status) {
  if (status === 401 || status === 403) return 'authentication_rejected';
  if (status === 429) return 'rate_limited';
  if (status === 400 || status === 415) return 'invalid_request';
  if (status === 503) return 'service_unavailable';
  return 'provider_http_error';
}
function timeoutSignal(ms) { return AbortSignal.timeout(ms); }
function audioLooksWav(bytes) {
  return bytes.length >= 44 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WAVE';
}
function sanitizeFailure(e, stage) {
  if (e?.name === 'TimeoutError' || e?.name === 'AbortError') return safeResult(stage, 'timeout');
  // Network errors contain system details. Do not serialize them into reports or logs.
  return safeResult(stage, 'network_unreachable');
}
function dataBytes(bytes) {
  return new Blob([bytes], { type: 'audio/wav' });
}

/**
 * @param {{apiKey: string, fetchImpl?:typeof fetch, timeoutMs?:number, utterance?:string}} args
 */
export async function verifyGnaniLive({ apiKey, fetchImpl = fetch, timeoutMs = 25000, utterance = TEST_UTTERANCE } = {}) {
  if (typeof apiKey !== 'string' || !apiKey.trim()) return safeResult('configuration', 'missing_api_key');
  const requestHeaders = { 'X-API-Key-ID': apiKey.trim() };
  const report = { ok: false, sample: 'synthetic_hindi_tts_to_stt', tts: null, stt: null,
    accuracyClaim: 'none; not a human-recorded benchmark' };
  const ttsRequest = {
    text: utterance, voice: 'Nalini', model: 'timbre-v2.5', language: 'hi-IN', speed: 1.0,
    audio_config: { sample_rate: 16000, num_channels: 1, sample_width: 2, encoding: 'linear_pcm', container: 'wav' }
  };
  let audio;
  const t0 = performance.now();
  try {
    const resp = await fetchImpl(GNANI_TTS, {
      method: 'POST', headers: { ...requestHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(ttsRequest), signal: timeoutSignal(timeoutMs), redirect: 'error'
    });
    if (!resp.ok) return { ...report, ...safeResult('tts', httpCode(resp.status), resp.status) };
    const len = Number(resp.headers.get('content-length') || 0);
    if (len > MAX_TEST_AUDIO) return { ...report, ...safeResult('tts', 'response_too_large') };
    const ct = (resp.headers.get('content-type') || '').toLowerCase();
    if (!ct.includes('audio/wav') && !ct.includes('audio/x-wav') && !ct.includes('application/octet-stream')) {
      return { ...report, ...safeResult('tts', 'unexpected_audio_type') };
    }
    audio = Buffer.from(await resp.arrayBuffer());
    if (audio.length > MAX_TEST_AUDIO || !audioLooksWav(audio)) return { ...report, ...safeResult('tts', 'invalid_wav') };
    report.tts = { ok: true, latencyMs: Math.round(performance.now() - t0), bytes: audio.length, model: 'timbre-v2.5' };
  } catch (e) { return { ...report, ...sanitizeFailure(e, 'tts') }; }

  const form = new FormData();
  form.append('audio_file', dataBytes(audio), 'synthetic-gnani-smoke.wav');
  form.append('language_code', 'hi-IN');
  form.append('preferred_language', 'hi-IN');
  form.append('format', 'transcribe');
  form.append('itn_native_numerals', 'false');
  const t1 = performance.now();
  try {
    const resp = await fetchImpl(GNANI_STT, {
      method: 'POST', headers: requestHeaders, body: form,
      signal: timeoutSignal(timeoutMs), redirect: 'error'
    });
    if (!resp.ok) return { ...report, ...safeResult('stt', httpCode(resp.status), resp.status) };
    const result = await resp.json();
    if (result?.success !== true || typeof result.transcript !== 'string')
      return { ...report, ...safeResult('stt', 'unexpected_response') };
    report.stt = {
      ok: true, latencyMs: Math.round(performance.now() - t1), language: 'hi-IN',
      transcript: result.transcript.slice(0, 300),
      requestId: typeof result.request_id === 'string' ? result.request_id.slice(0, 100) : null
    };
    return { ...report, ok: true, stage: 'complete' };
  } catch (e) { return { ...report, ...sanitizeFailure(e, 'stt') }; }
}
