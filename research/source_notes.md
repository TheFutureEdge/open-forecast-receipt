# Source and calculation notes

## Production Firestore inspection

Read-only inspection was performed on August 5, 2026 against project `ipulse-401013` using the existing authenticated Google Cloud session. No credential or secret was copied into this report.

- Catalog collection: `papp_oracle_fincore_prediction_market__catalogs.eod_close_price_predictions`
- PepsiCo asset document: `equity_ea8243e7-75bd-549b-9ba6-48e03cf982c1`
- Latest pointed publication: `equity_ea8243e7-75bd-549b-9ba6-48e03cf982c1__sb6__r2`
- Publication collection: `papp_oracle_fincore_prediction_market__datasets.eod_close_price_batch_predictions`
- Decoded compact publication size: 465,738 bytes
- Individual advisor forecasts: 12
- Individual source forecast JSON: 29,696 to 41,845 bytes; total 429,585 bytes
- Individual numerical forecast points: 20 quarterly step-over-step returns per advisor; 240 points total

The consensus is a derived arithmetic mean of the 12 advisors' cumulative paths. It is useful as a product summary but is not the underlying authored forecast entity. The revised onchain entity is one `prediction_request_task_id` within one asset and scoring batch.

## Exact individual example

The public-safe example in `../examples/ipulse/pepsi_batch6_ray_open_forecast_receipt_v0_1.json` is the Batch 6 Ray Dalio / The Strategist / RESEARCHER forecast. Its source fields include:

- `prediction_request_task_id`
- `advisor_snapshot`
- `forecast_horizon_anchor_value`
- `forecast_horizon_anchor_value_timestamp_utc`
- `investment_rating_by_model`
- `timeseries_numerical[*].forecast_step`
- `timeseries_numerical[*].forecast_timestamp_utc`
- `timeseries_numerical[*].predicted_step_over_step_change_percent`

The 20 raw step returns are the forecast. They are multiplied by 100 to integer basis points and stored in forecast-step order. The proof viewer compounds them from the anchor price using `next value = current value * (1 + step return / 10,000)`.

The `forecastKey` is SHA-256 over the exact prediction request task ID. The `forecastDigest` is SHA-256 over the canonical, recursively key-sorted JSON representation of the complete decoded individual prediction object. A production implementation should use an explicitly versioned RFC 8785 JSON Canonicalization Scheme implementation and retain the canonical object for verification.

## Historic schema check

PepsiCo Batch 1 revision 2 was also inspected. It contains 12 individual predictions with the same core fields used by Individual Forecast Receipt V1. Its first advisor uses 20 actual three-month points even though an unrelated derived-consensus formula snapshot elsewhere in the publication contains a legacy `6m` label. The individual receipt adapter must validate each actual forecast step and timestamp rather than infer cadence from an unrelated aggregate configuration.

## Application and access-policy sources

The current forecast surfaces were reviewed in:

- `code/ipulse_ui_next/src/components/asset-research/ForecastHistoryDocument.tsx`
- `code/ipulse_ui_next/src/components/asset-research/AiOpinionsDocument.tsx`
- `code/ipulse_ui_next/src/lib/assetResearch/aiOpinionsPageModel.ts`
- `code/ipulse_ui_next/src/lib/assetResearch/accessPolicy.ts`
- `code/ipulse_ui_next/src/utils/predictionTimeseries.ts`
- `code/AGENTS.md`

The AI Forecasts document explicitly presents the publication as multiple independent advisor reports and compounds step-over-step returns to build each price path. PepsiCo is currently a public-showcase asset. Many other assets are paid or registered-only, so publishing their forecast bytes on a public blockchain would bypass the access boundary.

## Lifecycle placement

The official public switch occurs only after parsing, C2 immutable publication, D1 scoring, C5 consensus publication, SEO/GEO readiness verification, and catalog sync. Because blockchain writes cannot be removed, the receipt worker should consume the exact Catalog V2 entry only after it is `live` and eligible for public onchain disclosure. It is an asynchronous non-blocking post-publication step.

C5's controlled enrichment does not modify individual forecast paths, ratings, returns, targets, timestamps, or research text. The individual `forecastDigest` is therefore independent of the derived consensus and remains stable across additive aggregate enrichment.

## Encoding and annual-subsampling calculations

Final Phase 1 EAS schema:

`string subjectRef,uint32 runNumber,uint16 runRevision,bytes32 forecastId,bytes32 forecasterId,string forecasterLabel,uint64 forecastCreatedAt,uint64 anchorAt,uint64 anchorValueMicros,string target,string anchorUnit,string classification,bool retrospective,uint8 cadenceMonths,uint8 pointCount,string stepReturnBps,bytes32 receiptDigest`

For Ray Dalio:

- 17 ABI head slots: 544 bytes
- `ticker:PEP@XNAS`: 64-byte dynamic tail
- forecaster label: 96-byte dynamic tail
- canonical target name: 96-byte dynamic tail
- `USD`: 64-byte tail
- `partially_sell`: 64-byte tail
- 80-character quarterly step-return string: 128-byte tail
- total EAS data: 1,056 bytes before the attestation transaction envelope

Replacing all 20 raw quarterly steps with five annual cumulative checkpoints reduces only the last tail from 128 to 64 bytes, producing 992 bytes. The saving is 64 bytes, or 6.1% of the full-quarterly receipt.

Across the exact 12 PepsiCo advisors, quarterly receipt data totals 12,768 bytes and annual-only data totals 12,000 bytes. Annual subsampling saves 768 bytes, or 6.0%, while discarding 15 original forecast points per advisor. Full quarterly steps are therefore recommended.

## Five-dollar per-batch budget model

Two recent Base mainnet EAS transactions in `base_cost_observations.json` cost about 0.0087 USD and 0.0386 USD including the receipt's reported L1 fee. Their EAS data sizes were 736 and 256 bytes. Linear extrapolation of their gas usage gives a conservative direct-attestation planning estimate of about 1,043,865 gas for the representative 1,056-byte individual forecast receipt. This is a planning model, not a substitute for `estimateGas`.

For the first observed transaction—the one inspected in Blockscout during this analysis—the 736-byte EAS payload produced 1,060 bytes of submitted calldata, 776,045 gas used, two receipt logs, and about 2,772 bytes when the full RPC receipt object was serialized as JSON. The RPC/explorer response size is not extra blockchain payload and is not separately billed; the gas already accounts for execution, storage, and events.

Applying the conservative gas fit to the exact mix of PepsiCo's 12 payload sizes produces 12,606,726 planning gas per selected asset before `multiAttest` savings. Therefore, before the exact L1 fee:

- five assets: about 0.71 USD at 0.006 gwei, 1.18 USD at 0.010 gwei, or 2.36 USD at 0.020 gwei.

The five-asset execution-only threshold is about 0.03595 gwei before L1 fee, or 0.03269 gwei after a 10% buffer and before L1 fee. These are planning thresholds, not quotes.

The hard budget policy reserves 0.75 USD and permits at most 4.25 USD of quoted issuance. Exact all-in cost is calculated before every asset transaction as `estimated L2 gas * max fee per gas + GasPriceOracle.getL1Fee(serialized transaction)`, converted with a buffered ETH/USD price. One EAS `multiAttest` transaction carries every individual forecast for one asset and returns a separate UID for each.

Hackathon Phase 1 is locked to five current public showcase assets and no random selection. This creates 60 independent UIDs in five asset-level `multiAttest` transactions. If the complete five-asset cohort does not fit below 4.25 USD, wait for a cheaper fee window rather than substitute a favorable subset. Never publish only favorable advisors within an asset.

The 5 USD cap is an incremental blockchain-fee budget. One-time schema registration, existing Firestore/RPC infrastructure, and engineering time are outside the per-batch chain budget. Exact transaction receipts, including L1 fee, are accumulated after each asset and the worker stops before the next asset can breach the cap.

## Transaction batching and Base capacity update

The final entity/transport split is:

- one individual advisor forecast = one EAS attestation and one UID;
- all 12 attestations for one asset-batch = one native EAS `multiAttest` transport transaction;
- one batch hash is never substituted for the 12 forecast records.

The exact final PepsiCo payloads total 12,768 bytes. A single same-schema `multiAttest` call encodes to 16,036 bytes of calldata, compared with 16,656 bytes across 12 separate `attest` calls. The 620-byte reduction is only 3.7%; all forecast data, storage writes, and events remain. The stronger benefit is eliminating 11 intrinsic transaction charges, signed envelopes, broadcasts, confirmations, and nonce/retry surfaces while retaining 12 direct proof links.

Base currently enforces a 16,777,216 gas maximum per transaction. EIP-7623's data-heavy floor implies theoretical calldata-only ceilings of 418,905 all-nonzero bytes or 1,675,621 all-zero bytes after the 21,000 intrinsic charge. These are not usable EAS capacities because execution, storage, events, and ABI structure also consume gas. The conservative PepsiCo planning model is 12,606,726 gas for the 12 records; a 20% buffer is about 15.13 million, below the Base cap. Production still uses `eth_estimateGas`; if the buffered estimate does not fit, split the asset deterministically into 6 + 6.

Official sources:

- Base transaction gas cap and recommended estimation buffer: https://docs.base.org/base-chain/network-information/troubleshooting-transactions
- Base L2 plus L1 fees and `GasPriceOracle.getL1Fee`: https://docs.base.org/base-chain/network-information/network-fees
- OP Stack Isthmus inclusion of EIP-7623: https://specs.optimism.io/protocol/isthmus/overview.html
- EIP-7623 calldata floor: https://eips.ethereum.org/EIPS/eip-7623

## Standards research update

The proposed name is **Open Forecast Receipt (OFR)**. A broad core plus profiles is preferable to an AI-only market schema:

1. OFR Core covers any forecast and its issuer, subject, target, temporal semantics, representation, provenance, integrity, disclosure, and extensions.
2. OFR Market adds instrument identifiers, anchor/return semantics, observation policy, cadence, and corporate-action policy.
3. OFR AI Provenance optionally adds model/provider/version, knowledge cutoff, agent identity/mode, input snapshot, prompt/configuration hashes, tool flags, pipeline version, and human review.
4. The EAS market-path projection remains compact and market-specific.

Established standards reused by OFR include JSON Schema 2020-12, RFC 8785 canonicalization, W3C PROV concepts, an optional W3C Verifiable Credentials 2.0 envelope, Hubverse modeling-task/output vocabulary, OpenFIGI, ISO 10383 MICs, ISO currency codes, CAIP chain/asset identifiers, and EAS ABI schemas.

Hubverse normalizes what was forecast. Its task-ID columns describe the modeling task—commonly target, reference/origin date, horizon, subject/location, and conditions. Its output representation uses `output_type`, `output_type_id`, and `value` for means, medians, quantiles, CDFs, PMFs, or samples. iPulse AI should preserve the native 20-step dependent path and offer a Hubverse-aligned export rather than replacing production Firestore documents with flat rows.

Official sources:

- Hubverse model outputs: https://docs.hubverse.io/en/latest/user-guide/model-output.html
- Hubverse joint sample/path semantics: https://docs.hubverse.io/en/latest/user-guide/sample-output-type.html
- Hubverse schemas: https://github.com/hubverse-org/schemas
- JSON Schema 2020-12: https://json-schema.org/draft/2020-12
- RFC 8785: https://www.ietf.org/rfc/rfc8785.html
- W3C PROV-O: https://www.w3.org/TR/prov-o/
- W3C Verifiable Credentials 2.0: https://www.w3.org/TR/vc-data-model-2.0/
- OpenFIGI: https://www.openfigi.com/api/documentation
- ISO 10383 MIC registry: https://www.iso20022.org/market-identifier-codes
- EAS SDK: https://github.com/ethereum-attestation-service/eas-sdk

## Hackathon research update

The AI Factory event requires a functional, publicly deployed application built primarily with native.builder, a clear problem and target user, a written explanation of native.builder usage, a video no longer than three minutes showing at least one complete end-to-end workflow, the native.builder project/application URL, and a list of external APIs/datasets/tools. Projects primarily built outside native.builder, inaccessible to judges, or without a working demonstration are ineligible.

The logged-in page returned `You already enrolled to this event!`; no separate idea-acceptance pitch was found. The remaining administrative steps are completing the participant profile, creating or joining a team even if solo, and completing the final submission.

Native.builder should generate the actual React application, screens, workflows, integrations, preview, and deployment. Codex supplies the product brief, OFR specification, sanitized fixture, EAS projection, hash/test vectors, deterministic selection and budget logic, QA, documentation, demo script, and later production integration. This boundary satisfies the event rule that the app be primarily built in native.builder.

Official sources:

- Event and submission requirements: https://lablab.ai/ai-hackathons/nativebuilder-build-without-limits
- lablab guide: https://lablab.ai/guide
- native.builder getting started: https://docs-builder.nativelyai.com/introduction/getting-started
- native.builder integrations: https://docs-builder.nativelyai.com/features/integrations
- native.builder Supabase: https://docs-builder.nativelyai.com/features/supabase
- native.builder GitHub sync: https://docs-builder.nativelyai.com/features/github-sync
- native.builder publishing: https://docs-builder.nativelyai.com/features/publish

## Claim boundary

An EAS attestation proves the attester, embedded bytes, and onchain time and makes later alteration detectable. It does not prove forecast accuracy, model quality, source truth, or that a historic backfill existed onchain at its original generation time. The UI must distinguish anchor, batch-generation, publication, and attestation times.
