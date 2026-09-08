# Forecast Library launch audit - 2026-09-08

## Decision

The user approved promotion and enabled Blaze. The application, complete Batch
6, governed entities, restrictive rules and bounded read models are deployed
to production. GoDaddy DNS is configured for `https://forecastlibrary.com` and
`www.forecastlibrary.com`. Both managed certificates are active. The apex
serves the production application over valid HTTPS at Firebase's published IP.
Recursive DNS caches still return the old GoDaddy destination, and Firebase's
www ownership check still sees the old CNAME; www routing remains pending.

Repository: `TheFutureEdge/open-forecast-receipt`, branch `main`.
The pre-release baseline was
`31e338aa0f079e38628b9cf4f0434a87bf8b0248`.
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

## Cloud baseline before the approved deployment

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

- 57 tests across 9 files pass, including schema/integrity/tamper, publisher,
  identity/route, forecaster and ledger checks.
- All 28 static production-readiness checks pass.
- Staging and production builds pass, including TypeScript.
- Production dependency audit reports zero vulnerabilities after the patch.
- Desktop and 390px mobile browser inspections show the correct video, name,
  live cohort totals and vision copy. The mobile page has no horizontal overflow.
- The updated live staging browser-data smoke test passes after deploying the
  read models and rules, including resolver agreement, bounded pagination,
  direct receipt reads and denial of anonymous writes and unbounded scans.
- The same checks pass against production using its public Firebase web config.

## Final custom-domain HTTP evidence

At `2026-09-08T18:02:24Z`, direct HTTPS requests to Firebase's published IP
with the real `forecastlibrary.com` hostname and normal certificate validation
passed all 15 page/API/robots/sitemap checks. The sitemap contains 5,696
canonical URLs. The receipt API payload reproduces its SHA-256 digest and
returns an ETag. Receipt aliases, historical entity aliases and the provider
host return HTTP 308; unknown routes return HTTP 404.

GoDaddy authoritative DNS and Google/Cloudflare recursive resolvers return
`35.219.200.13` for apex and www. The local resolver still returns the previous
GoDaddy address. Firebase reports both certificates active but its ownership
check still sees the previous www CNAME. Direct www HTTPS currently returns
Firebase's HTTP 404 setup page. The final status is therefore
`PASS_APEX_WWW_DNS_PENDING`, not an unconditional global launch pass.

## Approved deployment results

- Web release `9f688618b8ed43ed485a5bc89a138008fe70ad65` passed clean-archive
  tests/build and GitHub CI. Both App Hosting rollouts `build-2026-09-08-001`
  succeeded. The production provider URL redirects with HTTP 308 to the
  canonical origin, preserving path and query.
- Import safeguards `9d64976d52d4aea8badef759701f3bda7a02f817` passed 48 tests,
  TypeScript, 28 readiness checks and GitHub CI.
- Follow-up releases `d85d9c5` and `6c38dcb` corrected App Hosting forwarded-host
  handling, historical entity aliases and digest receipt redirects. Both
  environments completed rollout `build-2026-09-08-003`. All 4,511 forecast
  resolvers and 4,511 receipt resolvers match their governed canonical identity.
- Final web release `d3ff24f` resolves routes before streaming, so missing pages
  return HTTP 404 and legacy entity URLs return HTTP 308. This removes the
  global loading skeleton; first content waits for the bounded server reads.
  Local production HTTP checks, 57 tests, build/TypeScript and all 28 readiness
  checks and GitHub CI pass. Both environments completed rollout
  `build-2026-09-08-004`; production completed at `2026-09-08T18:01:21Z`.
- Production runtime is `ofl-prod`, `us-central1`, Node.js 22, environment
  `production`, with canonical origin `https://forecastlibrary.com`. Its web
  service identity has read-only Firestore access. The effective build retains
  one CPU, 512 MiB memory, concurrency 80 and 0-2 instances.
- The reviewed entity catalog uses forward import policy `0.6`, preserving
  historical `0.5` snapshots. Both environments passed immutable preflight.
  Staging created 3,840 records and updated 2,941 current projections;
  production created 5,771 and updated 2,939. There were no historical deletes.
- The initial production publisher stopped on 60 legacy receipt wrappers that
  lacked the new browse-only source link. All 60 sealed documents matched
  exactly. The publisher now preflights immutable records before any writes and
  preserves these wrappers verbatim; the resumed full import completed at
  `2026-09-08T17:27:43.942Z` with the reviewed bundle digest above.
- Independent production coverage confirms 4,511 forecast indexes, 4,511 unique
  referenced receipts and zero missing receipt documents. Staging retains its
  additional 60 historical receipts.
- Final materialization applied 14,679 records in each environment, with zero
  receipt writes and zero deletes. Production has 802 public entities; staging
  has 803 because it preserves one deprecated historical entity. All documents
  remain below 650 KiB; the largest production sitemap part is 665,427 bytes.
- Both environments received the restrictive rules and configured indexes.
  Two pre-existing obsolete indexes were preserved, not forcibly deleted.
- Apex and www A records now use Firebase's `35.219.200.13`; ownership TXT
  records and the shared certificate-validation CNAME are saved at GoDaddy.
  No authenticator challenge was required in the existing signed-in session.

## Original controlled launch sequence (steps 1-5 completed; step 6 DNS propagation pending)

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

GoDaddy accepted the DNS changes in the existing authenticated session; no
authenticator prompt appeared. No blockchain issuance, receipt deletion, or
silent historical rewrite was performed.
