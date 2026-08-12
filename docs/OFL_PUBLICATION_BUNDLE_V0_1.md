# OFL publication bundle v0.1

The controlled publisher is the initial internal submission interface for
iPulse AI and other Future Edge products. It is a command, not a public API:
there is no always-on service, public write endpoint, account system, or idle
compute cost.

## Command

Dry-run validation does not connect to Firestore:

```bash
npm run publish:bundle -- --input=/path/to/bundle.json
```

An approved staging write requires both explicit flags:

```bash
OFR_CONFIRM_FIRESTORE_PROJECT=oflapp-staging npm run publish:bundle -- \
  --input=/path/to/bundle.json \
  --project=oflapp-staging \
  --apply
```

The operator authenticates with Google Application Default Credentials. Do not
create or download a service-account JSON key. Automated iPulse submission
should use Workload Identity and a narrowly scoped publisher service account.

## Bundle shape

```json
{
  "bundleVersion": "ofl-publication-bundle-v0.1.0",
  "createdAt": "2026-08-12T12:00:00Z",
  "proofNetwork": "base-sepolia",
  "collection": {
    "collectionId": "batch-7",
    "label": "iPulse AI Batch 7",
    "description": "Public forecast collection",
    "publishedAt": "2026-08-12T12:00:00Z"
  },
  "entries": [
    {
      "sortOrder": 0,
      "subjectSortOrder": 0,
      "requestBlockchainProof": true,
      "subjectPresentation": {
        "routeSlug": "pepsi",
        "aliases": ["pep"],
        "displaySymbol": "PEP",
        "marketIdentifier": "PEP:XNAS",
        "iconKey": "pepsi"
      },
      "receipt": {},
      "projection": {}
    }
  ]
}
```

`receipt` is the complete Open Forecast Receipt document. `projection` is its
compact EAS projection. One entry is one forecast and one receipt.

## Guarantees

- validates every receipt against the immutable OFR v0.1 JSON Schema;
- recomputes the RFC 8785/SHA-256 payload digest;
- verifies that the EAS projection commits to the same digest;
- enforces at most 10 architecture authors and 10 reviewers;
- rejects duplicate forecast IDs and receipt digests;
- enforces a 900,000-byte Firestore document safety limit;
- never silently overwrites a receipt or index record;
- safe retries verify existing documents byte-for-byte and skip exact matches;
- creates a private proof job only when the bundle requests one;
- records a private `publisher_runs` audit document keyed by bundle digest.

The iPulse adapter should create this bundle only after the immutable public
publication gate. Raw prompts, raw responses, hidden chain-of-thought,
credentials, and non-public data must never enter a publication bundle.
