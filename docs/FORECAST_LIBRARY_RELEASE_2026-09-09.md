# Forecast Library release: 2026-09-09

## Product boundary

Forecast Library is a general forecasting-science product. Open Forecast
Receipt is its underlying standard and verifier. iPulse AI is a distinct
financial-market research product and the first live publisher. Publisher
adapters own financial URL mappings; core record IDs do not encode market
categories, tickers, names, or model labels. Weather, demand and scientific
forecasting remain broader domain directions, not features claimed as live
under the current financial v0.1 ingestion profile.

## Included changes

- Main release `e9bb760`: publication admission and write safeguards, accurate
  proof state, unknown-record handling, navigation and video improvements.
- Permanent record release `d591494` plus compatibility fix `1a2dd19`: direct
  short-ID and receipt routes, frozen original paths, immutable revision
  storage, publisher-specific source links and public frozen schema mirror.
- `84162c1` and `80a6d51`: receipt-first mobile layout, specific record titles,
  manual submission checklist, explicit broad forecasting-science positioning
  and the current Firestore read-flow documentation.
- Future Edge `6820849`: live `/forecast-library/` explanation, homepage and
  navigation links, open-source origins/video, manual support submission and
  distinct product positioning.
- iPulse `3fe4e125` and `d85df550`: explicit individual receipt links in history
  and advisor reports, bounded link-registry shards, readable receipt lists
  and public frozen schema mirror. Promotion uses PR 634, staging to main.
- iPulse `debbfe9e` (PR 635): the selected advisor's embedded workspace header
  and signed-out preview also expose the exact original revision link.

## Data changes

Both dedicated Forecast Library projects have 4,511 create-only revision
snapshots. Verification against the preexisting published resolver/index pairs
found zero changed receipt payloads, zero changed original published paths,
and zero missing revision snapshots. Staging and production have their own
receipt inventories; their digests must not be assumed interchangeable.

Catalog rebuilding now reads immutable revisions and cannot update permanent
resolvers. The reviewed rebuild wrote 1,146 bounded catalog/profile documents
in each environment, with zero deletions. Production retains 4,511 published
forecasts across 376 forecast subjects, eight forecaster profiles, and zero
verified blockchain attestations. A sealed receipt is not an issued on-chain
proof and is not evidence of forecast accuracy.

Production deletion protection remains enabled. Seven-day point-in-time
recovery and a daily backup schedule with seven-day retention were enabled.

## Validation

- Forecast Library: 83 tests, 28 readiness checks and production build pass.
- Direct-route validation against production data: 24 checks across stocks,
  indices, forex, crypto and commodities. Old published paths, short forecast
  URLs and digest pages serve directly; JSON payload digests match; unknown
  forecast IDs and digests return 404; public schema bytes match the original.
- iPulse: complete production build including TypeScript and 537 static pages;
  eight history/registry checks validate all 4,511 bindings and all 376 subjects.
  Three focused checks also pass after the compact-list refinement.
- Browser inspection: Future Edge desktop and mobile page, correct readable
  heading contrast, iPulse signed-out historical ledger and its expanded
  twelve-receipt list. Existing auth and entitlement behavior is unchanged.
- Both Forecast Library environments pass all 24 permanent-route checks.
  The production homepage explicitly distinguishes the broad Library from
  iPulse AI, and the manual intake template is served successfully.
- The advisor-header follow-up passes nine focused tests and a complete build.
  Browser selection changes from Warren Buffett to Ray Dalio update the link
  to each advisor's distinct published ID.
- All 256 iPulse staging and production registry files match the reviewed source byte for
  byte, covering all 4,511 exact task/revision bindings and the frozen schema.
- Production robots allow crawling. All 4,511 original published forecast
  paths appear in the live sitemap, which contains no duplicate URLs.
- Initial iPulse promotion PR 634 merged as `3232163b`; production rollout
  and post-rollout verification both passed. The live PepsiCo ledger contains
  twelve unique direct Forecast Library links in the server HTML.
- PR 635 passed staging rollout, post-rollout checks and live advisor-switch
  verification before its normal merge as `70e3e3f9`. No admin bypass was used.
- Final production acceptance: iPulse rollout `rollout-2026-09-09-002`
  succeeded at 05:21 UTC; both deployment and post-rollout checks are green.
  The production browser displayed Warren Buffett's exact receipt and then
  changed to Ray Dalio's exact receipt when the selected advisor changed.
- Forecast Library `80a6d51` completed deployment to staging and production;
  Future Edge `6820849` completed its production deployment. This document-only
  completion record does not require another application build.

## Production entry points

- [Forecast Library](https://forecastlibrary.com)
- [Future Edge explanation](https://ftredge.com/forecast-library/)
- [Example iPulse historical ledger](https://ipulseai.com/stocks/pepsico-pep/forecast-history)
- [An exact published forecast revision](https://forecastlibrary.com/forecasts/f-2fv5zyna8wgg7vdqeyd1cg6gy4)
- [Manual submission instructions](https://forecastlibrary.com/submit)

The broader domain direction does not make the financial v0.1 receipt profile
universal. Support reviews additional domain requirements before publication.
The iPulse source URL catalog is used only by its explicitly owned adapter.

## Remaining expansion work

This release stabilizes published evidence and the first publisher integration.
Atomic catalog generation switching, a full isolated backup restore drill,
generalized v0.2 output profiles, external publisher onboarding and automated
A2A/evaluation services remain separate work. The manual support flow stays
in place. None requires changing an existing forecast or receipt permalink.

The future publisher adapter contract is explicit ownership plus original and
optional current-subject URLs. A missing publisher must fail validation; a
collection name or financial-looking subject must never infer iPulse ownership.
