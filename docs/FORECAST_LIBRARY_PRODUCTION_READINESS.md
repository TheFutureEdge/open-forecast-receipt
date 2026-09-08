# Forecast Library production readiness

**Status:** Production application and full Batch 6 deployed; apex HTTPS verified; www/DNS propagation pending
**Canonical origin:** `https://forecastlibrary.com`
**Staging:** `oflapp-staging`, Firebase App Hosting, `us-central1`
**Production:** `oflapp-prod`, dedicated Firebase/GCP boundary
**Last verified:** 2026-09-08

The approved deployment upgraded production to Blaze and published all 4,511
Batch 6 forecasts/receipts, 376 forecast subjects, 802 public entities and eight
forecaster profiles. The 60 production pilot receipts are preserved unchanged.
Staging retains 60 additional historical receipts and one deprecated entity.
Both environments have the new rules and read models, and their anonymous
Firestore smoke checks pass. See `FORECAST_LIBRARY_LAUNCH_AUDIT_2026-09-08.md`.

## Launch decision

The staging and production App Hosting rollouts succeeded. GoDaddy's apex and
www records now point to Firebase and include the required ownership and
certificate-verification records. Both managed certificates are active.
Apex HTTPS serves the release at
Firebase's published address. The remaining domain gate is expiration of old
DNS records in recursive caches and Firebase's www ownership check. Until then,
some browsers can see GoDaddy and www can show Firebase's setup page.

No production write, deployment, DNS change, or public backlink should happen merely because this document exists. Each cloud mutation remains an explicit reviewed step.

## Frozen product boundaries

- **Forecast Library** is the public website and governed forecast catalog.
- **Open Forecast Receipt** is the open standard, canonical JSON contract, verifier, and optional blockchain-proof projection.
- iPulse AI is the first publisher, not the identity of the Library.
- Batch 6 is the first iPulse AI publication admitted to the Library. Earlier iPulse AI forecasts are intentionally excluded.
- A collection or source batch groups forecasts for browsing; it never becomes the identity of an individual forecast.
- A forecast, receipt, proof, and evaluation are separate objects with separate states.
- A proof can establish integrity and publication timing. It cannot establish truth, accuracy, or reasoning quality.

## Production data architecture

### Authoritative public records

| Namespace | Purpose | Browser policy |
|---|---|---|
| `public_entities` | Governed real-world and conceptual entities | Point reads only |
| `public_forecasters` | Stable forecaster profiles and version pointers | Point reads only |
| `public_targets` | Governed measurement definitions | Point reads only |
| `public_publishers` | Accountable publishing identities | Point reads only |
| `public_collections` | Optional publication-set metadata | Point reads only |
| `public_forecasts` | Lightweight authoritative forecast index | Point reads only; listing denied |
| `public_receipts` | Sealed OFR document and compact projection | Point reads by SHA-256 digest only |
| `public_proofs` | Optional blockchain-proof state | Point reads only |

The full receipt is deliberately not embedded in directory catalogs and is never listed during catalog generation. This keeps rich provenance available without making every catalog refresh download thousands of large receipt documents.

### Bounded read models

| Namespace | Purpose | Normal page cost |
|---|---|---|
| `public_entity_directory_catalogs` | Entity-directory search and filtering | One catalog read per role |
| `public_collection_catalogs` | Collection manifest and entity summaries | One read |
| `public_entity_forecast_catalogs` | One collection/entity workspace | One read |
| `public_entity_forecast_ledgers/{entityId}` | Ledger manifest | One point read when needed |
| `.../parts` | Cross-collection forecast ledger | Latest two parts; two more per older page |
| `public_forecaster_catalogs` | Profiles plus precomputed coverage | One read |
| `public_library_stats` | Landing-page totals | One read |
| `public_sitemap_catalogs/.../parts` | SSR sitemap entries | Server only |

Catalog documents use a **650 KiB safety ceiling**, below the agreed 700 KiB threshold. Forecast ledger and sitemap builders create deterministic numbered parts. New forecasts go into the highest-numbered part; the UI always reads the latest two parts initially so a newly opened sparse part never hides the preceding populated part.

### Stable identity and resolution

- `entityId` is immutable machine identity; `publicSlug` is an immutable governed public locator.
- Tickers, names, venues, and MICs can change without changing identity or canonical URL.
- `forecastPublicId` is a publisher-scoped 128-bit identifier derived from source forecast identity and source revision, not from the receipt digest.
- `public_forecast_resolvers/{forecastPublicId}` resolves the public forecast without a scan.
- `public_receipt_resolvers/{receiptDigest}` maps `/receipts/{sha256}` to the canonical forecast.
- Corrections create a new receipt/revision and preserve append-only history; a correction does not silently rewrite a sealed receipt.

## Verified production capacity snapshot

The completed materialization against `oflapp-prod` reported:

| Measure | Observed |
|---|---:|
| Public entities | 802 |
| Collection entities | 376 |
| Public forecasts | 4,511 |
| Public forecasters | 8 |
| Full receipts read by materializer | **0** |
| Lightweight source documents read | 5,700 |
| Largest entity-directory catalog | 328,683 bytes |
| Largest collection catalog | 187,058 bytes |
| Largest collection/entity forecast catalog | 26,399 bytes |
| Largest entity-ledger part | 26,418 bytes |
| Largest sitemap part (under the 650 KiB builder ceiling) | 665,427 bytes |
| Applied documents for the identity/catalog backfill | 14,679 |

The apply made no receipt writes and no deletes. The materializer only reads
lightweight indexes and preserves existing publisher and target definitions.

## Security and cost controls

- Firestore has a default-deny rule.
- All browser writes are denied. Controlled publishers use Admin SDK credentials and Google Cloud IAM.
- Raw forecast, receipt, proof, entity, and forecaster namespaces cannot be listed by browsers.
- Receipt reads are digest-addressed point reads.
- Client ledger queries require an explicit limit of no more than two parts.
- Sitemap catalogs are server-only.
- App Hosting uses `minInstances: 0`, one CPU, 512 MiB RAM, and a maximum of two instances.
- Staging and production use separate Firebase/GCP projects and must never share operational data stores.
- No Firestore emulator is part of development or deployment.
- The Base/EAS signer is outside the web application. Production signing is intended for a dedicated Cloud KMS key; no private key belongs in source, App Hosting public environment values, Firestore, or a developer browser.

## Canonical domain and indexing controls

- Production metadata, canonical tags, sitemap URLs, and structured data use only `https://forecastlibrary.com`.
- The production build fails closed if configured with any other site origin.
- The Firebase production host and `www.forecastlibrary.com` must issue path-preserving `308` redirects to the apex domain.
- Staging emits `noindex, nofollow, noarchive`, disallows crawling in `robots.txt`, and is omitted from public backlinks.
- Sitemap generation is dynamic and reads bounded sitemap catalogs rather than scanning Firestore forecast records at build or request time.
- Canonical route governance is frozen in `docs/OPEN_FORECAST_LIBRARY_URL_AND_DOMAIN_GOVERNANCE_V1.md`.

## Current verification evidence

Run locally from the repository root:

```bash
npm ci
npm test
npm run readiness:check
npm run build:staging
npm run build:production
npm audit --omit=dev
```

Current result:

- 57 tests pass across 9 test files, including preservation of legacy receipts.
- TypeScript and the optimized Next.js build pass.
- The automated production-readiness contract passes all 28 checks.
- npm reports zero known dependency vulnerabilities after the clean install.
- Final release `d3ff24f` passed GitHub CI and completed App Hosting rollout
  `build-2026-09-08-004` in both environments.
- All 15 apex HTTP checks pass using valid custom-domain TLS at Firebase's IP,
  including 5,696 sitemap URLs, receipt SHA-256/ETag, canonical HTTP 308s and
  real HTTP 404s. Ordinary DNS and www activation remain the external gate.

## Controlled promotion sequence

### Gate 1 — materialize and validate staging

Read-only plan:

```bash
npm run catalogs:plan:staging
```

After explicit approval, write the backfilled identities, resolvers, bounded catalogs, ledger parts, stats, and sitemap parts:

```bash
OFR_CONFIRM_FIRESTORE_PROJECT=oflapp-staging \
  node scripts/materialize-public-catalogs.mjs --project=oflapp-staging --apply
```

Then deploy the reviewed Firestore rules and indexes to staging and release the current App Hosting build. Verify at minimum:

- `/`, `/entities`, one corporation, one listed security, one ledger, and one individual forecast;
- `/forecasters`, `/targets`, `/publishers`, `/collections`;
- `/receipts/{digest}` permanent resolution;
- `/api/v1/receipts/{digest}` JSON, ETag, and cache headers;
- `/robots.txt`, `/sitemap.xml`, staging `X-Robots-Tag`;
- mobile header, mobile directory drawer, keyboard navigation, and older-ledger pagination;
- no runtime request lists `public_forecasts` or `public_receipts`.

### Gate 2 — provision the isolated production environment

In `oflapp-prod`:

1. Enable Firebase and create Firestore Standard in `us-central1`.
2. Create the App Hosting backend for this repository and set its environment name to `production`, so `apphosting.production.yaml` is selected.
3. Grant only the App Hosting runtime service identity the minimum Firestore read role required for SSR. Publisher identities remain separate.
4. Confirm the production runtime sees `NEXT_PUBLIC_OFL_ENVIRONMENT=production` and `NEXT_PUBLIC_SITE_ORIGIN=https://forecastlibrary.com`.
5. Do not add a blockchain signer to the web runtime.

Firebase App Hosting environment configuration follows the official environment-specific YAML mechanism documented by Firebase. Backend console values override YAML, so the deployed effective configuration must be inspected, not assumed.

### Gate 3 — publish Batch 6 to production

Build a dry-run directly from authoritative iPulse AI source systems:

```bash
node scripts/publish-ipulse-batch.mjs \
  --project=oflapp-prod \
  --scoring-batch=6
```

Review counts, exclusions, bundle digest, schema validation, and public-source links. After separate explicit approval, publish with both `--apply` and the exact project confirmation variable. Then run the production catalog plan and, after review, its separately approved apply command.

Do not copy a partially edited browser export from staging into production. The governed publisher should rebuild the same deterministic public dataset from authoritative iPulse AI inputs.

### Gate 4 — deploy production and attach the domain

1. Deploy Firestore rules and indexes to `oflapp-prod`.
2. Trigger the production App Hosting rollout from the reviewed Git commit.
3. Attach the apex `forecastlibrary.com` custom domain in App Hosting.
4. Add the exact DNS records provided by Firebase and wait for the managed certificate to become active.
5. Redirect `www` and the Firebase default production host to the apex while preserving path and query.
6. Run smoke tests first on the custom domain, then verify the fallback hosts redirect.

Only after the certificate, redirects, canonical tags, sitemap, and core forecast pages pass should reciprocal iPulse AI links be published.

### Gate 5 — public indexing and backlinks

1. Add and verify the domain property in Google Search Console.
2. Submit `https://forecastlibrary.com/sitemap.xml`.
3. Add the final Forecast Library URLs to iPulse AI historical forecast pages.
4. Verify each Forecast Library forecast links back to its original iPulse AI publication.
5. Monitor indexing, 404s, redirects, structured data, and App Hosting/Firestore costs.

## Remaining launch and distribution work

- Confirm ordinary recursive DNS resolves the new Firebase address and www
  returns the canonical path-preserving HTTP 308. The managed certificates are
  active; DNS cache expiry and www ownership reconciliation remain pending.
- Base/EAS proofs are optional and currently display as not issued; blockchain issuance is not a launch dependency.
- Production iPulse AI backlinks must wait for the canonical custom domain to pass smoke tests.

## Rollback and recovery

- Roll back the App Hosting service to the previous known-good rollout.
- Keep authoritative public records append-only; never delete or rewrite sealed receipts to repair a UI issue.
- Rebuild read models deterministically from authoritative index records.
- Restore a prior rules version only if it does not reopen browser writes or unbounded listing.
- If the custom domain is unhealthy, pause public launch rather than changing canonical metadata to a Firebase host.
- Corrections and withdrawals use governed status/revision records and explicit redirects or `410` behavior; URLs are never reassigned.

## Definition of production-ready

Production web readiness requires the infrastructure, data, security and
custom-domain checks in gates 1-4 to pass on `https://forecastlibrary.com`.
Gate 5 records the subsequent indexing and cross-repository distribution work;
those actions must be reported separately rather than implied by deployment.
Until DNS and www checks pass, the accurate status is **production deployed,
apex HTTPS verified, www/DNS propagation pending**.
