# Open Forecast Receipt v0.2 requirements

Date: 2026-08-07
Status: requirements for the next version; v0.1.0 remains immutable

## Purpose

Version 0.2 should generalize Open Forecast Receipt beyond AI-generated market
price paths without breaking the published v0.1 receipts, digests, examples, or
attestations. The standard remains an immutable forecast record. Public
submission, payments, wallets, search, and moderation belong to the future Open
Forecast Registry, not the receipt schema.

## Compatibility and migration

- Keep `ofr-core-v0.1.0`, its `$id`, fixtures, canonicalization rules, and digest
  test vectors frozen.
- Publish v0.2 under a new immutable schema URL and semantic version.
- Never rewrite a v0.1 payload to make it look like v0.2. Convert it into a new
  receipt with explicit derivation or correction lineage.
- Continue to separate `receiptPayload` from `proofEnvelope`. Proof metadata may
  be added without changing the sealed forecast digest.
- Provide deterministic v0.1-to-v0.2 mapping documentation and conformance tests.

## Canonical vocabulary

- Public ecosystem noun: `forecast`, not `prediction`.
- Actor: `forecaster`, not `advisor` or `predictor`.
- Resolvable object: `target`, not `forecastTarget`.
- `prediction` may remain a nested technical field during migration, but v0.2
  should evaluate whether `forecast.output` is the clearer generalized name.

Entity flow:

`Domain -> Subject -> Target -> Forecaster -> Forecast -> Receipt -> Proof -> Evaluation`

## Core receipt payload

The sealed payload must include:

### Receipt identity and lineage

- stable receipt ID and specification version;
- issuer ID and issuer namespace;
- creation time and issuance mode;
- prior receipt reference for correction, withdrawal, supersession, or
  derivation;
- correction taxonomy and human-readable reason;
- payload component digests where a source snapshot is too large to disclose.

### Domain and subject

- domain ID and optional profile version;
- issuer-stable subject ID independent of ticker, slug, or display name;
- subject type, display name, aliases, and point-in-time identifiers;
- optional authoritative identifier URIs;
- ticker, MIC, ISIN, team code, location code, or other domain identifiers as
  snapshots, never as permanent identity.

### Target

- stable target ID;
- target kind: binary, categorical, scalar, date, interval, distribution,
  ranking, count, or time series;
- plain-language question or quantity;
- unit and scaling convention;
- forecast horizon and valid times;
- resolution rule, authoritative resolution source, tolerance, missing-data
  policy, and timezone or calendar where relevant.

### Forecaster

- stable forecaster ID;
- type enum: `human`, `ai_model`, `algorithm`, `ensemble`, `hybrid`, or
  `organization`;
- display name and issuer-scoped identity source;
- version and methodology reference;
- optional members and weights for ensembles;
- type-specific metadata in versioned profiles, not mandatory AI-only core
  fields.

### Forecast output

- output kind aligned with the target kind;
- one of probability, category, scalar, date, interval, distribution, ranking,
  count, or time-series path;
- explicit numeric unit, scale, precision, rounding rule, and missing-value
  semantics;
- uncertainty or confidence representation when supplied;
- structured rationale, claims, citations, and scores where disclosed;
- no hidden chain-of-thought requirement.

For market percentage returns:

- the human-readable value should be a decimal percentage, such as `-4.00`,
  with `unit: "percent"`;
- a fractional alternative such as `-0.04` is valid only with
  `unit: "decimal_fraction"`;
- compact onchain encodings may use signed integer basis points, where `-400`
  means `-4.00%`, but the field name and schema must explicitly say `Bps`;
- explorer and registry interfaces must convert basis points before display.

## Temporal map

Do not collapse distinct times. Support, when applicable:

- model knowledge cutoff and cutoff precision;
- model adaptation or fine-tuning cutoff;
- evidence publication time;
- evidence retrieval time;
- evidence supplied-to-forecaster time;
- market or world-state cutoff;
- input snapshot time;
- request submitted time;
- queue start and completion;
- inference start and completion;
- scoring or aggregation time;
- receipt creation time;
- public release time;
- proof or blockchain inclusion time;
- target maturity time;
- outcome resolution and evaluation time.

Missing or reconstructed times must carry `known`, `unknown`, `not_applicable`,
or `reconstructed` status and a source.

## AI and tool provenance profile

AI-specific provenance belongs in a versioned optional profile:

- provider, model family, API identifier, release date, and model version;
- knowledge cutoff, precision, source, and registry metadata version;
- whether web search was configured, enabled, requested, actually executed, or
  unknown;
- retrieval policy, evidence URI/title, content digest, publication time,
  retrieval time, and supplied time;
- prompt template and resolved prompt digests;
- tool, framework, output-schema, scoring, and code versions;
- inference parameters and run identifiers;
- exact input snapshot and component digests at generation time.

Do not reconstruct these fields from a later model registry lookup without
labeling them as later enrichment.

## Context and evidence

- Replace required market-only `marketState` and `webSearch` objects with a
  domain-neutral context envelope plus optional profiles.
- Preserve exact disclosed evidence digests and timing.
- Permit private or licensed evidence to remain undisclosed while committing a
  digest, media type, byte length, and access policy.
- Keep evidence used, evidence retrieved, and evidence merely available
  distinct.

## Proof envelope

- Keep the proof envelope outside the sealed payload to avoid recursive hashing.
- Support multiple independent proofs: issuer signature, trusted timestamp,
  content-addressed storage, EAS attestation, or another blockchain method.
- Each proof records type, network or authority, identifier, issuer/attester,
  creation time, verification method, and status.
- Payment reference, wallet balance, private key, card data, or customer account
  credit must never appear in a public receipt.
- Proofs establish integrity, attribution, and/or publication timing according to
  their method. They do not establish truth, accuracy, or sound reasoning.

## Corrections and withdrawal

- Corrections are append-only new receipts referencing the original receipt ID
  and digest.
- Required reasons include clerical correction, data-source correction,
  methodology correction, identity correction, withdrawal, and supersession.
- Original receipts and proofs remain discoverable.
- A corrected receipt must not inherit a proof it did not receive.

## Outcome and evaluation

- Forecast failure, execution failure, data failure, and unforeseeable shock are
  separate concepts.
- Outcome and evaluation records are append-only and reference the receipt.
- Evaluation states include not mature, awaiting source, resolved, disputed,
  evaluated, and superseded.
- Score only after the target horizon matures and the resolution rule can be
  applied.
- Record outcome source, retrieval time, digest, evaluator, scoring rule, score,
  and dispute status.

## Registry and toolkit boundary

The Toolkit may expose an issuer adapter that accepts a caller-provided signer.
It must not persist keys or collect fees. The Registry will own:

- authenticated submitters and issuer policy;
- payments and account credits;
- a secure managed relayer wallet or optional bring-your-own-wallet flow;
- proof queues, retries, reconciliation, and cost controls;
- storage, indexes, search, moderation, and public profiles.

## Acceptance criteria

- v0.1 fixtures and digest vectors still pass unchanged.
- v0.2 validates at least one example for each forecaster type and output family.
- all numeric values have explicit units, scale, and precision.
- all public UI examples display percentages rather than raw basis-point values.
- vague predictions cannot validate without a target, horizon, and resolution
  rule.
- corrections and evaluations are append-only and independently verifiable.
- no core field is mandatory only because the forecaster is an AI system or the
  subject is a market asset.
- proof verification can be performed without trusting the Registry UI.
