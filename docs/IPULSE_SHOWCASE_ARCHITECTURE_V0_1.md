# iPulse AI public forecast showcase architecture v0.2

Date: 2026-08-12  
Status: active  
Monthly fixed-cost target: less than USD 9

The iPulse AI showcase is the first curated collection inside Open Forecast
Library. It is not file-based at runtime. The React application reads public
subjects, forecast indexes, full receipts, and proof metadata from Cloud
Firestore.

The reviewed JSON examples in `src/data/fixtures/` are retained as test vectors
and as the controlled source for the initial import. They are not imported by
the production UI bundle and are not the deployed database.

Current scope:

- five public iPulse AI subjects;
- twelve individual AI-forecaster receipts per subject;
- sixty public receipts in total;
- six private proof jobs selected by a declared non-performance rule;
- anonymous browsing and client-side integrity verification;
- public submissions requested through `support@ipulseai.com`;
- no public accounts, payments, private customer storage, or automated uploads.

Runtime path:

```text
Firebase Hosting -> React Explorer -> Firestore public_* collections
                                  -> Base RPC only when proof UID exists
```

Publication path:

```text
iPulse AI immutable public publication
  -> sanitized OFR adapter
  -> schema validation
  -> RFC 8785 canonicalization + SHA-256
  -> create-only Firestore publication
  -> optional private proof job
  -> EAS on Base
  -> verified UID and transaction stored in Firestore
```

For the complete data model, wallet security, lifecycle, budget, and local test
commands, see
[`OPEN_FORECAST_LIBRARY_ARCHITECTURE_V0_1.md`](./OPEN_FORECAST_LIBRARY_ARCHITECTURE_V0_1.md).
