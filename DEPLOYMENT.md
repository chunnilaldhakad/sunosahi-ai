# SunoSahi AI — GitHub → Vercel deploy (mobile)

## Status

This is **locally validated, deployment-prepared source**, not proof of a deployed website or real Gnani voice recognition. The application runs on Node.js for local use and has Vercel serverless endpoint wrappers plus static `public/` build assets.

## Secure deployment

1. Create a **new empty GitHub repository** named `sunosahi-ai`, public only after verifying no secrets. Never overwrite unrelated projects. Push this folder, excluding `.env`, `qa/`, `public/`, and local logs.
2. In Vercel, import that repository. `vercel.json` selects **Other**, executes `npm run build`, serves the generated `public/` directory, and deploys `/api/status`, `/api/gnani/{stt,tts,selftest}` serverless handlers.
3. Set environment variables under Vercel → Project → Settings → Environment Variables (Production and Preview as appropriate):
   - `GNANI_API_KEY`: a **fresh, rotated** key (the previous chat-exposed key should not be reused).
   - `ENABLE_LIVE_GNANI`: `1`.
   - `DEMO_ACCESS_TOKEN`: independent strong secret; do not reuse a Gnani key.
4. Redeploy. Open `https://<your-deployment>.vercel.app/api/status` and verify `liveAvailable` true; this does not validate the Gnani provider.
5. On HTTPS Android site open Voice Studio → enter private demo access code → click `Check live Gnani connection`. Two real Gnani API calls run. Check results, provider acceptance, and latency. Avoid putting real wages or personal data in a contest demo.
6. Record several consented synthetic Hindi/Hinglish spoken phrases. Check STT transcription and numerical correctness before claiming effectiveness.

## Production caveats

- Stateless Vercel serverless instances do not provide reliable **global** in-memory rate limits; private access token is mandatory, but deploy a shared external rate limiter before inviting unrestricted public users to make paid calls.
- This is a competition demo without authenticated private record storage or verified participant identity. Do not enter real private financial information.
- Test results are from mocks and deterministic logic. Real Gnani STT/TTS integration remains unverified until live calls succeed.
- Public social demo video and Microsoft Forms submission must be completed only after deployment and truthful live verification.

## Commands for a source checkout

```bash
npm run preflight
npm run check
npm test
npm run build
npm start
```

Requires Node 20+; no third-party npm dependencies.

## Competition form and nominated social demo

Exact user-provided form: https://forms.cloud.microsoft/pages/responsepage.aspx?id=2OcffmZAkUasdAANYYVwjQGaBzel_ZVOv4Z5BmzbI1xUQUVGMTcyOVlSWlJKWUFNRE5ZVzM3OUQ4OC4u&utm_source=brevo&utm_medium=email&utm_campaign=Internship+Registration+Confirmation&route=shorturl

**Do not submit until** the HTTPS site actually runs live Gnani inference, a public LinkedIn/X demo showing it is posted, and the form's required fields are checked. The GitHub repository URL and hosted URL are *not yet available*.

## Verified blocker as of 6 November 2026

GitHub's connected repository actions can create commits/files in existing repositories but do not expose a `create_repository` action. The intended `chunnilaldhakad/sunosahi-ai` repository currently returns 404; create it empty at https://github.com/new from mobile and then request a push to that exact URL. Vercel's ChatGPT connector is not yet connected; connect it in ChatGPT before expecting automated Vercel project import or deployment. Do not reuse unrelated existing repos without explicit permission. The previously shared Gnani key is chat-exposed: rotate before adding a replacement through Vercel's secure environment settings.
