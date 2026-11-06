> **November 5, 2026 update:** Vercel serverless wrappers and a static build were added. These are local-test verified; there is no Vercel deployment or live Gnani result yet. See [DEPLOYMENT.md](DEPLOYMENT.md).

# SunoSahi AI — Premium Voice Agreement Verification Prototype

**A working synthetic agreement application with a wired, server-only Gnani Prisma STT / Timbre TTS gateway.** Premium pearl-white metallic UI. No real data or API results are faked. Local tests do not establish Gnani recognition accuracy.

## Features

- Premium responsive interface, mobile horizontal navigation, reduced-motion support.
- Independent worker and employer term fields; three synthetic scenarios (critical conflict, match, missing value).
- Exact integer-paise arithmetic, invalid/missing/conflict gate, manual review, revision-bound separate confirmations, and audit timeline.
- SHA-256 demonstrative receipt export + print; offline fallback when WebCrypto is unavailable.
- Voice Studio: consent-first local microphone recording (30s), local playback and transcription to Gnani via secure backend **only when live mode is enabled and reviewer explicitly requests it**. Manual typed transcript fallback always available.
- Conservative Hindi/Hinglish number/field extraction from transcripts; every extracted term remains a reviewable draft.
- Node.js native HTTP gateway with `X-API-Key-ID` held server-side; STT endpoint `/stt/v3`, TTS endpoint `/api/v1/tts/inference`, 60-second audio check, 4MB WAV limit, 500-char TTS limit, 25s timeout, per-IP rate cap, restrictive static file serving and same-origin checks. API key is never in source/client or sent back to a browser.
- **56** automated unit/contract/security tests plus a Chromium-powered mobile browser interaction smoke test. The Gnani contract is tested against a mocked upstream, not live model output.

## Run on a laptop/server (Node.js >=20)

```bash
npm test
npm run check
npm start
```

Open **http://localhost:4173**. This serves a fully interactive no-key synthetic demo. No npm packages are required. The local smoke test does not require an API key, but real calls need a networked server.

## Secure live Gnani configuration

**Do not use or copy the key previously shared in chat; revoke it first.** Obtain a new key from [Gnani API Keys](https://app.gnani.ai/voice/api-keys) and store it ONLY in the web host's secret/environment settings:

- `GNANI_API_KEY` = NEW Gnani API key (never shipped to client).
- `ENABLE_LIVE_GNANI` = `1` to explicitly enable billing-enabled calls; default off.
- `DEMO_ACCESS_TOKEN` = strong separate random passphrase for authorised reviewers (NOT the Gnani key).
- `PORT` = hosting port (optional; default 4173).

Never commit `.env` or share the new key in chat. The application uses a passphrase before any paid/live Gnani call. Use HTTPS for browser microphone access. Never log or return credentials. **Real live calls must still be verified from deployed runtime**; this environment has no outbound DNS access to api.vachana.ai.

### Real API contract

- Prisma STT: `POST https://api.vachana.ai/stt/v3`, auth header `X-API-Key-ID`, multipart `audio_file`, `language_code`, `format=transcribe`, `preferred_language`; expected response `{"success":true,"transcript":"..."}`.
- Timbre TTS: `POST https://api.vachana.ai/api/v1/tts/inference`, auth header `X-API-Key-ID`, JSON `text`, `model=timbre-v2.5`, `voice=Nalini`, `language`, `audio_config` WAV. Contract follows publicly available Gnani docs. Confirm actual content type/voice availability at deployment.

## Live verification runner (available when deployed; not yet executed against Gnani)

A safe two-request smoke test is included at `scripts/verify-gnani-live.mjs`. It uses a **synthetic Hindi phrase** and makes one real Timbre TTS request followed by one Prisma STT request using the produced WAV audio. It checks authentication, request/response contracts, and per-stage latency. It intentionally does **not** claim ASR WER/CER or human speech accuracy and never writes the API key to disk or reports.

After connecting a networked backend and configuring a **rotated, private** `GNANI_API_KEY` secret:

```bash
npm run verify:live
```

Results contain only stage, status/error code, latency, synthetic transcript, and an optional provider request ID. A `network_unreachable` result indicates that the hosting server cannot contact the provider. `authentication_rejected` indicates a rejected API credential; it does not print the credential. The test consumes real API credits if successful. Do not run repeatedly without a reason.

**Android browser diagnostic:** After HTTPS deployment, open **Voice Studio**, enter the independent `DEMO_ACCESS_TOKEN` passphrase (never the Gnani key), and press **Check live Gnani connection (2 API calls)**. This calls the server-only `/api/gnani/selftest` endpoint; it is limited to two runs per hour/IP. It reports TTS+STT status/latency for synthetic audio only. It does NOT measure real mobile microphone speech accuracy.

**In this ChatGPT build runtime, external DNS resolution for `api.vachana.ai` failed. Therefore the key shared in chat was not tested, authenticated, saved, or installed on any live host.** A public website and real end-to-end inference remain pending.

## Deployment

Docker: `docker build -t sunosahi . && docker run -p 4173:4173 sunosahi` (synthetic mode by default). `render.yaml` is included as a starting point for a Node web service. Add secrets in the hosting dashboard, not in code. The app is not presently hosted; the earlier Lovable project is a separate, incomplete application whose workspace exhausted credits.

## Quality gates and limitations

Run `npm test` for deterministic logic + backend mock contract. Tests do NOT measure live Prisma accuracy, Timbre voices, ASR WER/CER, mobile device microphones, actual cloud deployment/availability, encryption-at-rest, user authentication, or payroll product superiority. All guest agreement data and recordings stay in browser memory; the server does not persist audio or transcripts, but a live request sends consented audio to Gnani. This prototype does not validate parties' real identities or create a binding contract.

**Submission instructions and checklist:** See `SUBMISSION_GUIDE.md`.

## Optional local mobile-browser QA (no Gnani calls)

The repo includes `scripts/browser-e2e.py`, which exercises the actual JavaScript UI in Chromium using a self-contained in-memory page (no localhost navigation and no API keys). It covers mismatched wages and days, field resolution, separate acknowledgements, SHA-256 receipt creation, revocation after edits, Voice Studio, the Failure Lab and mobile-width overflow. To run it on a developer machine:

```bash
python -m pip install playwright
python -m playwright install chromium
python scripts/browser-e2e.py
```

This does **not** validate the Vercel deployed website or a real user's microphone. See `QA_STATUS.md` for the exact verified state.
