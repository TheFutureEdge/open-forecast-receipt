# Open Forecast Receipt

[![CI](https://github.com/TheFutureEdge/open-forecast-receipt/actions/workflows/ci.yml/badge.svg)](https://github.com/TheFutureEdge/open-forecast-receipt/actions/workflows/ci.yml)

Open Forecast Receipt (OFR) is an open standard and verification toolkit for portable, tamper-evident forecast records. The first reference profile covers individual AI-generated market forecasts from iPulse AI and a compact Ethereum Attestation Service projection for Base.

## Current phase: Firestore-backed iPulse AI public Library

The project now operates as a Firestore-backed, openly browsable Library of the complete public iPulse AI Batch 6 cohort: 376 governed forecast subjects and 4,511 individual forecast receipts. Batch 6 is the historical starting boundary; no earlier iPulse AI predictions are stored. Outside public-submission requests are reviewed manually through `support@ipulseai.com`; there are no customer accounts, payments, private storage, or automated public uploads.

The dedicated SSR staging environment is live at
[`https://ofl-staging--oflapp-staging.us-central1.hosted.app`](https://ofl-staging--oflapp-staging.us-central1.hosted.app) on project
`oflapp-staging` with Firestore Standard in `us-central1`. On 2026-09-08,
`oflapp-prod` was upgraded to Blaze and received the production App Hosting
application, complete Batch 6, rules, catalogs and resolvers. Its 60 pilot
receipts were preserved unchanged. The canonical production domain is
[`forecastlibrary.com`](https://forecastlibrary.com).
Neither environment is shared with an iPulse/PAPP Firebase project.
See `docs/FORECAST_LIBRARY_LAUNCH_AUDIT_2026-09-08.md` for current
evidence and `docs/FORECAST_LIBRARY_FIRESTORE_STRUCTURE.md` for the storage map.

The application now uses the Next.js 16 App Router on Node.js 22 or newer.
Initial public page content is server-rendered from its environment's Firestore through
the focused Google Cloud Firestore client and Application Default Credentials.
Public directories and ledgers use bounded materialized catalogs; full receipts
are fetched only by digest. The browser SDK is limited to point reads and
two-part ledger pagination. Put the public
Firebase Web configuration in `.env.staging.local`, authenticate ADC locally,
then run:

```bash
npm run dev -- --hostname 127.0.0.1 --port 4178
```

Open `http://127.0.0.1:4178/entities` or the fast integrity test at
`http://127.0.0.1:4178/integrity-test`.

The staging Firestore Library contains 4,511 public Batch 6 receipts across 376
active forecast subjects. Each listed-security ledger reads its newest two
bounded catalog parts, while individual receipt pages point-read the relevant
sealed receipt and compact projection. The JSON files in `src/data/fixtures/`
are test/import inputs, not runtime storage.

- One individual forecast is one OFR JSON document.
- One individual forecast is one EAS attestation UID.
- The 12 receipts for one asset may travel in one EAS `multiAttest` transaction without becoming one batch entity.
- Batch 6 receipts are retrospective. Issued proofs identify their actual network; Base mainnet and Base Sepolia testnet are never interchangeable.
- iPulse AI ingestion starts at Batch 6. Pre-Batch-6 predictions are intentionally excluded; only Batch 6 and later public publications are eligible for OFL.
- Future eligible receipts are intended to be issued asynchronously after iPulse AI's immutable public publication gate.

The current Showcase issuance plan includes all 60 original Batch 6 receipts
for PepsiCo, NVIDIA, Alphabet, Bitcoin, and SPY: all 12 advisor forecasts per
asset in one `multiAttest` transaction, for five asset submissions and 60
independent EAS UIDs. Selection does not depend on forecast outcomes. See the
[full execution runbook](docs/BATCH6_SHOWCASE_PROOF_EXECUTION.md).

As of 10 September 2026, the plans are unsigned and no proofs are issued.
Network selection and wallet signing remain outstanding. The older six-receipt
Sepolia fixtures and runbook are historical demonstration inputs, not the
current full-cohort issuance plan.

## Project layout

- `schema/` - canonical versioned OFR JSON Schema.
- `examples/ipulse/` - canonical public-safe iPulse AI receipt and compact onchain projection examples.
- `app/` - Next.js App Router, server-rendered routes, metadata, robots, and sitemap.
- `src/` - Native Builder-origin React components, deterministic verifier, typed Firestore repositories, explorer, and test fixtures.
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
- Current 60-receipt execution plan: `docs/BATCH6_SHOWCASE_PROOF_EXECUTION.md`
- Complete Firestore Library architecture: `docs/OPEN_FORECAST_LIBRARY_ARCHITECTURE_V0_1.md`
- Controlled internal publication bundle: `docs/OFL_PUBLICATION_BUNDLE_V0_1.md`
- Six-receipt Base Sepolia runbook: `docs/BASE_SEPOLIA_SHOWCASE_RUNBOOK.md`
- Native AMx finishing prompt: `native-builder/NATIVE_UPLOAD_AMX_FINISH_PROMPT.md`

## Local verification

```bash
npm test
npm run build:staging
npm run readiness:check
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
