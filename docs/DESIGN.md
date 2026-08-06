# Report design

## Audience and decision

This report is for the iPulse AI product owner and implementers deciding how each independent advisor forecast inside a forecast-ledger row becomes its own onchain object, what the object contains, and whether a credible prototype fits the AI Factory hackathon.

## Narrative sequence

1. Correct the entity definition: the 12 advisor paths are forecasts; consensus is a derived average.
2. Ground the design in the actual PepsiCo Batch 6 revision 2 publication and one exact Ray Dalio advisor forecast.
3. Separate forecast identity from transport: 12 advisor UIDs in one native asset-level `multiAttest`, with a deterministic 6 + 6 fallback only if exact gas estimation requires it.
4. Compare all 20 raw quarterly steps with five annual checkpoints and quantify the very small byte saving from subsampling.
5. Specify the broad OFR Core, Market and optional AI profiles, then map the full JSON into a compact market-specific EAS projection.
6. Explain Hubverse output semantics and market identifiers as established standards iPulse AI can adopt through additive exports.
7. Translate 12 independent UIDs into the current batch ledger and AI Forecasts advisor reports.
8. Close with the locked five-public-asset Phase 1 scope, exact five-dollar fee gate, native.builder/Codex boundary, 12-hour hackathon plan, and proof limitations.

## Visual plan

- The exact Ray Dalio step sequence is stated directly and retained in a complete public-safe JSON fixture.
- One cost table compares the five-asset cohort under representative Base gas prices; adjacent narrative states that it excludes exact L1 fees and unmeasured batching savings.
- A reproducible executed notebook validates the digest, path, byte ceilings, batching comparison, and cost sensitivity.
- Compact prose and linked JSON artifacts preserve all field values without introducing wide report tables.
- No decorative KPI strip is used because this is a product architecture decision, not an operating scorecard.

## Evidence and caveats

Production Firestore was inspected read-only. Only a public-safe normalized example is retained beside the report. Current Base transactions provide observed cost anchors; they are not a fee quote. The report consistently separates integrity proof from accuracy proof and public-showcase content from paid forecast content.
