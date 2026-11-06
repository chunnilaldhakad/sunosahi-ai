import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyGnaniLive, GNANI_STT, GNANI_TTS } from '../src/gnani-live-smoke.js';
const audio = (() => { const b = Buffer.alloc(100); b.write('RIFF', 0); b.write('WAVE', 8); return b; })();

test('live smoke test refuses to run without server API key', async () => {
  const r = await verifyGnaniLive({ apiKey: '' });
  assert.equal(r.ok, false);
  assert.equal(r.code, 'missing_api_key');
});

test('mocked Gnani two-call smoke verifies auth header but never returns it', async () => {
  const calls = [];
  const fakeFetch = async (url, opts) => {
    calls.push({ url, opts });
    if (url === GNANI_TTS) return new Response(audio, { headers: {'Content-Type': 'audio/wav'} });
    return Response.json({ success: true, transcript: 'नमस्ते यह एक परीक्षण है', request_id: 'req-smoke-1' });
  };
  const report = await verifyGnaniLive({ apiKey: 'test-key-not-real', fetchImpl: fakeFetch });
  assert.equal(report.ok, true);
  assert.equal(report.accuracyClaim.startsWith('none;'), true);
  assert.equal(report.stt.requestId, 'req-smoke-1');
  assert.equal(calls.length, 2);
  assert.deepEqual(calls.map(c => c.url), [GNANI_TTS, GNANI_STT]);
  for (const c of calls) assert.equal(c.opts.headers['X-API-Key-ID'], 'test-key-not-real');
  const body = JSON.parse(calls[0].opts.body);
  assert.equal(body.model, 'timbre-v2.5');
  assert.equal(body.voice, 'Nalini');
  assert.equal(calls[1].opts.body.get('format'), 'transcribe');
  assert.doesNotMatch(JSON.stringify(report), /test-key-not-real/);
});

test('401 from Gnani is reported as authentication failure without leaking credentials', async () => {
  const r = await verifyGnaniLive({ apiKey: 'mock-sensitive-value', fetchImpl: async () => new Response('invalid', {status: 401}) });
  assert.equal(r.ok, false);
  assert.equal(r.code, 'authentication_rejected');
  assert.equal(r.httpStatus, 401);
  assert.doesNotMatch(JSON.stringify(r), /mock-sensitive-value/);
});

test('network DNS error is redacted in diagnostic report', async () => {
  const r = await verifyGnaniLive({ apiKey: 'mock-sensitive-value', fetchImpl: async () => {throw new Error('getaddrinfo secret mock-sensitive-value api.vachana.ai');} });
  assert.equal(r.ok, false);
  assert.equal(r.code, 'network_unreachable');
  assert.doesNotMatch(JSON.stringify(r), /mock-sensitive-value/);
});

test('malformed audio cannot be passed to STT', async () => {
  const urls = [];
  const r = await verifyGnaniLive({ apiKey: 'mock-only', fetchImpl: async (url) => {
    urls.push(url);
    return new Response('not wav', {headers:{'content-type':'audio/wav'}});
  } });
  assert.equal(r.ok, false);
  assert.equal(r.code, 'invalid_wav');
  assert.deepEqual(urls, [GNANI_TTS]);
});
