# Batch 6 Showcase proof execution

## Reviewed scope

All 60 original public Batch 6 receipts for PepsiCo, NVIDIA, Alphabet, Bitcoin,
and SPY are included. Each asset contributes all 12 advisor forecasts. Selection
does not depend on rating, forecast direction, magnitude, accuracy, or performance.

One EAS `multiAttest` call submits all 12 forecasts for an asset in one transaction.
Five assets therefore require five forecast submissions. Each transaction creates
12 independent attestation UIDs. This is the existing per-asset transport design,
expanded from the old six-receipt demonstration to all 60 Showcase receipts.
Schema registration is a separate, one-time transaction if the schema is absent.

## Actual state on 10 September 2026

The production inventory contains 60 Showcase receipts, 12 per asset. All 60
payload digests, frozen identities, revisions, projection paths and dates were
checked. No attestations exist yet. The schema is absent on both Base mainnet
and Base Sepolia. No signer is configured. No blockchain or Firestore write was
performed while preparing the unsigned plans.

The operator still needs to select the network and sign the transactions with a
funded wallet. A prepared plan is not evidence of issuance. The site's badges
must remain unissued until verification succeeds.

## Prepare and sign

Run the read-only preparation against the already-public production inventory:

```sh
node scripts/prepare-live-showcase.mjs --output=/absolute/review-directory
```

It emits separate `showcase-8453-unsigned.json` and
`showcase-84532-unsigned.json` files. Inspect the network, receipt identities,
schema registration call and five grouped transaction calls before signing.
These files contain public receipts and unsigned calldata, never private keys.

Use the selected network's wallet to simulate/estimate and sign registration
first, if needed. Then simulate and inspect the total fee for each per-asset
submission before signing. Base total cost includes L1 data fees as well as L2
execution. A fee estimate made before schema registration cannot establish the
exact `multiAttest` cost. Record each returned transaction hash immediately.
If interrupted, recover that transaction before resubmitting; never issue a
second transaction merely because a local command stopped.

The original `eas-showcase.mjs` remains a six-receipt Sepolia fixture tool. It
must not be used to issue this full production-inventory cohort.

## Verify before publication

After all five asset transactions have at least three confirmations:

```sh
node scripts/sync-live-showcase-proofs.mjs \
  --plan=/absolute/review-directory/showcase-8453-unsigned.json \
  --attester=0xPUBLIC_SIGNER_ADDRESS \
  --transactions=0xHASH1,0xHASH2,0xHASH3,0xHASH4,0xHASH5 \
  --project=oflapp-prod --output=/absolute/review-directory/verified-proofs.json
```

This first run is read-only in Firestore and never signs a transaction. It
checks the actual RPC chain, EAS contract, sender, zero transaction value,
complete calldata, successful receipt, individual events, all 60 ABI payloads,
schema, attester, recipient, reference UID, block timestamps, non-revocable
status and absence of expiry or revocation. It then checks the current stored
receipt payloads, projections and permanent forecast bindings.

After reviewing that report, run the same command with `--apply` and
`OFR_CONFIRM_FIRESTORE_PROJECT=oflapp-prod`. All 60 proof records and receipt
envelopes are updated in one Firestore transaction. Existing proof conflicts
abort the operation. The `receiptPayload`, `public_forecast_revisions`, and
permanent resolvers are never written. The operation is repeatable for the
same already-verified proofs. Staging requires its own digest parity check;
never assume the environments contain identical receipts.

## Display the result

1. Materialize an isolated catalog generation and verify it before activation,
   following `CATALOG_PUBLICATION_AND_RECOVERY.md`. Catalogs overlay the verified
   public proof records onto frozen forecasts without mutating those forecasts.
2. Copy the verified output to iPulse UI's
   `src/data/forecast-library-proofs.json` through its reviewed release process.
   Entries are keyed by permanent forecast public ID. Do not populate that file
   with planned or invented IDs.
3. Verify all 60 receipt pages and their EAS links. Each iPulse asset ledger must
   display 12/12 forecasts anchored and one shared transaction link. Check both
   environments and then production after release.
4. Keep the network visible: Base mainnet and Base Sepolia testnet are distinct.
   Retrospective anchoring establishes existence by the later blockchain time;
   it does not prove the original forecast date, authorship, or accuracy.

## Primary network references

- [Base network parameters](https://docs.base.org/get-started/connect-to-base)
- [Official Base EAS deployment](https://github.com/ethereum-attestation-service/eas-contracts/blob/master/deployments/base/EAS.json)
- [Official Base SchemaRegistry deployment](https://github.com/ethereum-attestation-service/eas-contracts/blob/master/deployments/base/SchemaRegistry.json)
