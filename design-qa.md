# Open Forecast Library visual QA history

## Receipt explorer redesign

### Selected visual target

The redesign follows the light, database-style product language shown in the generated demo video while retaining the real Open Forecast Receipt data and verification behavior.

- Manifest reference: `submission/video-build/veo-product-demo-output/audit/01-generated-manifest.png` (1280 × 720)
- Forecaster ledger reference: `submission/video-build/veo-product-demo-output/audit/02-generated-predictor-ledger.png` (1280 × 720)
- Receipt reference: `submission/video-build/veo-product-demo-output/audit/03-generated-receipt.png` (1280 × 720)
- Tamper-failure reference: `submission/video-build/veo-product-demo-output/audit/04-generated-fail.png` (1280 × 720)

### Implemented surfaces

- Light database-style navigation shell with icon rail, product sidebar, global navigation, and compact disclaimer.
- Searchable five-asset manifest using real brand icons, coverage counts, receipt counts, and proof states.
- Two-pane asset workspace with real iPulse AI forecaster portraits and an interactive receipt selector.
- Receipt summary organized around target, creation time, horizon, issuance mode, reconstructed path, percentage returns, and knowledge boundaries.
- Plain-language verification panel separating local integrity from optional blockchain proof.
- Interactive tamper sandbox that switches from PASS to FAIL when a sealed percentage changes and returns to PASS after reset.

### Comparison evidence

- Manifest comparison: `design-qa-artifacts/comparison-manifest.png`
- Forecaster workspace comparison: `design-qa-artifacts/comparison-pepsi-workspace.png`
- Tamper-failure comparison: `design-qa-artifacts/comparison-tamper-fail.png`
- Final implementation screenshots:
  - `design-qa-artifacts/implementation-manifest-pass2-light.png`
  - `design-qa-artifacts/implementation-pepsi-final.png`
  - `design-qa-artifacts/implementation-tamper-fail-final.png`

### Iterations and fixes

1. Replaced the original dark table UI with the selected light product shell and brought the asset and forecaster hierarchy into the page.
2. Replaced text glyphs and emoji controls with Phosphor icons and copied the existing iPulse AI asset/persona images into the app.
3. Forced class-based dark mode so a dark operating-system preference cannot override the reference-light default.
4. Tightened the header stack so the selected forecaster, receipt controls, and start of the chart remain visible at 1280 × 720.
5. Replaced technical basis-point presentation with percentage labels and the plain-language target “End-of-day close price change.”
6. Restored the forecaster buttons' native accessibility role and verified selection, tampering, and reset behavior through the running UI.
7. Removed an unsupported “live proof” count from the manifest and report the six proof-ready selections instead.

### Functional checks

- Production build: passed
- Test suite: 32/32 passed
- Forecaster selection: passed (Elon Musk → Michael Burry)
- Tamper verification: passed (PASS → FAIL → PASS)
- Asset search and forecaster search: rendered and interactive
- Responsive structure: desktop reference matched; mobile collapses the fixed side navigation

Result: passed

---

## Forecast target explainer and interactive knowledge graph

- Source visual truth: `/private/tmp/ofl-design-qa/source-staging-entities.png`
- Implementation screenshot: `/private/tmp/ofl-design-qa/implementation-local-entities.png`
- Interactive graph screenshot: `/private/tmp/ofl-design-qa/implementation-local-knowledge-graph.png`
- Side-by-side comparison: `/private/tmp/ofl-design-qa/entities-comparison.png`
- Viewport: 1280 × 720 CSS pixels, light theme, desktop entity catalog
- Capture pixels: 1274 × 717 for both source and implementation, device scale factor 1; no density normalization required
- State: anonymous public catalog, Firestore-backed entity data loaded

## Full-view comparison evidence

The deployed staging capture and the local implementation were joined into one equal-size comparison image. The implementation intentionally moves the forecast-target explanation above the browsing hero, replaces the generic headline with the visible FAQ question, adds named relationships, and makes Schema.org types visually distinct. Navigation, catalog density, page width, typography family, and the existing blue/emerald visual language remain consistent with the source.

## Focused region evidence

The knowledge-graph canvas was captured separately because its node and edge labels are too small to judge in the full catalog screenshot. The final capture shows readable custom nodes, labeled directed edges, optional-proof styling, zoom controls, a minimap, and a selected-node detail panel.

## Findings

- No P0, P1, or P2 findings remain.
- Fonts and typography: existing application font, weights, hierarchy, and small-label tracking are preserved; the new FAQ heading matches the established display hierarchy.
- Spacing and layout rhythm: the FAQ and example diagram form one coherent top section; cards align to equal heights at the tested desktop breakpoint.
- Colors and visual tokens: the existing navy, blue, and emerald palette is preserved. Schema.org types use one high-contrast orange badge treatment everywhere they appear in the updated diagrams and entity identity panel.
- Image quality and asset fidelity: no raster assets were introduced; existing Phosphor icons and governed entity logos remain unchanged.
- Copy and content: the visible answer matches the embedded `FAQPage` JSON-LD. Relationships are named, and the entity, target, receipt, proof, and evaluation concepts remain distinct.

## Comparison history

1. First graph render compressed nine nodes into a long horizontal row, making labels too small. The graph was reorganized into a compact three-column layout and recaptured; labels are readable in the final evidence.
2. First semantic-tag render allowed the Schema.org badge to stretch across the card. The badge now uses content width with bounded truncation and a full-value tooltip. `GovernmentOrganization` truncates at constrained widths without changing card height.
3. Relationship connectors originally had no textual meaning. Each example branch now names its predicate, while the full React Flow view exposes all directed edge labels.

## Primary interactions tested

- Entity search filters the public Firestore-backed catalog and clears correctly.
- Selecting the Open Forecast Receipt node updates the graph detail panel.
- The interactive graph exposes pan, zoom, fit-view, minimap, draggable nodes, and reset-layout controls.
- Browser console contains no runtime errors.
- The forecast-target page injects one valid `FAQPage` JSON-LD object whose question and answer match the visible copy.

## Follow-up polish

- P3: capture a separate narrow-phone visual pass before a later public release; responsive stacking and bounded tag truncation are implemented, but this QA pass used the desktop browser viewport.

## Final result

final result: passed
