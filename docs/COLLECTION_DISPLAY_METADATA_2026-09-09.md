# Collection display metadata

The iPulse Batch 6 collection displays its publisher, financial domain, 4,511
forecast count, original forecast date (5 July 2026), and batch number. The
description separately identifies the later Library publication date
(6 August 2026). Tags reflect only represented forecast categories, with
stocks and fund shares distinguished using governed subject types.

Optional `presentation` metadata lives on `public_collections/{collectionId}`
and `public_collection_catalogs/{collectionId}.manifest`. It contains title,
publisher name, description, tags, and the source forecast date range. This
is mutable browsing metadata, outside immutable receipts and revisions.

The original two-document refresh command has been superseded by atomic
catalog generations. It now refuses to run when generations are enabled.
Use `scripts/materialize-public-catalogs.mjs` to derive and publish presentation
updates. Live collection and manifest projections reside beneath
`public_catalog_generations/{generationId}`; the root documents remain as
authoritative inputs and legacy compatibility. See
[the publication runbook](CATALOG_PUBLICATION_AND_RECOVERY.md).
The same publisher-specific helper preserves the title and tags on rebuild.
Financial wording is limited to the explicit iPulse publisher; other publishers
retain their own metadata.

The user-facing label is now Stocks. Existing `listed_security` identifiers
and `/entities/listed-securities` URLs remain unchanged. The original Batch 6
slug, `2026-08-06-sb6`, also remains unchanged despite the clearer title.

Validation: 86 tests passed, production build passed, and browser inspection
confirmed the descriptive collection card and all seven category tags.
