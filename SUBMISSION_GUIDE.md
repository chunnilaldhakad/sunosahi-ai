# SunoSahi AI — Gnani Internship Challenge submission checklist

This checklist comes from the registrant's Gnani AI **enrolment email dated 5 November 2026**, corroborated with https://www.gnani.ai/internship and https://www.gnani.ai/great-indian-ai-internship-registration-form . **The app must not be claimed to have made real Gnani calls until a new secret is securely installed and at least one real response is verified.**

## Official submission essentials

1. Deadline: **10 November 2026, 11:59 PM IST**, no extensions.
2. Create a **working app** that genuinely uses at least one Gnani AI model/API. The challenge covers the API platform, not Gnani Agent Builder.
3. Produce a real working demo/video, preferably 60 seconds explaining an actual conflict caught by SunoSahi.
4. Post your video publicly on LinkedIn and/or X. Tag Gnani AI's official account and use BOTH **#GnaniAI** and **#GreatIndianAIInternshipChallenge**.
5. Open your personal Gnani registration email titled **"You're enrolled for The Great Indian AI Internship Challenge"** and select **"Project Submission Form"**. The form is already open; there is no participant workspace.
6. Enter project title, problem, users, Gnani models/APIs used, individual contribution, demo/video, written explanation and **one nominated post URL per platform used**.
7. Submit before closing. Engagement only counts up to the closing cutoff; genuine reactions, comments and reshares influence the internship shortlist. Artificial engagement, bots, paid promotions, plagiarism or misleading demonstrations can disqualify entries.
8. Shortlisted participants take independent interviews, then selected interns receive written offers. A project award is separate from internship selection.

## Suggested form content (edit to reflect REAL tested features)

**Title:** SunoSahi AI — Two-Party Voice Agreement Verification for Indian Workers

**Problem:** Spoken wage agreements can be misheard or recalled differently, especially when amounts are code-mixed Hindi/English or recorded in noise. Mistakes such as 15 vs 50 workdays or ₹650 vs ₹560 can silently enter wage records, worsening disputes.

**Target users:** Workers, small contractors, grassroots support groups and wage-record administrators.

**How SunoSahi works:** Each party independently records or enters their terms. Prisma is the intended STT component; conservative field extraction drafts amounts and days, and a deterministic comparison gate flags missing or conflicting values. Both sides review the same terms and must each acknowledge the current revision before a non-legal, self-declared receipt is produced. Timbre is the intended spoken readback. Inputs remain synthetic in the competition demo. No identity authentication or legal verification claims.

**Model field:** After live integration is tested, list only the models you actually used, e.g. "Gnani Prisma speech-to-text (hi-IN)" and "Gnani Timbre text-to-speech (hi-IN)". Until verified, say "integration implemented but live inference pending" and do NOT submit as if it worked.

**Engineering details:** JavaScript/Node.js app, server-side Gnani gateway, strict input validation, explicit recording consent, per-IP rate limiting, no key in the client, integer-paise wage arithmetic, revision-bound independent confirmations, SHA-256 receipt fingerprints. Unit and contract tests are for local logic; actual speech model WER/CER is not measured until live testing.

**Contribution:** Describe what you personally designed/implemented/tested. Disclose reuse of the previous prototype and AI-assisted development accurately.

## 60-second honest demo plan

- 0–8s: Hook. Worker says 15 days at ₹650/day; employer says 50 days at ₹560/day.
- 8–20s: **Real** Gnani Prisma transcription on consented synthetic voice recordings (must actually work).
- 20–36s: Side-by-side numeric disagreement flagged. Correction and review shown.
- 36–47s: Independent confirmations; after editing a term, previous confirmation expires.
- 47–55s: **Real** Timbre readback and non-legal receipt.
- 55–60s: Live site, project URL, technologies, call-to-action.

**Don't show fabricated model calls or 99%+ accuracy statistics.** If live integration is not ready, don't label the synthetic simulation as Gnani output.

## Current blockers before final submission

- A NEW secret must be created in https://app.gnani.ai/voice/api-keys because the original was pasted into chat and treated as exposed.
- Real Gnani STT/TTS calls and real microphone processing still require deployment to an HTTPS server that can access external endpoints.
- This package contains working demo, server adapters, automated unit/contract tests and a mobile visual QA, **not** a publicly deployed production service.
- Android offline preview is for reviewing visual/design/logic, not for demonstrating Gnani integration.

Official contact: internshipscontest@gnani.ai, and Gnani builders' Discord linked in the enrollment email.
