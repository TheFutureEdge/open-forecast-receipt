# AI Factory Phase 1 start brief

Date: 2026-08-05  
Status: scope locked and ready for native.builder Product Architect  
Product: iPulse AI  
Hackathon project: Open Forecast Receipt Explorer

## Locked decision

Phase 1 is the complete hackathon scope:

- exactly five existing public assets: PepsiCo, NVIDIA, Bitcoin, Alphabet Class C, and SPY;
- Batch 6 is the inaugural historic pilot for all five assets;
- one individual advisor forecast becomes one Open Forecast Receipt JSON and one EAS attestation UID;
- the 12 UIDs for one asset travel in one native EAS `multiAttest` transaction;
- all 20 original quarterly step changes are retained;
- Base Sepolia is used for the hackathon; no production key, Firestore write, or Base mainnet write is part of the demo;
- no random assets, seven-asset expansion, 15-asset expansion, consensus receipt, or leaderboard receipt is in Phase 1.

The open-source product is not merely an iPulse AI page. It is a reusable receipt toolkit: JSON Schema, examples, deterministic validation/canonicalization/hashing, market-path reconstruction, EAS encoding/decoding, proof verification, and a public explorer. The iPulse adapter is the first reference implementation.

## Why Batch 6, not Batch 1

PepsiCo Batch 1 revision 2 was generated on 2025-11-28 and its corrected public snapshot was frozen on 2026-07-29. Attesting it on 2026-08-05 would place the chain timestamp more than eight months after forecast generation and would make the inaugural demo harder to explain.

PepsiCo Batch 6 revision 2 was generated on 2026-07-05, anchored to 2026-07-02, and its corrected public snapshot was frozen on 2026-07-29. It is still a later attestation, but it is recent, uses the current publication shape, and is the cleanest bridge into the live workflow.

The Batch 6 receipt therefore says `issuanceMode: retrospective`. The UI must display three different concepts without blending them:

1. `forecastCreatedAt`: when the advisor forecast was generated;
2. `sourcePublication.publishedAt`: when the immutable public revision was frozen;
3. EAS `blockTimestamp`: when that already-existing receipt was anchored to the chain.

The chain proves that the exact receipt existed no later than its block time. It does not retroactively prove that the receipt was onchain at forecast creation. Beginning with the next eligible public batch, receipts should use `issuanceMode: contemporaneous` and be submitted asynchronously after the public-live gate, normally within minutes or hours. Forecast publication must never wait for blockchain confirmation.

## PepsiCo percentage and basis-point meaning

The production field is:

`predictions[*].timeseries_numerical[*].predicted_step_over_step_change_percent`

For the Ray Dalio / Strategist / RESEARCHER forecast, the first two source values are exactly `-4` and `-3`. They mean **-4.00%** and **-3.00%**. The compact receipt converts percentage points to integer basis points:

`basis_points = source_percent * 100`

Therefore `-400` means **-4.00%**, not -0.40%; `-300` means -3.00%; and `200` means +2.00%.

## Canonical URLs

Use separate stable namespaces for separate jobs:

- machine-readable JSON Schema `$id`: `https://ipulseai.com/schemas/open-forecast-receipt/v0.1.0/schema.json`;
- human specification and research: `https://ipulseai.com/research/open-forecast-receipt/`;
- interactive verifier: `https://ipulseai.com/tools/open-forecast-receipt/`.

The `$id` belongs under `/schemas/`, not `/tools/` or `/research/`, because it is a versioned machine contract. The other two URLs can change presentation while the v0.1.0 schema remains immutable.

## Correct target semantics

The forecasted values are changes, not USD price levels. The reviewed receipt therefore uses:

```json
{
  "name": "eod_close_price_step_over_step_percentage_change",
  "quantity": "return",
  "unit": "basis_point",
  "transformation": "step_over_step_percentage_change",
  "baseQuantity": "eod_close_price",
  "baseUnit": "USD"
}
```

The exact iPulse source target name remains in provenance as `eod_close_price_pct_change`. This gives the standard a precise canonical meaning without losing the original field vocabulary.

## Full OFR versus compact onchain fields

The full OFR JSON is the portable, editable standards record. Its major field groups are:

- `$schema`, `specVersion`, and `profiles`;
- receipt identity, status, issuance mode, and creation/correction lineage;
- issuer identity and optional chain attester;
- forecast ID, run number, and publication revision;
- subject identity and identifier bundle such as iPulse ID, ticker, MIC, FIGI, or CAIP identifier;
- target, transformation, output and base units, and observation definition;
- forecast creation, anchor, horizon, cadence, and point count;
- anchor observation;
- ordered prediction points;
- optional classification;
- forecaster, model, role/mode, and model provenance;
- methodology, input/config/schema identifiers, and review state;
- source publication and individual-source-forecast digests plus explicit adapter mapping;
- RFC 8785/SHA-256 receipt integrity;
- visibility, license, disclaimer, limitations, proofs, and extensions.

The reviewed PepsiCo/Ray example contains Batch 6 revision 2, PEP at XNAS, a USD 144.22 anchor on 2026-07-02, 20 three-month changes through 2031-07-02, `partially_sell`, Gemini 3.1 Pro provenance, the immutable publication digest, and the individual source-forecast digest. Its current full receipt digest is:

`ce5e747edf89a34e92710e4306bb9a89224714130b68c4be0b49aad7486e13c9`

The compact EAS projection intentionally stores only 17 fields:

1. `subjectRef`
2. `runNumber`
3. `runRevision`
4. `forecastId`
5. `forecasterId`
6. `forecasterLabel`
7. `forecastCreatedAt`
8. `anchorAt`
9. `anchorValueMicros`
10. `target`
11. `anchorUnit`
12. `classification`
13. `retrospective`
14. `cadenceMonths`
15. `pointCount`
16. `stepReturnBps`
17. `receiptDigest`

EAS supplies the schema UID, attestation UID, attester, recipient, block time, transaction hash, revocation state, expiry, reference UID, and raw encoded bytes. These protocol fields are not duplicated inside the payload.

With the reviewed 17-field projection, Ray's EAS data is 1,056 bytes. All 12 PepsiCo payloads total 12,768 bytes; one complete same-schema `multiAttest` call is 16,036 calldata bytes. Twelve separate `attest` calls total 16,656 bytes. Batching saves only 620 calldata bytes; its larger benefit is one signature/broadcast/confirmation per asset while preserving 12 independent UIDs.

## Five-dollar Phase 1 policy

The deliberately conservative planning model extrapolates the final 12 PepsiCo payload sizes through two observed Base EAS transactions and assumes 12 separate attestations, so it does not claim unmeasured batching savings. It estimates 12,606,726 gas per representative asset; a 20% buffer is 15,128,072, below Base's 16,777,216 per-transaction cap but close enough that exact Base Sepolia estimation is mandatory.

For five assets, the planning execution cost is about $0.71 at 0.006 gwei, $1.18 at 0.010 gwei, and $2.36 at 0.020 gwei, before exact L1 fees. Reserve $4.25 of the $5 budget for issuance and $0.75 for retry, fee/FX variance, RPC, registry, and monitoring. Quote every final serialized transaction with `eth_estimateGas` and Base's L1 fee oracle. If all five do not fit, wait; do not select a more favorable subset.

## Lifecycle insertion

```text
advisor forecasts generated
  -> existing parser/validation/storage
  -> immutable asset-batch publication revision
  -> existing scoring/derived consensus
  -> readiness + catalog + public-live gate
  -> deterministic five-asset eligibility check
  -> one forecast at a time: iPulse adapter -> OFR JSON Schema validation
  -> RFC 8785 canonicalization -> SHA-256 digest
  -> one asset at a time: encode 12 EAS records -> exact cost/gas preflight
  -> submit one multiAttest -> receive 12 UIDs
  -> read back/decode/compare every UID
  -> write one proof-registry record per forecast
  -> Forecast History adds Blockchain proofs status and direct receipt links
```

The production adapter should read the governed dimension-asset identifier bundle. Any missing MIC, FIGI, currency, or CAIP value belongs in a versioned, reviewed override table with source, as-of date, and reviewer—not an unexplained hard-coded mapping.

## Native.builder and Codex boundary

Native.builder must build the functional hackathon application: application structure, React UI, workflows, receipt explorer, verifier experience, EAS read integration, tamper sandbox, live preview, and deployment. This is required because the event rejects applications built primarily outside native.builder.

Codex supplies and reviews the open standard, schema, sanitized fixtures, deterministic algorithms, digest vectors, EAS contract, tests, security and data review, demo/submission copy, and the later iPulse production adapter/outbox/proof-registry/UI integration. Native.builder can generate most of the app; Codex should not secretly replace it with an externally built application.

## Exact start sequence

Start now, using the attached upload bundle.

1. In the native.builder account carrying the promotional Builder plan, create a new project.
2. Keep the default Product Architect stage selected.
3. Upload the `native-builder/native_builder_upload_bundle_v01` folder into the project's Docs area, or upload its six files together. The ZIP is a transport copy; use the extracted files so Product Architect can inspect them directly.
4. Paste `native-builder/native_builder_product_architect_prompt.txt` exactly.
5. Let Product Architect return the PRD, architecture, file plan, and credit-aware build sequence. Do not ask it to build unrelated features.
6. Bring that Product Architect output back to Codex for a fast scope/technical review before the first large Builder run; this protects the limited credit pool.
7. Switch to Builder and implement the PepsiCo vertical slice first. Then load the other four Batch 6 fixture sets without changing the core schema.

The user needs to initiate the project under the logged-in native.builder account. Codex has already written the prompt; no new product wording is required from the user. If the logged-in Native session is made available and the user explicitly asks Codex to operate it, Codex can assist with the UI, but final public publishing and hackathon submission still require explicit approval.

## Phase 1 acceptance gate

- five public assets appear in the manifest;
- PepsiCo is the complete first vertical slice with 12 forecasts and 12 UID routes;
- each untouched fixture passes JSON Schema and digest verification;
- `-400` is rendered as `-4.00%` everywhere;
- the 20-step path reconstructs to approximately USD 180.6052 for the Ray example;
- one locally changed step produces verification failure;
- every proof page distinguishes forecast creation, source publication, and chain attestation time;
- integrity is never described as accuracy;
- Base Sepolia is clearly labeled;
- no wallet or authentication is required for judges;
- source is synchronized to a public MIT-compliant repository;
- the deployed URL works without login and the complete demo fits under three minutes.
