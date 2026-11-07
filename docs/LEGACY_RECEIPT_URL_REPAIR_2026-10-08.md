# Legacy iPulse AI receipt URL repair

The receipt generator used an HTTPS receipt identity under
`https://ipulseai.com/receipts/sha256/` although iPulse AI hosts no receipt
pages. The production batch publisher imports that generator. Forecast Library
exposes these identities in public receipt JSON and serialized page data.

The production audit on 2026-10-08 found 10,475 sealed receipts with distinct
legacy identifiers. All nine receipt examples reported in Search Console matched
this inventory. Their exact Forecast Library destinations returned HTTP 200;
their identity bindings and RFC 8785 payload hashes were independently verified.

## Repair behavior

- Newly generated receipts use `urn:ofr:receipt:sha256:<identity-digest>`.
  This preserves deterministic identity without advertising a publisher page.
- Existing sealed receipts, projections, proofs, revisions and fixtures retain
  their original bytes. Do not regenerate fixtures or republish old revisions
  to convert their identities. Existing publication conflict checks reject a
  changed payload for an already published revision.
- iPulse AI resolves a known legacy identifier with one HTTP 308 redirect to
  `https://forecastlibrary.com/receipts/<sealed-payload-digest>`.
- The legacy identity digest and sealed payload digest are different. Never
  repair this with a hostname substitution or a generic wildcard redirect.
- Unknown or malformed identifiers retain a 404 response. No receipt content
  is rendered by iPulse AI, and no receipt URLs are added to its sitemap.
- Requests use a frozen local mapping, with no cloud reads or writes.
- Known redirects remain crawlable so Google can discover the destination.
  They do not need `noindex` or a robots.txt block. Reporting changes require
  recrawling; redirecting does not guarantee zero future crawl requests.

## Reproduce the mapping

From the Open Forecast Receipt repository:

```sh
node scripts/export-ipulse-legacy-receipt-redirects.mjs \
  --project=oflapp-prod \
  --output=../ipulse_ui_next/src/data/legacy-receipt-redirects.json
```

This is a read-only production export projecting only receipt identity fields.
The exporter validates inventory size and fails on ambiguous identities. Its
metadata records the count, source project and SHA-256 of the output file.
The initial repair contains all 10,475 legacy identifiers. Newly issued URN
identities do not require additional iPulse AI redirects.

The UI implementation lives in
`src/app/receipts/sha256/[identity]/route.ts` and
`src/lib/legacyReceiptRedirects.ts` in `ipulse_ui_next`.

## Release and verification

The generator fix belongs in `TheFutureEdge/open-forecast-receipt` on `main`.
The route and frozen mapping belong in `TheFutureEdge/ipulse_ui_next`, through
the existing staging-to-main promotion path. Repository history and deployments
require the owner's scoped approval under `code/AGENTS.md`. Do not include
unrelated staging changes by inference.

After the approved UI rollout, check all nine reported URLs without following
redirects, then check their final destinations. Expect 308, an exact external
Location header, and a final 200. Verify malformed and unknown identifiers still
return 404, and receipt URLs remain absent from all iPulse AI sitemap parts.
Complete the UI production memory-controller handoff in its existing runbook.

Sources: [Google permanent redirects](https://developers.google.com/search/docs/crawling-indexing/301-redirects)
and [Google noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing).
