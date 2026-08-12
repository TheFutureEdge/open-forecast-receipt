# Product purpose and iPulse AI integration

Status: Phase 1 implementation contract

## What this project is

Open Forecast Receipt is not primarily a public forecast-submission portal. It
has five deliberately separate responsibilities:

1. A domain-neutral JSON receipt contract for a sealed forecast and its
   provenance.
2. Market and AI profiles that add target, path, model, context, evidence, and
   evaluation semantics without making the core format market-only.
3. Deterministic validation, RFC 8785 canonicalization, SHA-256 hashing, path
   reconstruction, EAS encoding, and verification libraries.
4. A public reference explorer that lets a human read a receipt, inspect the
   actual forecast path, follow the EAS UID, and reproduce the integrity check.
5. An iPulse AI adapter and asynchronous issuance workflow as the first real
   implementation of the standard.

The current Vite application is responsibility 4. It is a reference explorer
and verifier, not a hosted service that must receive every third-party
forecast. A future API or submission portal can use the same schema, but it is
not required for Phase 1 or for iPulse AI.

## Phase 1 data and proof boundary

- Source cohort: 60 sanitized individual Batch 6 advisor forecasts across the
  five already-public assets.
- Initial onchain showcase: six individual receipts.
- Selection rule: the Ray Dalio researcher-mode receipt for each public asset,
  plus the PepsiCo thinker-mode companion. The rule does not inspect direction,
  rating, magnitude, accuracy, or observed performance.
- Network: Base Sepolia (`eip155:84532`) for the hackathon.
- Identity: every selected individual forecast receives its own EAS
  attestation UID.
- Transport: the six attestations may be submitted in one EAS `multiAttest`
  transaction. A shared transaction hash does not merge their UIDs, receipts,
  or forecast identities.
- Disclosure: all 60 full receipts remain inspectable; only the declared six
  make a Phase 1 blockchain-proof claim.
- Timing: Batch 6 issuance is retrospective. The original forecast time,
  public-release time, receipt sealing time, and Base block time must be shown
  as different events.

## Minimal production lifecycle

The production integration belongs after the immutable public-publication gate
and must never block forecast publication:

```text
individual forecast finalized
  -> immutable batch prediction published
  -> eligibility/selection policy evaluated without using outcomes
  -> one OFR receiptPayload generated per selected individual forecast
  -> validate + RFC 8785 canonicalize + SHA-256 digest
  -> store public receipt JSON and enqueue an issuance outbox item
  -> EAS multiAttest submits one or more selected receipts
  -> read each UID back from Base and verify all encoded fields + digest
  -> write one proof-registry record per individual forecast
  -> write one compact batch proof summary into Prediction Catalog V2
  -> public UI exposes the summary link; the OFR explorer exposes each UID
```

Retries must be idempotent by receipt digest. A material correction creates a
new receipt and new attestation and references the earlier receipt; it never
overwrites the historical payload or proof.

## Current internal submission command

The first operational publisher is `scripts/publish-library-bundle.mjs`,
documented in `OFL_PUBLICATION_BUNDLE_V0_1.md`. It is dry-run by default and
requires an exact project confirmation plus `--apply` before connecting to
Firestore. It validates, reseals, size-checks, and creates or byte-verifies
every public index and receipt record. Selected entries create private proof
jobs.

For initial iPulse operation, the batch-publication workflow exports a sanitized
bundle and invokes this command after the immutable public-publication gate.
When unattended automation is justified, the same publisher module can run as
a Cloud Run Job with Workload Identity. That is a packaging change, not a new
public API, and it adds no always-on instance.

## iPulse AI data contract

Do not make the public Forecast History page query Base, EASScan, a large batch
publication, or a new collection for each row. Extend the existing
`PredictionCatalogV2BatchEntry` with one optional compact summary:

```json
{
  "open_forecast_receipts": {
    "status": "complete",
    "network": "eip155:84532",
    "schema_uid": "0xfef3868c279700c5312e68d8f5be4cd4a755a5125c3d2153f1970b626e35cc14",
    "issuance_mode": "retrospective",
    "selected_receipt_count": 2,
    "verified_receipt_count": 2,
    "manifest_url": "https://ipulseai.com/tools/open-forecast-receipt/manifest/batch-6/assets/pepsi"
  }
}
```

`status` is `not_issued`, `pending`, `partial`, `complete`, or `unavailable`.
The URL is a batch-and-stable-asset manifest, not a ticker-derived database key.
Historical receipts retain the ticker and MIC that applied at forecast time;
the stable iPulse asset ID remains the entity identity when a ticker changes.

The detailed proof registry remains one record per receipt and should include:

- stable asset ID, scoring batch, publication revision, forecast ID, and
  receipt digest;
- OFR document URL and spec/profile versions;
- network, EAS contract, schema UID, attestation UID, transaction hash,
  attester, and block timestamp;
- issuance mode and status;
- verification timestamp/version and any failure reason;
- correction/supersession link when applicable.

## Exact Forecast History UI change

The existing public Forecast History table in iPulse AI gains one column after
`Research documents`:

```text
Blockchain proofs
```

For an issued Batch 6 showcase asset the cell reads, for example:

```text
View 2 verified receipts ->
Base Sepolia - retrospective
```

The link opens the OFR asset/batch manifest, which lists every individual
advisor receipt and gives each issued receipt a direct EAS UID link. An
unissued batch says `Not issued`; it must not show a disabled fake link. The
latest batch's two visual rows share one proof cell with `rowSpan=2`, because
daily performance refreshes do not change the frozen forecast receipts.

This is the minimum production UI change. A later enhancement may also add a
direct `Blockchain proof` link beside each advisor inside the historical AI
Forecasts document, but the batch-ledger column is sufficient for Phase 1.

## Hosting

The explorer can be hosted under a stable first-party route such as:

```text
https://ipulseai.com/tools/open-forecast-receipt/
```

For that subpath build, set
`VITE_BASE_PATH=/tools/open-forecast-receipt/`. Native's root-hosted preview
leaves the variable unset. Internal links and the canonical batch/asset route
work in both forms.

The public GitHub repository remains the source for the standard and verifier.
The iPulse application may reuse the library or adapter internally without
turning the public explorer into a runtime dependency: forecast generation and
receipt issuance must continue even if the explorer frontend is temporarily
unavailable.

## Proof limits

EAS proves that the exact compact projection and full-receipt digest were
attested by an address no later than the Base block time. It does not prove the
forecast is correct, that the reasoning was good, that evidence was complete,
or--for the retrospective Batch 6 cohort--that the forecast was onchain when it
was originally generated.
