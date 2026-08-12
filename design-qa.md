# Open Forecast Receipt visual QA

## Selected visual target

The redesign follows the light, database-style product language shown in the generated demo video while retaining the real Open Forecast Receipt data and verification behavior.

- Manifest reference: `submission/video-build/veo-product-demo-output/audit/01-generated-manifest.png` (1280 × 720)
- Forecaster ledger reference: `submission/video-build/veo-product-demo-output/audit/02-generated-predictor-ledger.png` (1280 × 720)
- Receipt reference: `submission/video-build/veo-product-demo-output/audit/03-generated-receipt.png` (1280 × 720)
- Tamper-failure reference: `submission/video-build/veo-product-demo-output/audit/04-generated-fail.png` (1280 × 720)

## Implemented surfaces

- Light database-style navigation shell with icon rail, product sidebar, global navigation, and compact disclaimer.
- Searchable five-asset manifest using real brand icons, coverage counts, receipt counts, and proof states.
- Two-pane asset workspace with real iPulse AI forecaster portraits and an interactive receipt selector.
- Receipt summary organized around target, creation time, horizon, issuance mode, reconstructed path, percentage returns, and knowledge boundaries.
- Plain-language verification panel separating local integrity from optional blockchain proof.
- Interactive tamper sandbox that switches from PASS to FAIL when a sealed percentage changes and returns to PASS after reset.

## Comparison evidence

- Manifest comparison: `design-qa-artifacts/comparison-manifest.png`
- Forecaster workspace comparison: `design-qa-artifacts/comparison-pepsi-workspace.png`
- Tamper-failure comparison: `design-qa-artifacts/comparison-tamper-fail.png`
- Final implementation screenshots:
  - `design-qa-artifacts/implementation-manifest-pass2-light.png`
  - `design-qa-artifacts/implementation-pepsi-final.png`
  - `design-qa-artifacts/implementation-tamper-fail-final.png`

## Iterations and fixes

1. Replaced the original dark table UI with the selected light product shell and brought the asset and forecaster hierarchy into the page.
2. Replaced text glyphs and emoji controls with Phosphor icons and copied the existing iPulse AI asset/persona images into the app.
3. Forced class-based dark mode so a dark operating-system preference cannot override the reference-light default.
4. Tightened the header stack so the selected forecaster, receipt controls, and start of the chart remain visible at 1280 × 720.
5. Replaced technical basis-point presentation with percentage labels and the plain-language target “End-of-day close price change.”
6. Restored the forecaster buttons' native accessibility role and verified selection, tampering, and reset behavior through the running UI.
7. Removed an unsupported “live proof” count from the manifest and report the six proof-ready selections instead.

## Functional checks

- Production build: passed
- Test suite: 32/32 passed
- Forecaster selection: passed (Elon Musk → Michael Burry)
- Tamper verification: passed (PASS → FAIL → PASS)
- Asset search and forecaster search: rendered and interactive
- Responsive structure: desktop reference matched; mobile collapses the fixed side navigation

final result: passed
