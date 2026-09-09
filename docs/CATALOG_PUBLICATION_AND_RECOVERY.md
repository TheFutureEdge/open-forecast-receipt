# Catalog publication and recovery

## Launch scope

The current product publishes curated forecasts with manual support submissions.
Reliable catalog publication and a demonstrated recovery path are launch
requirements. Broader-domain receipt profiles and automated A2A services are
optional expansion: they are not prerequisites for marketing the current product.
Forecast Library remains domain-neutral; the live iPulse AI adapter is financial.

## Atomic catalog publication

Authoritative entities, publisher submissions, immutable revision snapshots,
receipts, and permanent URL resolvers retain their existing document IDs.
Browsing projections now live under:

```
public_catalog_state/current
  activeGenerationId, previousGenerationId, activatedAt, contentDigest
public_catalog_generations/{generationId}
  status: building | ready
  documentCount, contentDigest, createdAt, verifiedAt
  public_collections/{collectionId}
  public_collection_catalogs/{collectionId}
  public_entity_directory_catalogs/{catalogId}
  public_entity_forecast_catalogs/{collectionId}__{entityId}
  public_entity_forecast_ledgers/{entityId}/parts/{partId}
  public_forecasters/{forecasterId}
  public_forecaster_catalogs/active
  public_targets/{targetSlug}
  public_library_stats/summary
  public_sitemap_catalogs/site/parts/{partId}
```

The materializer captures the active pointer before reading source records,
creates a unique generation, writes every document, then reads every document
back and compares canonical SHA-256 hashes. Only a successful build becomes
`ready`. A transaction switches the single active pointer and rejects concurrent
pointer changes. Failed builds remain inactive. Previously published generations
are retained; publication never deletes old catalog parts.

Server rendering pins the generation for each render. Client ledger pagination
receives that generation ID from the server and includes it in its cache keys.
Already-open pages can finish reading their retained version after a switch.
Legacy root catalogs remain available to older deployed clients. The web
service remains read-only. Anonymous access permits public point reads and
bounded ledger queries, not generation metadata, incomplete builds, writes,
private records, or unbounded scans.

Publish authoritative data first using the existing reviewed publisher flow.
Then build the browsing projection:

```
node scripts/materialize-public-catalogs.mjs --project=oflapp-staging
OFR_CONFIRM_FIRESTORE_PROJECT=oflapp-staging node scripts/materialize-public-catalogs.mjs --project=oflapp-staging --apply --stage-only --generation=REVIEWED_ID
node --env-file=.env.staging.local scripts/smoke-catalog-generation.mjs --generation=REVIEWED_ID
```

Activate only after validation, naming the reviewed current generation (use
`legacy` for the first switch):

```
OFR_CONFIRM_FIRESTORE_PROJECT=oflapp-staging node scripts/activate-catalog-generation.mjs --project=oflapp-staging --generation=REVIEWED_ID --expected-current=CURRENT_ID --apply
```

Rollback uses the same command with a retained ready generation. The current
pointer must still match `--expected-current`; an intervening publication fails
closed. Existing forecast and receipt URLs require neither edits nor redirects.
For a routine validated rebuild, the materializer's `--apply` defaults to
verification followed by activation. Production uses the exact same flow with
the production project and environment file. Never modify a ready generation
in place. The old two-document presentation refresh command refuses to run
after generations are enabled; presentation changes use the materializer.

## Recovery procedure

Production uses Firestore point-in-time recovery and a daily backup schedule
with seven-day retention. Deletion protection is enabled. Recovery first creates
an isolated named database; it never overwrites the live `(default)` database.

Choose a whole-minute snapshot within the database's reported retention window.
Use the documented Firestore database clone API or a recent gcloud CLI:

```
gcloud firestore databases clone --source-database='projects/oflapp-prod/databases/(default)' --snapshot-time=REVIEWED_UTC_MINUTE --destination-database=REVIEWED_NEW_DATABASE --project=oflapp-prod
node scripts/verify-firestore-recovery.mjs --project=oflapp-prod --restored-database=REVIEWED_NEW_DATABASE --snapshot-time=REVIEWED_UTC_MINUTE
```

Wait for the clone operation to finish before validation. The verifier compares
all top-level collections and the `parts` collection group against the original
snapshot, recomputes each receipt payload digest, and checks every immutable
revision against both permanent resolvers. It prints counts and hashes only.
Run before resuming source publication so collection-name inventories align.

Run the application locally with the server-only `FIRESTORE_DATABASE_ID` set
to the restored database and check catalog pages, long and short forecast URLs,
receipt pages, JSON receipts, and sitemap. This is a recovery rehearsal, not
a production cutover. Client pagination also needs matching Firebase database
configuration before any real named-database cutover. Keep the restored database
private; no production rule release or website traffic is directed to it.

A scheduled backup can also be restored into an isolated new database with
`gcloud firestore databases restore --source-backup=BACKUP_RESOURCE --destination-database=NEW_DATABASE --project=oflapp-prod`.
Validate the restored snapshot before making any application cutover. Never
assume a successful restore operation proves data and URLs are intact.

References: [Firestore clone API](https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases/clone),
[PITR](https://firebase.google.com/docs/firestore/use-pitr),
[backup and restore](https://cloud.google.com/firestore/docs/backups).
