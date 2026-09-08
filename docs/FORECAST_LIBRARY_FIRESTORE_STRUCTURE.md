# Forecast Library Firestore structure

Verified against repository publishers/readers and live Firestore on 2026-09-08.

Forecast Library is the website at `https://forecastlibrary.com`. Open Forecast
Receipt is its open-source receipt standard. The website, receipt format, and
optional blockchain proof are distinct layers.

## Project boundary and current state

Both dedicated projects use the `(default)` Firestore Standard database in
`us-central1`:

| Project | Current records | Launch status |
| --- | --- | --- |
| `oflapp-staging` | 4,511 active forecasts, 4,571 stored receipts, 760 public entities, 8 forecasters | Complete current Batch 6; new read models/rules not yet applied |
| `oflapp-prod` | 60 pilot forecasts/receipts, 759 public entities, 8 forecasters | Older pilot only; billing disabled; production launch pending |

The extra 60 staging receipts are historical records outside the current
forecast index. All 4,511 current forecast digests have a stored receipt. They
must not be deleted or silently rewritten to make raw storage counts match.

## Logical document tree

These are parallel top-level collections, joined by explicit identifiers. A
forecast is not nested inside an entity, forecaster, or batch document.

```text
projects/oflapp-{staging|prod}/databases/(default)/documents
|
|-- entities/{entityId}                       internal current identity record
|-- entity_versions/{versionId}              immutable identity snapshots
|-- entity_identifiers/{identifierId}        ticker, ISIN, FIGI, source ID, etc.
|-- entity_identifier_keys/{identifierKeyId} unique-identifier ownership
|-- entity_aliases/{aliasId}                 alternate names/search aliases
|-- entity_relationships/{relationshipId}    subject/predicate/object links
|
|-- public_entities/{entityId}               approved public identity projection
|-- public_forecasters/{forecasterId}        stable forecaster profile
|-- public_publishers/{publisherId}          accountable publisher
|-- public_targets/{targetSlug}              measurement definition
|-- public_collections/{collectionId}        publication-set metadata
|-- public_collection_entities/{collectionId}__{routeSlug}
|                                           one collection/subject membership
|-- public_forecasts/{sourceForecastId}      compact index for one forecast
|-- public_receipts/{sha256Digest}           sealed JSON plus EAS projection
|-- public_proofs/{network}__{attestationUID} optional issued proof state
|
|-- public_forecast_resolvers/{forecastPublicId}
|-- public_receipt_resolvers/{sha256Digest}
|
|-- public_entity_directory_catalogs/{forecast-subjects|organizations}
|-- public_collection_catalogs/{collectionId}
|-- public_entity_forecast_catalogs/{collectionId}__{entityId}
|-- public_entity_forecast_ledgers/{entityId}
|   `-- parts/{partId}                       bounded older/newer forecast pages
|-- public_forecaster_catalogs/active
|-- public_library_stats/summary
|-- public_sitemap_catalogs/site
|   `-- parts/part-{0000,...}                 bounded sitemap entries
|
|-- publisher_runs/{bundleDigest}            private import audit log
`-- proof_jobs/{receiptDigest}__{network}     private optional proof queue
```

`public_publishers`, `public_targets`, both resolver namespaces, and the new
catalog/ledger/stats/sitemap namespaces are implemented in code but were absent
from both live databases at the audit. `public_proofs` is optional and currently
absent: six current receipts are selected for proof, zero are issued/verified.

Staging also retains `public_subjects` and `public_collection_subjects` from the
old five-subject demo. They are historical namespaces, not the current read
contract. Current rules do not grant them browser access.

## What each main document contains

| Document | Main fields and references |
| --- | --- |
| `public_entities/{entityId}` | `entityId`, `currentVersionId`, `entityType`, `entityClasses`, `canonicalName`, `stableSlug`/`publicSlug`, aliases, external identifiers, related entities, logo, lifecycle, public status |
| `public_forecasters/{forecasterId}` | Stable ID, display name, public slug, model/persona, forecaster and implementation kinds, version pointer, publisher organization/team, modes, task-configuration and subject-assignment references |
| `public_publishers/publisher_future_edge_ipulse_ai` | Publisher ID, public slug `ipulse-ai`, name, organization reference, website, public status |
| `public_targets/adjusted-end-of-day-close-return` | Target ID, public slug, name, observation description, dimension/transformation, unit |
| `public_collections/batch-6` | Collection ID, batch label, publisher, public slug `2026-07-05-sb6`, publication time, subject/receipt/proof totals |
| `public_forecasts/{sourceForecastId}` | Source forecast ID and revision, stable `forecastPublicId`, entity, forecaster, publisher, target, collection, receipt digest, creation/horizon times, run provenance, original iPulse AI URL, proof status |
| `public_receipts/{digest}` | Receipt digest, IDs linking back to forecast/entity/forecaster/collection, timestamps, specification/profile versions, complete `document`, compact `projection`, original source reference |
| `public_forecast_resolvers/{forecastPublicId}` | Public forecast ID, source forecast ID, entity ID, receipt digest, canonical path |
| `public_receipt_resolvers/{digest}` | Receipt digest, public forecast ID, canonical path |

The complete OFR record is stored in `public_receipts/{digest}.document`.
Its `receiptPayload` contains receipt metadata, the forecast (entity, target,
forecaster, values and temporal boundaries), and provenance. Integrity fields
seal the canonical payload. The compact blockchain projection is a separate
field on the Firestore wrapper; it is not the complete forecast record.

Forecaster `currentVersionId`, task-configuration IDs, and subject-assignment IDs
are metadata references today. There are no separate live forecaster-version,
execution-run, evaluation, or agent-session collections. Rich run provenance is
inside the receipt, with a compact projection on the forecast index. Dedicated
evaluation records and A2A integration remain future work.

## Relationships and read flow

1. An entity can have many forecasts, across forecasters and collections.
2. A forecast refers to one subject, target, forecaster, publisher and receipt.
   Batch 6 is a browsing collection, not the identity of the forecast.
3. The receipt digest addresses the immutable evidence; `forecastPublicId`
   addresses the public forecast independently of that digest.
4. Optional blockchain proofs refer to the digest. Corrections require a new
   receipt/revision with lineage, preserving the old record.

```text
Landing page -> public_library_stats/summary
Entity directory -> one public_entity_directory_catalogs document
Batch 6 page -> public_collection_catalogs/batch-6
Collection/subject page -> one public_entity_forecast_catalogs document
Subject history -> latest two ledger parts, then two more per older page
Forecast URL -> forecast resolver -> forecast index -> receipt point read
Receipt URL -> receipt resolver -> permanent canonical forecast redirect
Receipt JSON API -> public_receipts/{digest}.document
Sitemap -> sitemap manifest and bounded parts (server only)
```

Catalogs are rebuildable projections, not replacements for sealed receipts.
The materializer reads lightweight indexes and never scans full receipt
payloads. Its document ceiling is 650 KiB. The tested Batch 6 plan creates or
updates 14,680 documents; it performs no receipt writes.

## Access boundaries

The reviewed rules deny all browser writes and raw collection scans. Approved
public records allow point reads; ledger queries allow a maximum of two parts.
Internal entity governance, publisher runs, proof jobs, and sitemap catalogs
have no direct browser access. Server code and controlled publishers use IAM
credentials, with the production web service intended to receive read-only
Firestore access. The new rules still need deployment and live verification.

## Video storage

The YouTube video is not stored in Firestore. Its public URL, embed URL and
verified metadata are part of `src/components/landing/LandingPage.tsx`. YouTube
serves the video; the landing page adds a responsive privacy-enhanced embed,
direct watch link, video structured data and the project's origins/vision copy.
