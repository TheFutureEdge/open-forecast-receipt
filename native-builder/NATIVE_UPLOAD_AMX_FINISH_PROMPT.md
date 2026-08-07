# Native AMx finishing prompt after Code-folder upload

Paste this as a new message in the existing Native Builder project after
uploading the generated `upload-ready` contents into the Code panel root.
Confirm that `package.json`, `src/`, and `public/` are at the root rather than
nested below an `upload-ready/` directory. Do not paste the earlier Product
Architect prompt again.

```text
Continue the existing Open Forecast Receipt project. The files now present in
the Code volume are the reviewed continuation of the application that
originated in this same Native project. Treat the uploaded package.json,
package-lock.json, Vite configuration, public/, and src/ as the authoritative
implementation for this finishing pass.

Do not reconnect or request GitHub access. Do not issue blockchain
transactions, register an EAS schema, add a wallet flow, fabricate attestation
UIDs, replace receipt digests, regenerate fixture data, or alter the OFR JSON
Schema. Base Sepolia issuance is performed separately by the reviewed local
maintainer tooling.

First inspect the uploaded source and summarize what materially changed from
the prior Native version. Then make only compatibility or usability fixes that
are necessary inside Native. Preserve these invariants exactly:

1. Five public Batch 6 assets and 60 individual advisor receipts.
2. One individual forecast equals one OFR document and one future EAS UID.
3. Six role-based showcase selections across all five assets; PepsiCo has two.
4. The immutable receiptPayload is separate from the mutable proofEnvelope.
5. RFC 8785 plus SHA-256 digests and all fixture digests remain byte-stable.
6. The 17-field non-revocable Base Sepolia EAS schema and deterministic schema
   UID remain unchanged.
7. Asset pages show a real receipt ledger with a Blockchain proof column.
   Selected but unissued rows are honest; unselected rows make no proof claim;
   real EAS and transaction links appear only when real UIDs exist.
8. Forecast time, publication time, retrospective receipt time, and blockchain
   time remain distinct. Blockchain proves integrity/timestamp, not accuracy.
9. Stable asset identity remains separate from point-in-time ticker/MIC and URL
   aliases.
10. No credentials, raw model request/response payloads, hidden chain-of-thought,
    private forecasts, paid data, or production APIs are added.

Run the exact dependency install, TypeScript/build checks, and deterministic
tests available in the project. The expected local baseline before this Native
pass is 32 passing tests and a successful Vite production build. Exercise at
least these routes in preview:

- /manifest/batch-6
- /manifest/batch-6/assets/pepsi
- /manifest/batch-6/assets/nvidia
- /manifest/batch-6/assets/bitcoin
- /manifest/batch-6/assets/alphabet
- /manifest/batch-6/assets/spy
- /receipts/85e82d474841f0497fb7f6fcb0a7fec7ce808de9779ff69eff32a6b6560ea4a5
- /standards

Verify responsive layout, horizontal keyboard-scroll access for the receipt
ledger, direct receipt navigation, the canonical batch-and-asset links, full
JSON, path reconstruction, integrity PASS, one-step tamper FAIL, and the honest
no-attestation state. The app must remain compatible with both Native's root
hosting and the optional `/tools/open-forecast-receipt/` first-party base path.
Do not replace the ledger with cards or a landing-page-only demo.

When complete, report every file changed, every test/build command and result,
remaining limitations, and whether the app is ready for the Native QA Agent.
Then stop and ask me to switch to QA Agent; do not silently start another large
redesign.
```
