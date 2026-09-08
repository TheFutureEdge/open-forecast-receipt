# Forecast Library launch audit - 2026-09-08

## Decision

The updated local candidate is verified. The website is not yet launched on
`https://forecastlibrary.com`. Cloud promotion remains pending the requested
explicit repository/branch and billing approval.

Repository: `TheFutureEdge/open-forecast-receipt`, branch `main`.
Local HEAD and remote main both resolve to
`31e338aa0f079e38628b9cf4f0434a87bf8b0248` before this release.
The working tree already contained the prior task's uncommitted Next.js
migration, canonical routes, Firestore read models and production hardening.
This release must include that migration, not just the landing-page patch.
Finder copies (`* 2.*`), design screenshots, upload artifacts and local env
files are outside the release scope and must remain untouched.

## Changes in this pass

- Kept the public website name Forecast Library and canonical domain
  `forecastlibrary.com`; fixed the remaining old submission-email label.
- Made the requested YouTube video independent of deployment env variables.
  The hero contains a responsive `youtube-nocookie.com` embed and direct watch
  link. YouTube metadata confirms its title, 44-second duration and upload
  timestamp `2026-08-15T09:37:01-07:00`.
- Added the open-source origins and agentic-workflow vision, distinguishing
  today's schema/verifier/receipt API from future A2A integration.
- Replaced the obsolete 5-subject/60-receipt smoke expectations with full Batch
  6 checks, bounded catalog/ledger reads, resolver agreement and scan-denial
  checks. The test stays restricted to staging.
- Selected the supported Firestore REST transport for finite server/script
  reads after the original gRPC audit stalled; REST completed the full plan.
- Updated transitive `fast-uri` from 3.1.5 to 3.1.7. This resolves the current
  URI-normalization advisories without changing receipt semantics. See the
  [upstream advisory](https://github.com/fastify/fast-uri/security/advisories/GHSA-5jgf-p345-68v8).
- Corrected the inaccurate README claim that production was empty and wrote
  `FORECAST_LIBRARY_FIRESTORE_STRUCTURE.md` from live inventory and code.

## Batch 6 evidence

The governed publisher rebuilt and schema-validated the proposed production
publication from BigQuery project `data-platform-436809` and immutable public
iPulse AI Firestore publications in `ipulse-401013`, without target writes.

| Measure | Verified result |
| --- | ---: |
| Public source publications / forecast subjects | 376 |
| Valid forecast receipts | 4,511 |
| Compact generation metadata rows | 4,585 |
| Internal generation rows outside public receipt set | 74 |
| Governed context snapshots | 575 |
| Selected optional proof receipts | 6 |
| Verified onchain proofs | 0 |
| Planned publisher documents | 18,814 |

Bundle digest:
`81770ca107fefc5dfe08bd1ccd94e1a0f595e3935630b2921bdc5eb9f5eec242`.

One internal-only subject lacks an immutable public publication and is correctly
excluded. QQQ has 11 eligible published forecasts; the other 375 subjects have
12. The complete public cohort is therefore 4,511, not an assumed 4,512.

An independent staging reference check found 4,511 unique receipt digests in
the active forecast index, with zero missing receipt documents. Staging stores
4,571 receipts in total: the current 4,511 plus 60 historical receipts outside
the active index. Preserve those historical records.

## Live cloud evidence

| Surface | Observed state |
| --- | --- |
| Staging app | Still serves the older Open Forecast Library title and lacks the requested video |
| Staging source records | 760 public entities, 376 collection members, 4,511 forecasts, 8 forecasters |
| Staging read models | New catalogs, ledgers, stats, targets, publishers and resolvers are absent |
| Production database | Exists, Standard in us-central1, deletion protection enabled |
| Production source records | 759 public entities, 5 pilot collection members, 60 pilot forecasts/receipts, 8 forecasters |
| Production read models | New catalogs, ledgers, stats and resolvers are absent |
| Production billing | Disabled; App Hosting API/backend setup requires Blaze billing |
| Public domain | GoDaddy placeholder, not Firebase App Hosting |

The read-only staging materialization plan passes: 5,656 lightweight source
documents, zero full receipt reads, 14,680 planned writes, and zero writes or
deletes executed. All generated documents fit within the 665,600-byte ceiling.
The largest sitemap part is 665,529 bytes; entity-ledger parts are at most
22,091 bytes for this cohort.

## Verification

- 47 tests across 6 files pass, including schema/integrity/tamper, publisher,
  identity/route, forecaster and ledger checks.
- All 28 static production-readiness checks pass.
- Staging and production builds pass, including TypeScript.
- Production dependency audit reports zero vulnerabilities after the patch.
- Desktop and 390px mobile browser inspections show the correct video, name,
  live cohort totals and vision copy. The mobile page has no horizontal overflow.
- The updated live staging browser-data smoke test currently fails with
  `permission-denied` against undeployed read-model rules. This is a real
  promotion blocker, not a passing test or evidence of production readiness.

## Remaining controlled launch actions

1. Commit/push the reviewed migration and this pass's changes on the existing
   `main` branch, excluding unrelated local artifacts and duplicates.
2. Apply the reviewed staging catalog plan and deploy the new rules/indexes and
   App Hosting candidate. Pass the full browser-data and HTTP smoke checks.
3. Enable production billing using the approved account, configure the isolated
   App Hosting backend's `production` environment, and grant its web runtime
   read-only Firestore access. Preserve the configured 0-2 instance limits.
4. Reconcile the production entity catalog from governed sources, preserving
   immutable identity history. Review this plan against the existing 759
   entities; production is not an empty target.
5. Publish the reviewed complete public Batch 6 through the publisher. Preserve
   historical receipts, then materialize production catalogs and deploy rules.
6. Roll out production, add the exact Firebase-provided DNS records at GoDaddy,
   wait for the managed certificate, and verify apex/www/provider redirects,
   canonical URLs, receipt API, forecast pages, robots and sitemap.
7. Only after these gates pass, proceed with public indexing and iPulse AI
   backlinks under their applicable repository scope.

The user's GoDaddy authenticator may be needed at the DNS step. It is not needed
for the local video edit or Firestore architecture explanation. No blockchain
issuance, receipt deletion, or silent historical rewrite belongs to this launch.
