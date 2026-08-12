# Open Forecast Receipt

[![CI](https://github.com/TheFutureEdge/open-forecast-receipt/actions/workflows/ci.yml/badge.svg)](https://github.com/TheFutureEdge/open-forecast-receipt/actions/workflows/ci.yml)

Open Forecast Receipt (OFR) is an open standard and verification toolkit for portable, tamper-evident forecast records. The first reference profile covers individual AI-generated market forecasts from iPulse AI and a compact Ethereum Attestation Service projection for Base.

## Current phase: Firestore-backed iPulse AI public Library

The project now operates as a Firestore-backed, openly browsable Library of five already-public iPulse AI Batch 6 assets: PepsiCo, NVIDIA, Bitcoin, Alphabet Class C, and SPY. Outside public-submission requests are reviewed manually through `support@ipulseai.com`; there are no customer accounts, payments, private storage, or automated public uploads.

The dedicated staging environment is live at
[`https://oflapp-staging.web.app`](https://oflapp-staging.web.app) on project
`oflapp-staging` with Firestore Standard in `us-central1`. The production GCP
boundary `oflapp-prod` exists as an empty, unbilled project: Firebase, Firestore,
data, and deployment are not enabled there. Neither environment is shared with
an iPulse/PAPP Firebase project.

Local UI development reads the real staging Firestore with the anonymous,
read-only Firebase Web SDK. Put the public Firebase Web configuration in
`.env.staging.local`, then run:

```bash
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173/showcase` or the fast integrity test at
`http://127.0.0.1:5173/test`.

The staging Firestore Library contains all 60 sanitized receipts after the
controlled initial import:
12 individual forecaster receipts for each of the five assets. These forecasters
are the AI advisor personas used inside iPulse AI. The running UI reads each
receipt and projection on demand from Firestore. The JSON files in
`src/data/fixtures/` are test/import inputs, not runtime storage.

- One individual forecast is one OFR JSON document.
- One individual forecast is one EAS attestation UID.
- The 12 receipts for one asset may travel in one EAS `multiAttest` transaction without becoming one batch entity.
- Batch 6 is a clearly labeled retrospective pilot on Base Sepolia.
- Future eligible receipts are intended to be issued asynchronously after iPulse AI's immutable public publication gate.

The initial declared onchain showcase contains six receipts: one
researcher-mode receipt for the same advisor persona across all five public
assets, plus the PepsiCo thinker-mode companion. The rule is based only on
asset, persona, and mode--not forecast direction, rating, magnitude, accuracy,
or observed performance. One `multiAttest` transaction will still create six
independent EAS UIDs.

No EAS schema or forecast attestation has been issued from this directory yet. The examples remain planned, unissued test vectors until a Base Sepolia round-trip succeeds.

## Project layout

- `schema/` - canonical versioned OFR JSON Schema.
- `examples/ipulse/` - canonical public-safe iPulse AI receipt and compact onchain projection examples.
- `src/` - Native Builder-origin React application, deterministic verifier, Firestore Library client, explorer, and test fixtures.
- `public/` - static application assets.
- `docs/` - current design, hackathon scope, and submission material.
- `native-builder/` - the original Product Architect prompt, Native project
  provenance, and the reviewed upload/AMx/QA handoff prompts.
- `scripts/` - deterministic fixture generation, controlled Firestore import,
  Base Sepolia preflight and issuance tooling, and the disposable Native
  upload-folder builder.
- `research/` - reproducible cost, capacity, provenance, SQL, notebook, and generated-report evidence.

The original Product Architect prompt and provenance record document how the
Native project began. The public GitHub repository is the source of truth. The
Native GitHub integration is intentionally not used because its live sync flow
requires organization-wide repository access. A whitelisted, disposable Code
folder is generated with `npm run native:prepare-upload`, uploaded to the same
Native project, and then rechecked by Native Builder and QA.

## Canonical starting points

- Phase 1 decision: `docs/PHASE_1_HACKATHON_START.md`
- JSON Schema: `schema/open_forecast_receipt_v0_1.schema.json`
- Full receipt example: `examples/ipulse/pepsi_batch6_ray_open_forecast_receipt_v0_1.json`
- Compact EAS example: `examples/ipulse/pepsi_batch6_ray_onchain_projection_v0_1.json`
- Native prompt: `native-builder/native_builder_product_architect_prompt.txt`
- Subject identity and ticker changes: `docs/SUBJECT_IDENTITY_AND_TICKER_CHANGES.md`
- Product purpose and exact iPulse integration: `docs/PURPOSE_AND_IPULSE_INTEGRATION.md`
- Open Forecast Registry product direction: `docs/OPEN_FORECAST_REGISTRY_PRODUCT_DIRECTION.md`
- Open Forecast Receipt v0.2 requirements: `docs/OPEN_FORECAST_RECEIPT_V0_2_REQUIREMENTS.md`
- Active low-cost showcase architecture: `docs/IPULSE_SHOWCASE_ARCHITECTURE_V0_1.md`
- Complete Firestore Library architecture: `docs/OPEN_FORECAST_LIBRARY_ARCHITECTURE_V0_1.md`
- Controlled internal publication bundle: `docs/OFL_PUBLICATION_BUNDLE_V0_1.md`
- Six-receipt Base Sepolia runbook: `docs/BASE_SEPOLIA_SHOWCASE_RUNBOOK.md`
- Native AMx finishing prompt: `native-builder/NATIVE_UPLOAD_AMX_FINISH_PROMPT.md`

## Local verification

```bash
npm test
npm run build
npm audit --omit=dev
npm run eas:preflight
```

`npm run fixtures:phase1` is intentionally a controlled maintainer operation: it
expects compact curated source files outside the repository and never reads raw
model requests, raw model responses, hidden chain-of-thought, credentials, or
production signing material.

## Repository status

This directory is the dedicated engineering home for the initiative. It was moved from the marketing reports workspace on 2026-08-06. Superseded drafts, duplicate Finder copies, the obsolete pre-OFR Pepsi example, and a failed render screenshot were removed during the move.

The project includes an MIT license. Publication, GitHub synchronization, blockchain issuance, and integration into iPulse AI require their own reviewed steps.

## Hackathon implementation provenance

The application source in `src/` originated from Native Builder project
`9b5dc37e-f409-4f5e-9206-b20d752313a5`. Local changes are used for review,
deterministic testing, fixture preparation, and corrective patches. Material
application changes must be uploaded back to Native Builder and pass its QA flow
before the final Native-hosted submission. See
`docs/NATIVE_BUILDER_PROVENANCE_AND_SYNC.md`.
