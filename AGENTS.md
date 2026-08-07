# Open Forecast Receipt agent guide

This project is the engineering and open-source home for the Open Forecast Receipt standard, verifier, Native hackathon application, and future iPulse AI adapter.

## Canonical artifacts

- Treat `schema/open_forecast_receipt_v0_1.schema.json` as the canonical v0.1.0 machine contract.
- Treat `examples/ipulse/` as the canonical source for the reviewed PepsiCo receipt and EAS projection.
- Treat `docs/PHASE_1_HACKATHON_START.md` as the current Phase 1 scope authority.
- Treat old Native upload bundles and ZIP synchronization archives as local
  historical transport artifacts. They are ignored and are never canonical.
- Treat the schema and examples in the repository root as canonical. Native
  Builder receives a fresh, reviewed Code-folder upload generated from this
  repository; stale downloads and Native-side copies are never canonical.

## Safety and scope

- Keep public fixtures sanitized and independently reviewable. Never add credentials, private forecasts, paid-only asset data, service-account material, or production signing keys.
- Use Base Sepolia for hackathon issuance. Do not write to Base mainnet or production Firestore without explicit approval.
- One individual advisor forecast must remain one receipt and one attestation UID. `multiAttest` is transport batching, not forecast aggregation.
- Distinguish forecast integrity from forecast accuracy and retrospective issuance from contemporaneous issuance in code and UI.
- Preserve RFC 8785 canonicalization and SHA-256 digest test vectors exactly. Any post-issuance semantic change requires an explicit version or correction lineage, never a silent edit.
- Use the correct public product name `iPulse AI` and the positioning `Open Agentic Investment Research Platform` when product context is needed.

## Working rules

- Keep reusable verification logic deterministic and free of AI-model dependencies.
- Keep the OFR Core general; put market and AI-specific fields in versioned profiles or adapters.
- Verify JSON Schema, digests, EAS encoding/decoding, path reconstruction, tamper failure, and fee/gas preflight before calling a release ready.
- Treat the downloaded Native Builder application as the hackathon implementation origin. Local work may audit, test, and prepare corrections, but every material application change must be uploaded back into the same Native project, rechecked by Native QA, and reflected in the final Native-hosted application. Do not grant the Native GitHub App organization-wide repository access merely to transport code; use the reviewed upload-folder workflow in `docs/NATIVE_BUILDER_PROVENANCE_AND_SYNC.md`.
- Do not commit, push, publish, deploy, register an EAS schema, or issue attestations without the user's explicit approval for that action.
