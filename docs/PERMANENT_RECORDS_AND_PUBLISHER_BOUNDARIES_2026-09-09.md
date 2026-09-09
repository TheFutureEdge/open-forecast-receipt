# Permanent records and publisher boundaries

This decision supersedes the individual-record redirect policy in
OPEN_FORECAST_LIBRARY_URL_AND_DOMAIN_GOVERNANCE_V1.md. Forecast Library is a
general forecasting-science product. iPulse AI is its first financial-markets
publisher, not the definition of its subjects, targets or supported domains.

## URL contract

- `/forecasts/{forecastPublicId}` directly serves one published revision (200).
  The ID is derived from publisher namespace, source forecast ID and source
  revision. Display names, tickers, category, date and model labels are absent.
- Every already-published long URL keeps its original stored `canonicalPath`
  and continues serving that same revision directly. Never regenerate that
  path from today's entity or forecaster catalogs.
- `/receipts/{sha256}` directly serves the exact receipt, even without a
  current forecast resolver or browsing catalog. `/api/v1/receipts/{sha256}`
  remains the machine-readable equivalent. Unknown records return 404.
- Corrections create new IDs and digests with explicit lineage. Existing IDs
  are never rebound to replacements. Canonical metadata is not a redirect.
- Host normalization and obsolete pre-production navigation routes can retain
  redirects. Published evidence stability does not depend on redirect chains.

## Firestore ownership

`public_forecast_revisions/{forecastPublicId}` is the immutable public snapshot:
publisher/source/revision identity, digest, original canonical path and frozen
forecast summary. All 4,511 initial published records were copied additively
from the verified resolver/index pairs, preserving receipt bytes and URLs.

`public_receipts/{sha256}` holds the sealed document and its original wrapper.
`public_forecast_resolvers/{forecastPublicId}` and
`public_receipt_resolvers/{sha256}` retain their first binding and path. The
publisher uses create-only writes for these records and aborts on identity or
digest conflicts. A browse rebuild cannot rewrite them.

`public_forecasts/{forecastPublicId}` is a rebuildable index for new writes.
Legacy source-ID indexes remain for compatibility. Catalog materialization
reads `public_forecast_revisions`, avoiding duplicate counts from legacy index
keys and keeping older revisions available after corrections.

Entity, forecaster, collection, publisher, target, directory, ledger and sitemap
catalogs remain presentation/query structures. They may evolve independently.
They are not permanent evidence identities. Every catalog document is bounded;
large ledgers and sitemaps are partitioned. Atomic catalog-generation switching
is a separate outstanding rollout, not implied by frozen record storage.

## Publisher adapters and reciprocal links

Core source metadata supports an original publication URL plus an optional
`subjectUrl` and `subjectLabel` supplied by any publisher. The iPulse adapter
in `src/lib/publishers/ipulse.ts` alone interprets financial asset paths. It
requires iPulse publisher identity (or its explicit legacy source marker).
An unrelated publisher's subject ID or `batch-6` label cannot trigger an
iPulse link. Future weather, demand, scientific and other adapters use their
own subjects and source metadata.

For iPulse, each receipt links separately to the original historical research
and the asset's current AI Consensus. Current asset routes come from iPulse's
published public catalog. This catalog is not imported as Forecast Library's
universal taxonomy. It does not change sealed receipt bytes.

`scripts/export-ipulse-receipt-links.py` exports explicit published links to
iPulse. The registry is sharded by source task prefix; each task/revision key
has an append-only binding to a public forecast ID and receipt digest. Missing
entries produce no verification link. iPulse history exposes individual
receipts separately from optional verified blockchain attestations. Later
batches and revisions append entries instead of replacing earlier bindings.

## Scope and operations

Submissions remain manual through support@ipulseai.com. The current ingestion
adapter admits only reviewed public iPulse receipts. Broader domain profiles,
external publisher onboarding, automated A2A exchange and general evaluation
services remain planned capabilities; public copy must not claim them live.

Production has deletion protection, seven-day point-in-time recovery and a
daily backup schedule with seven-day retention. Recovery history accrues after
enablement. A full isolated restore drill remains to be completed; enabling
the features alone is not evidence of a successful restore.
