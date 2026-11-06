# SunoSahi AI — Independent QA, 6 November 2026

## Verified locally in this environment

- `npm run preflight` — PASS; no Gnani-format credential, PEM key, or `.env` file detected in staged source. This is a regex-based preflight, not a comprehensive security audit.
- `npm run check` — PASS on Node.js 22 (all Node/JS syntax checks).
- `npm test` — **56/56 PASS**. Includes 8 WAV/security regression cases introduced November 6 (misstated RIFF length, forged PCM byte rate, malformed alignment, truncated audio chunks, hostile Origin, backend source exclusion).
- `npm run build` — PASS, generates static Vercel `public/` directory and uses `/api/*` serverless wrappers.
- `python scripts/browser-e2e.py` — PASS in a simulated 390px mobile Chromium document: conflict, corrections, acknowledgements, receipt and SHA digest, edit invalidation, Voice Studio, Failure Lab, no JS exceptions and no horizontal overflow. This does not navigate a deployed URL, because the current browser environment blocks arbitrary navigation.
- Official documentation reconfirmed `POST /stt/v3`, `X-API-Key-ID`, `preferred_language` field and supported 16kHz PCM WAV for `timbre-v2.5`. Updated server adapter and mock contract checks.

## NOT VERIFIED / MUST NOT BE CLAIMED

- GitHub push or a created SunoSahi repository — currently unavailable.
- Vercel deployment/HTTPS URL — Vercel plugin not connected at last check.
- Hosted real Gnani STT/TTS response, key validity, accuracy, latency, credits usage — outbound connectivity not available in this runtime.
- Physical Android mic recording or real human audio transcription benchmark.
- Authenticated private worker storage, multi-tenant controls, user consent audit, legal identity verification and legally binding signatures.
- Production-grade cross-instance rate limiting (the existing in-memory limiter is per-instance).
- Social demo post, Microsoft Forms submission or competition selection — not completed.

## Credential handling

The credential pasted in chat is exposed and must be revoked/replaced; no secret was inserted into the source package, frontend, GitHub, or generated documentation. To test live models, set the replacement only in hosting secrets `GNANI_API_KEY`. Use an independent `DEMO_ACCESS_TOKEN` to gate paid API routes; this passphrase should not appear in frontend source or screenshots.
