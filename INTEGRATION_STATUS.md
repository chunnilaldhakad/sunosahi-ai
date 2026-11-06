# SunoSahi Gnani Integration Status — 5 November 2026

## Built and checked

- **Prisma STT**: `POST https://api.vachana.ai/stt/v3`, multipart `audio_file` and `language_code`, auth header `X-API-Key-ID` (server-side only), `format=transcribe` for number normalization.
- **Timbre TTS**: `POST https://api.vachana.ai/api/v1/tts/inference`, model `timbre-v2.5`, voice `Nalini`, Hindi voice, 24kHz 16-bit mono WAV output.
- Consent-first microphone recording -> WAV conversion -> backend transcription -> field-by-field review. A voice transcript is never treated as proof or automatic acceptance.
- Private access code is **separate from the Gnani API key**. No keys are stored in frontend, source, archives or test logs.
- Protected `/api/gnani/selftest` makes one synthetic TTS -> STT round-trip from a networked backend. Limited to 2 runs/hour/IP; consumes real API credits.
- `npm run verify:live` provides a server-only smoke runner and redacted diagnostic result.

## Verification results

- Local unit and mocked API-contract tests: **44 passed / 0 failed**.
- Node.js syntax checks: **passed**.
- Local HTTP: homepage 200; status 200; no-key voice call 503; private config 404.
- Official API contract compared with https://docs.gnani.ai/api/STT/speech-to-text and https://docs.gnani.ai/api/TTS/tts-inference .
- **Live Gnani API authentication/inference: NOT verified.** This execution environment cannot resolve `api.vachana.ai` DNS. The key pasted in ChatGPT was not transmitted, stored or installed. No live TTS/STT success or speech accuracy is claimed.
- HTTPS website deployment: **not completed**. Existing Lovable development workspace exhausted credits.

## Next action for a mobile user

Connect a supported deployment service (Render was suggested in ChatGPT) and deploy the Node.js project in this archive. Configure `GNANI_API_KEY`, `ENABLE_LIVE_GNANI=1`, and a random unrelated `DEMO_ACCESS_TOKEN` as **server secrets**. Rotate the chat-shared key before deploying. Open the HTTPS site on Android, visit Voice Studio, enter the separate access code, and run the two-call selftest. For a real accuracy report, additionally test consented phone-recorded clips with labeled transcripts and compare number/amount errors; the synthetic TTS-to-STT test is NOT a human speech benchmark.

## Gnani challenge

Official enrollment email confirmed registration, allocated credits and a submission form. Contest submission deadline: **10 November 2026**. A valid final submission needs a genuinely working Gnani integration and public LinkedIn/X demonstration. This local mock-tested app is not yet a finished submission.
