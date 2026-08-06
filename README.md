# Open Forecast Receipt

[![CI](https://github.com/TheFutureEdge/open-forecast-receipt/actions/workflows/ci.yml/badge.svg)](https://github.com/TheFutureEdge/open-forecast-receipt/actions/workflows/ci.yml)

Open Forecast Receipt (OFR) is an open standard and verification toolkit for portable, tamper-evident forecast records. The first reference profile covers individual AI-generated market forecasts from iPulse AI and a compact Ethereum Attestation Service projection for Base.

## Current phase

The AI Factory hackathon pilot is deliberately limited to five already-public Batch 6 assets: PepsiCo, NVIDIA, Bitcoin, Alphabet Class C, and SPY.

The local reference application currently contains all 60 sanitized receipts:
12 individual advisor forecasts for each of the five assets. Each receipt and
projection is loaded on demand so the full fixture set does not inflate the
initial application bundle.

- One individual advisor forecast is one OFR JSON document.
- One individual advisor forecast is one EAS attestation UID.
- The 12 receipts for one asset may travel in one EAS `multiAttest` transaction without becoming one batch entity.
- Batch 6 is a clearly labeled retrospective pilot on Base Sepolia.
- Future eligible receipts are intended to be issued asynchronously after iPulse AI's immutable public publication gate.

No EAS schema or forecast attestation has been issued from this directory yet. The examples remain planned, unissued test vectors until a Base Sepolia round-trip succeeds.

## Project layout

- `schema/` - canonical versioned OFR JSON Schema.
- `examples/ipulse/` - canonical public-safe iPulse AI receipt and compact onchain projection examples.
- `src/` - Native Builder-origin React application, deterministic verifier, explorer, and test fixtures.
- `public/` - static application assets.
- `docs/` - current design, hackathon scope, and submission material.
- `native-builder/` - the original Product Architect prompt, Native project
  provenance, and the current GitHub synchronization prompt.
- `scripts/` - deterministic fixture generation from compact, curated source exports.
- `research/` - reproducible cost, capacity, provenance, SQL, notebook, and generated-report evidence.

The original Product Architect prompt and provenance record document how the
Native project began. Old upload bundles and generated ZIP handoffs remain local
and untracked. Native Builder should synchronize from the public GitHub
repository, which is the current source of truth.

## Canonical starting points

- Phase 1 decision: `docs/PHASE_1_HACKATHON_START.md`
- JSON Schema: `schema/open_forecast_receipt_v0_1.schema.json`
- Full receipt example: `examples/ipulse/pepsi_batch6_ray_open_forecast_receipt_v0_1.json`
- Compact EAS example: `examples/ipulse/pepsi_batch6_ray_onchain_projection_v0_1.json`
- Native prompt: `native-builder/native_builder_product_architect_prompt.txt`
- Native GitHub synchronization prompt: `native-builder/NATIVE_GITHUB_SYNC_PROMPT_V03.md`
- Subject identity and ticker changes: `docs/SUBJECT_IDENTITY_AND_TICKER_CHANGES.md`

## Local verification

```bash
npm test
npm run build
npm audit
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
application changes must be synchronized back to Native Builder and pass its QA
flow before the final Native-hosted submission. See
`docs/NATIVE_BUILDER_PROVENANCE_AND_SYNC.md`.
