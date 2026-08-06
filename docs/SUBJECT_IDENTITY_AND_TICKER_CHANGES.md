# Subject identity and ticker changes

Ticker symbols, venue codes, instrument names, and public URL slugs are not
permanent financial-instrument identities. OFR keeps these concerns separate.

## Identity model

- `receiptPayload.forecast.subject.id` is the issuer-stable subject identity.
  It must not change merely because a ticker, venue, name, or URL changes.
- `receiptPayload.forecast.subject.identifiers` is the point-in-time identifier
  bundle applicable to the immutable forecast. The forecast creation and market
  anchor timestamps give the temporal context for that snapshot.
- A ticker plus MIC identifies a listed instrument at a venue at a point in
  time. ISIN, FIGI, CAIP, or other identifiers may be included where available,
  but no single scheme is universal for every asset class.
- The compact onchain `subjectRef` is an inspectable locator. The payload digest
  binds the complete stable subject identity and identifier bundle.

## Change procedure

When an issuer or instrument changes ticker or venue:

1. Do not edit, reseal, or re-attest historical receipts.
2. Update the separate current subject registry with the new identifier, its
   effective time, source, and the prior identifier as an alias.
3. New receipts use the same stable `subject.id` when economic identity is
   continuous, but snapshot the new point-in-time identifier bundle.
4. Keep the existing public route slug when practical. Add old and new names or
   symbols as redirect aliases rather than making ticker the route key.
5. Create a new stable subject identity for a genuinely different instrument,
   such as a new share class or successor security, and record its relationship
   to the predecessor separately.

The Phase 1 application follows this rule: `pepsi`, `nvidia`, `alphabet`,
`bitcoin`, and `spy` are navigation slugs; `PEP`, `NVDA`, `GOOG`, `BTC`, and
`SPY` are display symbols; each receipt carries its own stable iPulse subject ID
and point-in-time identifier bundle.
