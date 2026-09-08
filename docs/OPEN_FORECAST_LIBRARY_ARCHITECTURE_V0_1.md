# Open Forecast Library architecture v0.2

Date: 2026-08-12  
Status: active lean architecture  
Scope: Future Edge-operated, public iPulse AI showcase; no customer accounts or payments  
Fixed infrastructure target: less than USD 9 per month

## 1. Decision

Open Forecast Library is now the public database and browsing product around the
Open Forecast Receipt standard. The first version is deliberately small:

- public, anonymous, read-only browsing;
- controlled publication of sanitized iPulse AI receipts by Future Edge;
- outside submission requests through `support@ipulseai.com`;
- optional per-receipt Ethereum Attestation Service proofs on Base;
- no customer accounts, private storage, billing, Stripe, SQL Connect, or
  always-on backend.

Use Firebase Hosting plus Cloud Firestore Standard. Static JSON files remain
only as canonical test vectors and controlled import sources. They are not the
runtime database.

## 2. Product boundaries

| Layer | Purpose | Persistence or wallet ownership |
|---|---|---|
| Open Forecast Receipt | JSON contract for one immutable forecast, provenance, correction lineage, and proof envelope | None |
| Open Forecast Toolkit | Validate, canonicalize, hash, encode, verify, import, and publish | Accepts a signer interface; never stores a key |
| Open Forecast Explorer | Human-readable receipt, chart, JSON, proof, and tamper views | Read-only |
| Open Forecast Library | Firestore catalog of collections, subjects, forecasters, forecasts, receipts, proofs, and private operator jobs | Owns the public database and managed proof workflow |
| iPulse AI adapter | Maps approved iPulse AI forecasts to OFR | Runs after iPulse AI's immutable publication gate |

The current repository is a lean monorepo for all five layers. A second
repository is unnecessary until the Library becomes an independently deployed
multi-tenant product.

## 3. Current implementation

The local application now reads Firestore through
`src/lib/library/repository.ts`. The complete reviewed iPulse AI publication
generated on 2026-07-05 currently contains 376 forecast subjects, 4,511
individual forecast indexes and receipts, and 6 receipts preselected for
independent proof issuance. `batch-6` remains the publisher's stable internal
collection ID and `SB6` is an optional public source tag; neither identifies an
individual forecast.
`scripts/publish-ipulse-batch.mjs` publishes the authoritative records.
`scripts/materialize-public-catalogs.mjs` creates compact, read-optimized
projections for directory and collection pages.

The controlled staging import requires `--apply` and
`OFR_CONFIRM_FIRESTORE_PROJECT=<exact-project-id>`. It creates documents
without overwriting existing receipts. Local UI work reads staging through the
same anonymous, read-only client path used after deployment; no Firebase
emulator is started.

The public web client has no write method and cannot access proof jobs.

## 4. Runtime topology

```mermaid
flowchart LR
  Visitor["Anonymous visitor"] --> Hosting["Firebase Hosting + CDN"]
  Hosting --> Web["React Explorer"]
  Web --> PublicDb["Cloud Firestore public_* collections"]
  Web --> BaseRead["Base RPC read only when a proof UID exists"]

  IPulse["iPulse AI public publication gate"] --> Publisher["Controlled OFR publisher"]
  Publisher --> Validate["Validate + RFC 8785 + SHA-256"]
  Validate --> PublicDb
  Validate --> Jobs["Private proof_jobs"]

  Operator["Future Edge operator identity"] --> ProofTool["Toolkit proof command"]
  ProofTool --> Jobs
  ProofTool --> KMS["Dedicated Cloud KMS secp256k1 key"]
  KMS --> Base["EAS contracts on Base"]
  Base --> ProofTool
  ProofTool --> PublicDb
```

There is no public application server. Anonymous reads go directly from the
Firebase Web SDK to Firestore under Security Rules. Controlled publishing uses
the Admin SDK and Google Cloud IAM, which bypasses client rules by design.

## 5. Firebase project isolation

The already-published hackathon site `open-forecast-receipt.web.app` is a
secondary Hosting site in `ftredge-staging`. It is not in a PAPP project, but it
should remain a historical/demo deployment.

Create dedicated projects before any cloud Firestore import:

| Environment | Proposed project ID | Display name | Chain |
|---|---|---|---|
| staging | `oflapp-staging` | OFLAPP-STAGING | Base Sepolia |
| production | `oflapp-prod` | OFLAPP-PROD | Base mainnet only after separate approval |

Staging was provisioned on 2026-08-12 with Firestore Standard in
`us-central1`, delete protection enabled, and the default free-tier database.
Its public Hosting origin is `https://oflapp-staging.web.app`. The
`oflapp-prod` GCP project exists only as an empty, unbilled boundary. Firebase,
Firestore, data, Hosting, wallet infrastructure, and deployment are not enabled
there. When production activation is separately approved, its database location
will also be `us-central1`.

Never reuse `ipulse-401013`, `pulse-staging-e1394`, or
`pulseapp-firebase-dev`. The Library also gets separate service accounts, KMS
keys, budgets, rules, Hosting sites, and wallet addresses per environment.

## 6. Firestore model

Public and private namespaces are deliberately separate. This makes anonymous
queries simple and prevents Security Rules from being mistaken for result
filters.

### Public collections

| Collection | Document ID | Purpose |
|---|---|---|
| `public_collections` | stable collection ID, for example `batch-6` | Authoritative publication metadata and aggregate counts |
| `public_collection_entities` | `{collectionId}__{stableSlug}` | Authoritative entity membership, display snapshot, ordering, and proof counts |
| `public_entities` | stable entity ID | Enduring entity identity, aliases, current identifiers, and governed relationships |
| `public_forecasters` | stable forecaster ID | Human, AI model, algorithm, ensemble, hybrid, or organization identity |
| `public_forecasts` | stable forecast ID | Lightweight searchable index pointing to a receipt digest |
| `public_receipts` | lowercase SHA-256 payload digest | Full immutable OFR document and compact proof projection |
| `public_proofs` | `{caip2}__{attestationUid}` | Verified proof metadata and receipt pointer |
| `public_entity_directory_catalogs` | `forecast-subjects` or `organizations` | Compact entity directory materialized views |
| `public_collection_catalogs` | stable collection ID | One read-optimized collection manifest |
| `public_entity_forecast_ledgers` | stable `entityId` | Small per-entity ledger manifest with part counts and latest-part metadata |
| `public_entity_forecast_ledgers/{entityId}/parts` | `part-000001`, `part-000002`, ... | Deterministic oldest-to-newest forecast-summary parts, each capped below 700 KiB |
| `public_entity_forecast_catalogs` | `{collectionId}__{entityId}` | Transitional read compatibility for the first collection-scoped catalog format |

### Materialized catalog read path

The browser is catalog-first; individual documents remain authoritative:

1. `/entities` and every `/entities/subjects/*` category route read the same
   `forecast-subjects` directory catalog. Category URLs are stable, indexable
   preset views—not separate catalogs. They share search, category,
   forecast-availability, and sorting controls. The screen also reads the small set of
   collection catalogs used to derive forecast counts and latest activity.
2. `/forecasts` reads `public_collection_catalogs/batch-6`.
3. A listed-security ledger queries the two highest numbered documents under
   `public_entity_forecast_ledgers/{entityId}/parts`. This deliberately reads
   both a newly opened sparse part and the preceding populated part. Optional
   publication-set memberships are a second, small query used only to build set
   shortcuts.
4. The ledger paginates the loaded summaries in 25-row UI pages. When a user
   requests older history, a Firestore cursor loads the next two lower-numbered
   catalog parts and merges them into the browser's in-memory ledger.
5. Selecting an individual forecast gets one `public_receipts/{digest}`
   document after resolving its compact ledger entry.
6. Entity profile pages directly get one `public_entities/{entityId}` document.

The earlier non-catalog `/forecasts` fallback performed about 753 billable
document reads: 1 collection document + 376 collection-entity documents + 376
forecast-subject entity documents used to join logos. That number was not a
count of securities. The catalog-first path replaces those 753 returned
documents with one collection-catalog document for the same screen.

The browser temporarily falls back to authoritative queries when catalog
documents have not yet been promoted. This keeps staging functional during a
catalog migration but is not the intended steady-state path.

The 2026-08-14 staging plan measured:

| Catalog | Documents | Largest document | Current content |
|---|---:|---:|---:|
| Entity directories | 2 | 305,223 bytes | 376 forecast subjects plus 364 organizations |
| Batch 6 collection manifest | 1 | 187,172 bytes | 376 entity rows |
| Per-entity forecast ledgers | 376 manifests + 376 initial parts | about 17,009 bytes per current part | 4,511 forecast summaries total across all publishers and optional sets |

Catalogs have a 700 KiB publisher limit, below Firestore's 1 MiB hard limit.
At the current compact-record average, the forecast-subject directory fits
about 883 forecast subjects in one document (roughly 507 more than the current
376), the
Batch 6 manifest fits about 1,439 rows at its current average record size, and a
per-entity forecast-ledger part fits about 500 forecast summaries at the
measured largest-document average. The materializer automatically opens the
next numbered part before a document would exceed 700 KiB. Parts are ordered
oldest to newest, while the UI initially reads the newest two and paginates
backward in two-part windows. The authoritative `public_forecasts` and
`public_receipts` records remain separate from these replaceable read models.

### Public forecast routes and identity

The public hierarchy deliberately separates the governed security, its full
forecast ledger, optional publisher sets, and individual forecasts:

| Purpose | Example public route |
|---|---|
| Listed security | `/entities/listed-securities/3m-mmm` |
| All forecasts for that security | `/entities/listed-securities/3m-mmm/forecasts` |
| Optional date-led publication set | `/entities/listed-securities/3m-mmm/forecast-sets/2026-07-05-sb6` |
| One forecast | `/entities/listed-securities/3m-mmm/forecasts/2026-07-05t14-56-47z/elon-musk-ai-on-gemini-3-1-pro/d6904de5a801` |

The individual forecast locator combines the generation timestamp, a readable
forecaster slug, and a stable receipt-digest prefix. The governed `entityId`,
full `forecastId`, and full receipt digest remain the authoritative machine
identifiers. A future individual submission can appear in the same security
ledger without a source-set or batch tag.

`public_receipts` permits direct `get` only, not collection scans. Discovery
uses the materialized catalogs backed by `public_forecasts`; a receipt opens by
its digest. This reduces accidental bulk transfer of the large receipt documents.

### Private operator collections

| Collection | Purpose |
|---|---|
| `proof_jobs` | Selected receipt, target network, status, attempts, and retry metadata |
| `publisher_runs` | Import audit record and source digests |
| `operator_locks` | Optional short-lived idempotency and nonce coordination |

All client access to private collections is denied. They are available only to
least-privilege Google IAM identities through server libraries.

### Immutability

- A receipt document ID is its SHA-256 payload digest.
- Production imports use create-only writes.
- Adding a proof updates only proof metadata or inserts `public_proofs`; it does
  not change the sealed `receiptPayload` digest.
- A correction creates a new receipt with an explicit lineage reference.
- Stable subject IDs are never tickers. Ticker, MIC, ISIN, and other identifiers
  are point-in-time attributes and aliases.
- Firestore's 1 MiB document limit is enforced with a 900,000-byte receipt
  publisher guard and a stricter 700 KiB materialized-catalog guard. Current OFR
  documents are far below the receipt limit.

## 7. Firestore access control

`firestore.rules` applies this policy:

- anonymous read of explicitly named `public_*` catalog collections;
- direct anonymous read of a public receipt by digest;
- no public receipt collection scan;
- no browser write, including from a signed-in Firebase user;
- deny everything else.

Future Edge operators do not need Firebase customer accounts. They authenticate
to Google Cloud and receive a narrow IAM role for the controlled publisher.
This is simpler and safer than adding Firebase Authentication just to manage an
internal publishing process.

## 8. Forecast publication lifecycle

1. iPulse AI completes a forecast and reaches its immutable public-publication
   gate.
2. The adapter exports only approved public fields. Raw prompts, raw model
   responses, private evidence, credentials, and hidden chain-of-thought never
   enter OFR.
3. The Toolkit maps one individual forecast to one `receiptPayload`.
4. JSON Schema validation passes.
5. RFC 8785 canonicalization and SHA-256 produce the receipt digest.
6. The publisher checks stable subject and forecaster identity, correction
   lineage, duplicate digest, timestamps, and Firestore document size.
7. A create-only operation writes the public subject/forecast/receipt records.
8. If the selection policy requests an onchain proof, the publisher creates a
   private `proof_jobs` record.
9. The Library becomes immediately browsable; blockchain proof is optional and
   may still show `not_issued`.
10. After confirmation on Base, proof metadata is added and the iPulse AI batch
    ledger can link directly to the Library receipt and EAS explorer.

The blockchain timestamp never replaces the forecast creation time. Batch 6 is
retrospective and remains labeled as such.

## 9. Blockchain implementation

### What is integrated

The Toolkit uses `viem` to call the standard Ethereum Attestation Service
contracts deployed on Base:

- Schema Registry: `0x4200000000000000000000000000000000000020`
- EAS: `0x4200000000000000000000000000000000000021`
- Base Sepolia chain ID: `84532`

There is no special “Base storage SDK.” Base is an EVM layer-2 network. `viem`
encodes the EAS contract call, estimates it, signs the Ethereum transaction,
submits it to a Base RPC endpoint, waits for confirmation, and reads each EAS
attestation back.

One receipt remains one EAS UID. `multiAttest` may transport several receipts
in one transaction, but it does not merge their identities or proof records.

### Gas payment

Gas is paid in ETH held by the dedicated Library attester address. The public
visitor and iPulse AI do not attach wallets. Funding flow:

```text
Russlan's personal wallet
  -> small ETH transfer
  -> dedicated Library attester address
  -> EAS transaction gas on Base
```

Do not send 10 ETH. That would create unnecessary loss exposure. For testnet,
use faucet Base Sepolia ETH. For Base mainnet, start only after a live estimate
and fund a small operational amount such as `0.005-0.02 ETH`, then top up when
the balance falls below a defined threshold. The transaction command must stop
if its estimated total fee exceeds the approved USD 5 batch ceiling.

Base transaction cost has an L2 execution component and an L1 data-security
component, so the final preflight must estimate the total Base fee, not only
`gas × gasPrice`.

### Wallet and key security

Use two unrelated wallets:

- staging/Testnet attester: disposable, Base Sepolia only, no mainnet funds;
- production attester: generated inside production Cloud KMS and never exported.

The production key specification is:

```text
purpose: ASYMMETRIC_SIGN
algorithm: EC_SIGN_SECP256K1_SHA256
protection: SOFTWARE
```

Google Cloud KMS supports using a same-length Keccak-256 digest with its ECDSA
signing operation, which is what Ethereum transactions require. A Toolkit KMS
adapter converts the DER signature to Ethereum `r`, `s`, and recovery parity,
verifies the recovered address against the expected attester, and only then
broadcasts the raw transaction.

No private key appears in GitHub, Firestore, a receipt, browser storage, log
output, or `.env`. The operator/service account gets only:

- `cloudkms.cryptoKeyVersions.useToSign` on one exact key version;
- `cloudkms.cryptoKeyVersions.viewPublicKey` on that key;
- narrow Firestore access to proof jobs and proof updates;
- no permission to create or destroy keys.

Cloud Audit Logs record KMS signing. The command verifies the chain ID, EAS
contract address, schema UID, selected receipt digests, signer address, balance,
nonce, and fee ceiling before signing.

The existing `.env.local` private-key path remains testnet-only compatibility
for the six-receipt pilot. It is not the production design.

## 10. Cost model

| Component | Design | Expected fixed monthly cost |
|---|---|---:|
| Firebase Hosting | Static React build and CDN | USD 0 within 10 GB storage/transfer free allowances |
| Firestore Standard | One database per environment | USD 0 within 1 GiB, 50k reads/day, 20k writes/day, 10 GiB outbound/month |
| Authentication | None for visitors; Google IAM for operators | USD 0 |
| Compute | Maintainer-run publisher/proof command; no always-on service | USD 0 |
| Cloud KMS production key | One software secp256k1 key version | about USD 0.06/month plus USD 0.03 per 10k cryptographic operations |
| Base Sepolia gas | Faucet test ETH | USD 0 monetary cost |
| Base mainnet gas | Per approved proof batch | Variable; hard cap USD 5 per batch |
| SQL Connect / Cloud SQL | Not used | USD 0 |

Expected fixed cost is approximately USD 0-0.06 per environment at current
showcase scale, safely below USD 9. Blockchain gas is explicit variable usage,
not fixed infrastructure.

Set billing budgets and alerts at USD 5 and USD 9. Google budgets are alerts,
not automatic caps; code-level fee and usage gates are still required.

## 11. Staging-backed development and testing

Put the public Firebase Web configuration for `oflapp-staging` in
`.env.staging.local`, then run Vite:

```bash
npm run dev -- --host 127.0.0.1
```

Open:

- Library showcase: `http://127.0.0.1:5173/showcase`
- Fast integrity test: `http://127.0.0.1:5173/test`

Verification:

```bash
npm test
npm run build
npm audit --omit=dev
npm run eas:preflight
```

The browser remains read-only under deployed Firestore Security Rules. Cloud
imports require the exact project confirmation environment variable and Admin
SDK identity.

## 12. What is complete and what still requires approval

Complete in staging:

- Firestore runtime repository;
- 145-record controlled Batch 6 seed (including 60 receipts and 6 proof jobs);
- anonymous public-read/client-deny-write rules;
- direct receipt links and Library browsing;
- read-only public client and controlled cloud import workflow;
- deployed Firestore rules and indexes;
- 145 imported records: 5 subjects, 60 forecasts, 60 receipts, and 6 private
  proof jobs;
- public Hosting deployment at `https://oflapp-staging.web.app`;
- live anonymous-access smoke checks proving public record reads, direct
  receipt reads, denied receipt scans, denied private reads, and denied browser
  writes;
- deterministic EAS encoding, preflight, testnet issuance, and chain verifier.

Not performed:

- production billing, Firebase/Firestore activation, database, and deployment;
- Cloud KMS key creation or IAM grants;
- EAS schema registration or receipt issuance;
- Base mainnet activation;
- iPulse AI ledger code changes.

Those are separate external-state steps and require exact staging/production
approval. The next safe milestone is to exercise the generic publication bundle
with the next iPulse batch, then issue the six already selected staging proofs
on Base Sepolia and sync their individual UIDs.
