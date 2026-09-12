# Base Sepolia six-receipt showcase runbook

Current operations start at the root [Publication Operating Guide](../PUBLICATION_GUIDE.md). This document retains the detailed contract or historical evidence; the root guide governs the current execution sequence.

Status: ready for reviewed execution; no write has been authorized or performed

## Outcome

The Phase 1 execution uses two Base Sepolia transactions:

1. Register the non-revocable 17-field OFR EAS schema.
2. Call EAS `multiAttest` once with six records.

The second transaction emits six independent `Attested` events and creates six
independent attestation UIDs. The transaction is only transport batching; it
does not create a batch-level receipt or hide the individual forecasts.

Current deterministic identifiers and sizes:

- EAS: `0x4200000000000000000000000000000000000021`
- SchemaRegistry: `0x4200000000000000000000000000000000000020`
- expected schema UID:
  `0xfef3868c279700c5312e68d8f5be4cd4a755a5125c3d2153f1970b626e35cc14`
- six ABI-encoded attestation payloads: 6,368 bytes total
- `multiAttest` calldata: 8,100 bytes
- current read-only registration gas estimate: 340,058 gas

The schema is not registered as of the latest checked preflight. Exact
`multiAttest` gas becomes estimable after registration. Base Sepolia uses test
ETH; the later Base mainnet cost gate is a separate production decision.

## Safety prerequisites

- Use a newly dedicated Base Sepolia wallet with no mainnet assets.
- Never paste its private key into chat, Native Builder, source code, a GitHub
  issue, or a committed file.
- Fund the address with Base Sepolia test ETH from a reputable faucet.
- Set `OFR_ATTESTER_ADDRESS` first if you want preflight to show the wallet
  balance without placing the private key in the environment yet.
- Copy `.env.example` to ignored `.env.local` and enter the testnet key only
  there, or export it in a private terminal session.
- Keep the network at chain ID `84532`. These scripts reject any other chain.
- Obtain explicit approval immediately before each write command.

Two independent gates prevent accidental writes: the command needs `--submit`
and `.env.local` must contain:

```text
OFR_ALLOW_BASE_SEPOLIA_WRITE=I_UNDERSTAND_THIS_WRITES_TO_BASE_SEPOLIA
```

## 1. Verify the local release

```bash
npm ci
npm test
npm run build
npm audit --audit-level=high
```

## 2. Run the read-only preflight

```bash
npm run eas:preflight
```

Confirm all of the following:

- Base Sepolia chain ID is 84532;
- both official EAS contracts have bytecode;
- six unique selected receipt digests validate;
- the computed schema UID matches the configured UID;
- signer address and test ETH balance are correct, if configured;
- no write was performed.

## 3. Register the schema

Only after explicit approval:

```bash
npm run eas:schema:register -- --submit
```

The script simulates first, asserts the returned UID, sends one transaction,
waits for confirmation, checks the `Registered` event, and writes the public
receipt to:

```text
artifacts/base-sepolia/schema-registration.json
```

Re-run `npm run eas:preflight`. It should report `registered: true` and provide
an exact six-receipt `multiAttest` gas estimate. Review that estimate and the
wallet balance before continuing.

## 4. Issue six independent forecast attestations

Only after a second explicit approval:

```bash
npm run eas:showcase:issue -- --submit
```

The script simulates first, submits one `multiAttest`, requires exactly six
`Attested` events, reads every UID back from the official EAS contract, compares
the complete ABI bytes, and writes:

```text
artifacts/base-sepolia/batch6-showcase-attestations.json
```

If the command is interrupted after transaction submission, do not blindly
resubmit. The script writes a local issuance-intent artifact before submission
and records the transaction hash immediately after the wallet accepts it.
Recover that transaction from the intent file, wallet, or explorer and inspect
its six events first; duplicate attestations would have different UIDs.

## 5. Verify and synchronize public metadata

```bash
npm run eas:showcase:verify
export OFR_PUBLIC_EXPLORER_BASE_URL=https://ipulseai.com/tools/open-forecast-receipt
npm run eas:showcase:sync
npm test
npm run build
```

`sync` performs no blockchain write. It updates only the six proof envelopes,
six compact projections, catalog proof pointers, manifest counts, and the
canonical PepsiCo example after rereading and verifying all UIDs onchain. The
sealed `receiptPayload` and its SHA-256 digest do not change.

It also creates the five-asset, compact iPulse catalog handoff at:

```text
artifacts/base-sepolia/ipulse-catalog-open-forecast-receipts.json
```

Review the public explorer base URL in that artifact before using the iPulse
publication pipeline's transactional
`patch_open_forecast_receipts_catalog_v2` writer. Run that writer in dry-run
mode first. A blockchain sync does not itself authorize a Firestore write.

From the `ipulse_scripts` environment, the dry-run entry point is:

```bash
python data_engineering/dp_to_papp_pipelines/oracle_fincore_prediction_market/apply_open_forecast_receipt_catalog_handoff.py \
  --env staging \
  --input-file /absolute/path/to/ipulse-catalog-open-forecast-receipts.json
```

`--apply` is required for any write. A production apply also requires the exact
second confirmation phrase printed by the command's help/error path.

## 6. Human verification

For every selected receipt:

- open its EASScan UID link;
- open the shared Base Sepolia transaction;
- confirm schema UID, attester, non-revocable state, and block time;
- open the OFR receipt page and require local integrity `PASS` plus chain
  `verified`;
- change one forecast step in the tamper sandbox and require integrity `FAIL`;
- confirm UI copy says retrospective and does not imply forecast accuracy.

## 7. Publication boundary

Commit/push, hosting, Native upload, iPulse AI catalog writes, and Base mainnet
issuance are separate actions requiring their own review. Base Sepolia success
does not authorize any of them automatically.

## Primary references

- Base network parameters:
  `https://docs.base.org/base-chain/quickstart/connecting-to-base`
- EAS official contract repository and deployment artifacts:
  `https://github.com/ethereum-attestation-service/eas-contracts`
- Base Sepolia EAS explorer:
  `https://base-sepolia.easscan.org/`
- EAS SDK multi-attestation example:
  `https://github.com/ethereum-attestation-service/eas-sdk`
