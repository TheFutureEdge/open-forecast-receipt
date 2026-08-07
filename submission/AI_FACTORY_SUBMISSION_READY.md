# AI Factory submission status

Updated: 2026-08-08

## Live assets

- Team: `Open Forecast Receipt`
- Team page: https://lablab.ai/ai-hackathons/nativebuilder-build-without-limits/open-forecast-receipt
- Submission form: https://lablab.ai/ai-hackathons/nativebuilder-build-without-limits/open-forecast-receipt/submission
- Public application: https://open-forecast-receipt.web.app
- Native.builder project: https://builder.nativelyai.com/projects/9b5dc37e-f409-4f5e-9206-b20d752313a5
- Native.builder published URL: https://974omuaj1qsimbwwudlgqfbtx.nativelyai.app (currently returns a platform-level 404 despite two successful publish confirmations)
- Public source: https://github.com/TheFutureEdge/open-forecast-receipt
- Deadline shown in the logged-in event: 2026-08-10 19:00 GST

## Form requirements confirmed

Step 1 of the current lablab form requires:

- video presentation: MP4, required;
- slide presentation: PDF, required;
- cover image: optional, 16:9 recommended.

The official event additionally requires:

- a functional deployed application built primarily with native.builder;
- a clear problem statement and target user;
- an explanation of how native.builder was used;
- a demonstration video of no more than three minutes;
- at least one complete end-to-end workflow in the video;
- the native.builder project/application URL;
- a publicly accessible application URL;
- a list of external APIs, datasets, and tools.

## Submission copy

### Title

Open Forecast Receipt Explorer

### One-line description

An open standard and verifier that turns AI forecasts into readable, tamper-evident receipts with optional independent Base attestations.

### Problem

Historical forecasts are easy to edit, summarize, or evaluate after the fact, but users rarely receive a portable record of exactly what was predicted, when it was produced, which information boundary applied, and whether the historical payload has changed.

### Target users

Investors, researchers, forecasting platforms, model evaluators, journalists, auditors, and product teams that need to inspect and independently verify historical forecasts.

### Solution

Open Forecast Receipt separates an immutable, standards-based `receiptPayload` from a mutable `proofEnvelope`. The working explorer exposes 60 sanitized individual AI-advisor forecasts across five public assets, reconstructs every 20-step forecast path, verifies RFC 8785/SHA-256 payload integrity, and demonstrates that changing one step causes verification to fail. Six receipts are declared for a retrospective Base Sepolia showcase, but the interface reports them as unissued until real proofs verify.

The receipt is also the foundation for a future Open Forecast Library: a
cross-domain service where human and machine forecasters can submit portable
forecasts, search subjects and forecasters, optionally purchase a public proof,
and build maturity-aware track records. The hackathon delivers the standard,
Explorer, verifier, and operator-side testnet issuance tooling; public accounts,
payments, and the managed relayer wallet are the next product layer.

### How native.builder was used

native.builder's Product Architect produced the PRD and architecture. Builder and QA agents generated and iterated the React application, manifest, individual receipt ledger, verifier, tamper workflow, standards page, and public preview. The source was then reconciled manually in native.builder's Code workspace after credits were exhausted. The native.builder project remains the provenance record; a separately hosted public URL is supplied because its generated hosting subdomain currently returns a platform-level 404.

### External tools and data

- Ethereum Attestation Service schema and Base Sepolia contract interfaces;
- RFC 8785 JSON Canonicalization Scheme and SHA-256;
- `viem`, AJV, React, Vite, and Vitest;
- Lucide's MIT-licensed icon library for deck category icons;
- sanitized public-safe iPulse AI Batch 6 fixtures for PepsiCo, NVIDIA, Bitcoin, Alphabet Class C, and SPY;
- Firebase Hosting for the accessible fallback deployment;
- native.builder for product architecture, application generation, iteration, preview, and publishing.

## Final video

- MP4: `submission/open-forecast-receipt-ai-factory-demo-v4.mp4`
- Duration: 44.00 seconds
- Format: 1920 x 1080 H.264 with AAC stereo audio
- Includes: three uninterrupted supplied Veo films, followed immediately by a
  ten-second generated product demonstration of the manifest, PepsiCo ledger,
  individual receipt, and `Integrity: PASS` to `Integrity: FAIL` workflow.
- No titles, text overlays, or product screenshots interrupt the supplied films.
- The blue product-title interstitial and separate manual recording were removed.
- The closing card starts only after narration and product action finish and
  remains visible for four seconds.
- The repeated Gemini corner symbol was removed with a consistent 16:9 crop.
- The second and third supplied films are in their intended narrative order.
- Every supplied film retains its complete original ten-second moving picture
  and matching audio; no source film is frozen, retimed, or interrupted.
- Provenance and QA: `submission/video-build/exports/FINAL_VIDEO_V4_PROVENANCE.md`

## Remaining gate

Upload `submission/open-forecast-receipt-ai-factory-demo-v4.mp4` to Step 1 and
replace the saved-draft deck with the revised seven-slide
`submission/open-forecast-receipt-ai-factory-deck.pdf`. Then complete Steps 2
and 3, review every field, and submit.
