# Open Forecast Library product direction

Date: 2026-08-12
Status: active public-Library direction; multi-tenant features deferred

The active low-cost, Future Edge-operated Firestore Library is specified in
[`IPULSE_SHOWCASE_ARCHITECTURE_V0_1.md`](./IPULSE_SHOWCASE_ARCHITECTURE_V0_1.md).
Its complete data, security, blockchain, and cost design is in
[`OPEN_FORECAST_LIBRARY_ARCHITECTURE_V0_1.md`](./OPEN_FORECAST_LIBRARY_ARCHITECTURE_V0_1.md).
Customer accounts, private storage, payments, and self-service submissions
remain deferred.

## Naming decision

Use **forecast** consistently across the ecosystem:

- **Open Forecast Receipt**: the portable record and verification standard;
- **Open Forecast Toolkit**: reusable validation, canonicalization, hashing,
  proof encoding, and verification code;
- **Open Forecast Explorer**: the current read-only demonstration interface;
- **Open Forecast Library**: the public discovery and curated publication product;
- **Forecaster**: the human, AI model, algorithm, ensemble, hybrid system, or
  organization that issues a forecast.

`Prediction` remains an ordinary-language and machine-learning term inside a
forecast where useful. It is not the public product noun. A statement such as
“people will have flying cars” is a broad prediction. To become a registrable
forecast it must be made testable, for example: “By 31 December 2031, at least
1,000 passenger eVTOL aircraft will be in commercial service worldwide,” with
a resolution source and counting rule.

Forecast is not weather-specific. It is already used for markets, economics,
sales, demand, elections, energy, health, sports, technology, and climate. It
signals the applied, time-bound, measurable object that this standard preserves.

`Registry` is reserved for the technical behavior of the Library's backend:
append-only registration, identity, indexing, and query. It is not a second
customer-facing product name. This keeps the public abbreviations distinct:
**OFR** for the receipt and **OFL** for the library.

## Product boundaries

- **Receipt standard** defines the immutable payload, canonicalization, digest,
  correction lineage, evaluation lineage, and extensible proof envelope. It
  neither holds funds nor runs a public database.
- **Toolkit** implements the standard as pure libraries and command-line tools.
  It can accept a caller-provided blockchain signer, but never stores a wallet
  key or customer balance.
- **Explorer** lets anyone inspect receipts, reconstruct numeric paths, verify a
  digest or attestation, and demonstrate tamper detection. It is the read-only
  user interface over the Library.
- **Library** owns the Firestore public catalog, proof jobs, receipts, and public
  indexes. Accounts, payments, and self-service submissions are later options.
- **iPulse AI adapter** converts selected iPulse AI market forecasts into Open
  Forecast Receipts and submits them to the Library or directly to the Toolkit.

The current repository contains a Firestore-backed public Library and a
proof-issuance CLI for an operator-controlled, testnet-only wallet. It does not
contain customer wallets or a payment system.

## General entity model

The public product should be organized around stable entities rather than an
iPulse AI batch:

1. **Domain** — markets, weather, sports, elections, technology, health, or
   another forecasting field.
2. **Subject** — the thing being forecast, such as PepsiCo, a football match,
   rainfall in Abu Dhabi, or an election.
3. **Target** — the exact resolvable quantity or question, including its unit,
   horizon, resolution rule, and authoritative source.
4. **Forecaster** — a human, AI model, algorithm, ensemble, hybrid system, or
   organization.
5. **Forecast** — the probability, class, number, date, interval, distribution,
   ranking, or time-series path.
6. **Receipt** — the immutable Open Forecast Receipt containing the forecast
   and its provenance.
7. **Proof** — zero or more signatures, trusted timestamps, content-addressed
   records, or blockchain attestations attached through the proof envelope.
8. **Outcome and evaluation** — the resolved value and maturity-aware scoring.

The short form is:

`Domain -> Subject -> Target -> Forecaster -> Forecast -> Receipt -> Proof -> Evaluation`

Recommended forecaster types:

- `human`
- `ai_model`
- `algorithm`
- `ensemble`
- `hybrid`
- `organization`

## Information architecture

Recommended global navigation:

- Explore
- Subjects
- Forecasters
- Forecasts
- Proofs
- Evaluations
- Standards

### Subject page

- stable subject identity, aliases, identifiers, and authoritative sources;
- active targets and forecast horizons;
- latest forecasts, distributions, or paths;
- consensus and human-versus-machine comparison only where aggregation is valid;
- forecast history over time;
- individual forecaster receipts;
- proof coverage and correction status;
- resolved outcomes and evaluation after maturity.

Different target types must remain explicit. A binary event probability cannot
be averaged blindly with a numeric distribution or time-series path.

### Forecaster page

- identity and forecaster type;
- model, algorithm, organization, or human metadata;
- submitted forecasts across domains and subjects;
- verified, corrected, withdrawn, mature, and evaluated counts;
- accuracy, calibration, and domain performance only after maturity;
- methodology and version history;
- proof and correction history.

### Receipt page

Retain the current readable summary, path reconstruction, verifier, Full JSON,
proof links, correction lineage, and tamper sandbox. Public percentages must be
displayed as percentages, for example `-4.00%`. Compact basis-point integers such
as `-400` are an internal transport encoding and must never be shown without the
unit and conversion.

## Blockchain and payment operating model

The recommended default is a managed issuance flow:

1. A customer submits a forecast receipt to the Library.
2. The Library validates and seals the payload before charging for an optional
   proof.
3. The customer pays with card, account credit, or supported crypto.
4. A Library backend job asks the Toolkit to encode the proof.
5. A dedicated relayer wallet held in a secure key-management service signs and
   sends the transaction.
6. The Library stores the transaction hash and independent attestation UID,
   then links them from the receipt.

The private key is never pasted into the browser or receipt. A later
bring-your-own-wallet option may let advanced users sign and pay gas directly,
but it should not be the default user experience.

## Product evolution

### Near-term: five-asset visual reframe

- light-first application shell and open-source icon library;
- visible `Advisor` labels changed to `Forecaster` outside iPulse-specific
  explanatory text;
- subject icons, filters, search, progress, and proof status;
- PepsiCo master-detail view using the existing receipts, chart, verifier, and
  tamper components;
- responsive, accessible states and visual QA.

### Next: library-style browsing over current fixtures

- subject and forecaster indexes over the existing 60 receipts;
- forecast and proof indexes;
- search, filter, and sort across fixtures;
- aliases and stable IDs independent of mutable symbols or tickers.

### Later: public submission database

- authenticated issuer identities and optional receipt signatures;
- submission API, canonical validation, object storage, and database indexes;
- payments, proof-job outbox, relayer wallet, retries, and cost controls;
- spam, abuse, impersonation, malware, and moderation controls;
- licensing and visibility controls;
- duplicate detection and append-only correction or withdrawal workflows;
- domain profiles and resolution-source governance;
- maturity-aware evaluation services;
- privacy, retention, rate limits, observability, and backups.

## Market position

Metaculus, Good Judgment Open, Polymarket, and ForecastBench demonstrate that
forecasting, crowd judgment, markets, and AI evaluation are established product
categories. The defensible difference is not that forecasting platforms do not
exist. It is that Open Forecast Receipt makes an externally produced forecast a
portable, independently verifiable object:

- humans, AI models, algorithms, ensembles, and organizations share one model;
- numeric paths and non-market forecast types are first-class;
- corrections are append-only;
- proof status is explicit per receipt;
- blockchain proof is optional and never confused with truth;
- evaluation happens only after the target matures.

## Recommended sequence

1. Submit the hackathon with the stable v0.1 receipt, verifier, and five-asset
   explorer.
2. Reframe the interface around subjects, targets, forecasters, forecasts, and
   receipts while retaining the working verification core.
3. Add subject and forecaster indexes over the existing 60 receipts.
4. Publish the Open Forecast Library direction as an experimental roadmap,
   not as already-delivered functionality.
5. Design governance, payments, and proof issuance before accepting public
   third-party forecasts.
