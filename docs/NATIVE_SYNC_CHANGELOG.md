# Native synchronization changelog

Record every material local application correction that must be reapplied or
uploaded to Native Builder before final submission.

## Pending synchronization

### Package and application shell

- Rename the generated package from `my-app` to `open-forecast-receipt` and set
  the initial package version to `0.1.0`.
- Remove React Router and its vulnerable transitive packages; use the small
  application-specific router in `src/lib/router.tsx`.
- Load the network verifier and individual JSON fixtures lazily so the initial
  application bundle remains practical with 60 receipts.

### Standard and data contract

- Make `receiptPayload` the immutable, canonicalized forecast record and keep
  the mutable `proofEnvelope` separate. The receipt digest is the RFC 8785
  canonicalized SHA-256 digest of `receiptPayload` only.
- Add explicit revision/correction lineage, temporal provenance, generation
  configuration, evidence records, evaluation maturity, and proof limitation
  fields. Do not preserve hidden chain-of-thought.
- Distinguish configured tools from observed execution. A researcher with web
  search enabled is recorded as configured; execution remains `unknown` where
  the source record did not capture an execution manifest.
- Preserve forecast, publication, later retrospective receipt issuance, and
  later blockchain block times as different events.

### Exact Phase 1 fixtures

- Correct the PepsiCo Ray researcher forecast creation time to
  `2026-07-05T14:48:47.049183Z` and regenerate every dependent identifier,
  digest, projection, and route.
- Replace incomplete placeholders with 60 sanitized Batch 6 receipts: 12
  individual advisor forecasts for each of PepsiCo, NVIDIA, Bitcoin, Alphabet
  Class C, and SPY.
- Use authoritative market identifiers from the asset dimension: `PEP:XNAS`,
  `NVDA:XNAS`, `GOOG:XNAS`, `SPY:ARCX`, and the explicit iPulse identifier
  `ipulse:BTC-USD.CC` where no ISO MIC exists.
- Display real symbols (`PEP`, `NVDA`, `BTC`, `GOOG`, and `SPY`) while retaining
  stable lowercase route slugs and optional aliases. A ticker change updates the
  current subject registry and aliases; it never rewrites a historical receipt.
- Include model release and knowledge-cutoff metadata, exact request/response
  timing, input-snapshot identity and digest, compact component provenance, and
  public source-publication metadata where the source systems captured it.
- Keep unavailable provenance honest. In particular, do not reconstruct search
  execution, exact evidence manifests, or forecast-time input snapshots from a
  later registry lookup.

### EAS verification

- Replace placeholder EAS encoding and decoding with the 17-field planned
  market-path ABI implementation in `viem`.
- Verify Base Sepolia attestations by UID against the official EAS contract,
  decode the data, compare the receipt digest and forecast identity, and reject
  revoked or mismatched records.
- Keep the schema UID and every attestation UID empty until an approved Base
  Sepolia registration and issuance. No UI state may imply that an unissued
  receipt has an onchain proof.

### Tests and release gates

- Validate all 60 receipts against the canonical JSON Schema.
- Recompute all 60 payload digests and compare every compact projection.
- Test 60 unique receipt digests and forecast IDs, 12 receipts per asset, real
  ABI round trips, mocked EAS reads, and tamper failure.
- Run the production build and require `npm audit` to report zero known
  vulnerabilities.

## Native completion checklist

1. Connect Native project `9b5dc37e-f409-4f5e-9206-b20d752313a5` to
   `TheFutureEdge/open-forecast-receipt` and pull every item above from its
   reviewed `main` branch.
2. Keep the 60 fixture files and the canonical schema byte-identical to this
   repository.
3. Run Native Builder and Native QA after synchronization.
4. Confirm the five-asset manifest, all receipt routes, the tamper demonstration,
   and the no-attestation state in the Native-hosted preview.
5. Send Native-origin changes to a reviewable integration branch, or download
   one final Native export and compare it with this repository, before
   deployment and hackathon submission.
