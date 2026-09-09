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
- Future Edge `6820849`: live `/forecast-library/` explanation, homepage and
  navigation links, open-source origins/video, manual support submission and
  distinct product positioning.
- iPulse `3fe4e125` and `d85df550`: explicit individual receipt links in history
  and advisor reports, bounded link-registry shards, readable receipt lists
  and public frozen schema mirror. Promotion uses PR 634, staging to main.

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

## Remaining expansion work

This release stabilizes published evidence and the first publisher integration.
Atomic catalog generation switching, a full isolated backup restore drill,
generalized v0.2 output profiles, external publisher onboarding and automated
A2A/evaluation services remain separate work. The manual support flow stays
in place. None requires changing an existing forecast or receipt permalink.

The future publisher adapter contract is explicit ownership plus original and
optional current-subject URLs. A missing publisher must fail validation; a
collection name or financial-looking subject must never infer iPulse ownership.
