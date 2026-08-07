# AI Factory submission and native.builder build brief

Date: 2026-08-05  
Project working title: **Open Forecast Receipt Explorer**  
Team/product: Future Edge Group / iPulse AI

> **Phase 1 scope lock (2026-08-05):** the hackathon covers only the five existing public assets and Batch 6. Any earlier 7 + 8, 15-asset, consensus-receipt, or leaderboard expansion is deferred. The authoritative start instructions and corrected fixture values are in `PHASE_1_HACKATHON_START.md`; the exact first prompt is in `../native-builder/native_builder_product_architect_prompt.txt`.

## Enrollment and acceptance

The logged-in lablab.ai event flow displayed **You already enrolled to this event**. No separate idea pitch or approval gate was found. This is an open build-and-submit event: the practical gates are participant/team setup, eligibility, and a complete final submission.

Complete before building:

- finish the lablab.ai participant profile with a clear bio, role, skills, location/time zone, profile image, and relevant iPulse AI/Future Edge links;
- connect the event Discord if the profile prompts for it;
- create or join a team, even for a solo submission, and make Russlan Ramdowar the team leader;
- create/sign in to native.builder separately;
- activate the event's native.builder plan with the event code shown on the official page;
- confirm the account-specific deadline and submission button in the logged-in event view.

No external API credit should be redeemed until the team chooses between AI/ML API and Featherless AI; the event says those two alternatives cannot both be claimed by the same team.

## Required final submission

The event-specific page requires:

- functional deployed application built primarily with native.builder;
- clear problem description;
- defined target user;
- written explanation of how native.builder was used;
- demonstration video no longer than three minutes;
- at least one complete end-to-end workflow shown in the video;
- native.builder project/application URL;
- functional public application URL;
- list of external APIs, datasets, and tools;
- project created during the event and accessible to judges.

Judging dimensions are application of technology, presentation, business value, and originality.

Recommended but not explicitly mandatory on the event-specific page:

- public GitHub repository with license and README;
- five-slide mini deck;
- architecture diagram;
- schema/specification page;
- 30–60 second backup screen recording or GIF;
- issue list identifying what is testnet/demo versus production-ready.

Official sources: [event page](https://lablab.ai/ai-hackathons/nativebuilder-build-without-limits), [lablab guide](https://lablab.ai/guide), and [hackathon guidelines](https://lablab.ai/ai-articles/hackathon-guidelines).

## Submission copy draft

### Title

Open Forecast Receipt Explorer

### One-line description

An open standard and verifier that turns AI forecasts into readable, tamper-evident receipts with independent Base attestations.

### Problem

Forecasts are routinely edited, summarized, or evaluated after the fact, yet users rarely receive a portable record of exactly what was predicted, when it was produced, who or what produced it, and whether the historical claim has changed. A raw hash is difficult for ordinary users to inspect, while putting every large source document onchain is expensive and inflexible.

### Target user

Investors, researchers, forecasting platforms, model evaluators, journalists, auditors, and product teams that need to inspect and independently verify historical forecasts.

### Solution

Open Forecast Receipt separates a complete standards-based JSON receipt from a compact onchain projection. The application displays 60 real, sanitized individual advisor forecasts across five public assets; reconstructs every 20-step path; decodes each independent Base Sepolia attestation when present; verifies the full-receipt digest; and proves that a one-step edit fails verification. The initial retrospective onchain showcase declares six receipts across all five assets without using forecast outcomes.

### Business value

The same pattern supports auditable market research, model benchmarking, correction lineage, performance leaderboards, and portable trust infrastructure for any forecasting platform. iPulse AI can add it after public forecast publication without blocking or rewriting its production pipeline.

### Originality

The project combines established forecast semantics, provenance, canonical JSON integrity, market identifiers, and native EAS attestations into a coherent cost-aware receipt. It preserves one UID per forecast while batching operational transport per asset.

### How native.builder was used

native.builder's Product Architect scopes the product and application architecture. Its Builder agents create and iterate the React application, receipt explorer, verification workflow, responsive UX, integrations, and public deployment. The functional application originated in the Native project; reviewed local corrections return to the same project through Native's Code-folder upload and are rechecked by Builder and QA. The Native GitHub App is intentionally not granted organization-wide repository access.

### External tools and data

- Ethereum Attestation Service SDK and public Base Sepolia EAS data;
- Base Sepolia RPC / Blockscout or EAS explorer links;
- sanitized public-safe Batch 6 fixtures for the five existing public iPulse AI assets, beginning with the complete PepsiCo vertical slice;
- Open Forecast Receipt JSON Schema and RFC 8785 digest vectors;
- optional Supabase for cached testnet proof metadata;
- optional Featherless AI or AI/ML API only for assisted legacy-schema mapping, never for the deterministic integrity result.

## First Product Architect prompt

Use the complete, corrected prompt in `../native-builder/native_builder_product_architect_prompt.txt`. It is intentionally stored as a separate uploadable file so native.builder receives the exact five-asset Phase 1 scope, v0.1.0 fields, retrospective-timing rules, and credit-aware implementation boundary. Do not use an earlier shortened inline prompt.

## Builder implementation prompt

After reviewing Product Architect output, use:

```text
Implement the approved Open Forecast Receipt Explorer PRD now. Build the complete happy path first with the uploaded PepsiCo fixture. Use one design system, responsive layouts, accessible labels, and explicit loading/empty/error states. Keep receipt digest verification deterministic. Treat the asset-level transaction hash as transport metadata and each EAS attestation UID as the forecast proof identity. Add no production credentials, mainnet writes, portfolio advice, trading actions, or paid data.
```

## Acceptance criteria

- Home or manifest opens without authentication and shows the five named public assets.
- PepsiCo Batch 6 shows exactly 12 individual advisor forecasts.
- Each asset shows an individual receipt ledger with a stable receipt route and Blockchain proof column.
- Exactly six role-based showcase receipts are declared across all five assets; a shared `multiAttest` transport still yields one UID per receipt.
- Ray receipt shows anchor 144.22 USD, 20 returns, three-month cadence, `partially_sell`, and terminal reconstructed value near 180.6052 USD.
- Full PepsiCo/Ray receipt digest equals `ce5e747edf89a34e92710e4306bb9a89224714130b68c4be0b49aad7486e13c9`.
- Onchain projection shows 17 explicit fields and EAS protocol metadata separately.
- `-400` is displayed as `-4.00%`, never `-0.40%`.
- Verification reports pass for the untouched fixture.
- Changing one basis-point value causes digest verification to fail.
- UI states that integrity does not prove accuracy.
- Base Sepolia is clearly labeled testnet.
- Application works at mobile and desktop widths.
- Public deployment opens for an unauthenticated judge.
- Source is synchronized to a public MIT-compliant repository.
- The entire demo workflow can be completed in under 150 seconds.

## Native.builder versus Codex boundary

Native.builder must create and iterate the functional application, UX, workflows, integrations, and deployment. Codex supplies the product brief, standard/schema, sanitized fixtures, hash vectors, deterministic algorithms, review feedback, security checks, and submission materials. Codex should not create most of the app outside the platform and upload it, because that would put event eligibility at risk.

Native.builder capabilities used here:

- Product Architect for PRD and architecture;
- Builder agents for React application code;
- live preview and feedback iteration;
- file uploads for fixtures and schemas;
- Supabase/server functions if the project needs server-side caching or issuance;
- Code file/folder upload and source download;
- public `nativelyai.app` deployment.

Official documentation: [getting started](https://docs-builder.nativelyai.com/introduction/getting-started), [integrations](https://docs-builder.nativelyai.com/features/integrations), [Supabase](https://docs-builder.nativelyai.com/features/supabase), [GitHub Sync](https://docs-builder.nativelyai.com/features/github-sync), [files/download](https://docs-builder.nativelyai.com/features/files-and-download), [publishing](https://docs-builder.nativelyai.com/features/publish), and [BYOK providers](https://docs-builder.nativelyai.com/features/byok-providers).

## Twelve-hour schedule

### Session 1 — three hours

- create native.builder account/project and run Product Architect;
- upload schema, full receipt, onchain projection, and batch summary fixtures;
- build manifest, asset, 12-advisor list, and receipt-detail routes;
- verify mobile navigation and readable raw JSON.

### Session 2 — three hours

- implement path reconstruction and chart;
- implement deterministic canonicalization/digest comparison;
- implement full JSON versus onchain field comparison;
- add proof limitations and testnet labels.

### Session 3 — three hours

- connect/read 12 pre-issued Base Sepolia UIDs or load bundled decoded fallback;
- implement decoded proof state and direct explorer links;
- implement local tamper sandbox;
- run the complete workflow repeatedly.

### Session 4 — three hours

- responsive/accessibility/error-state QA;
- publish public application and optionally sync GitHub;
- create README, five-slide deck, three-minute video, and submission copy;
- verify unauthenticated access and submit.

## Three-minute demo script

1. **0:00–0:20 — problem:** historical forecasts are hard to verify; a hash alone is not understandable.
2. **0:20–0:45 — manifest:** PepsiCo Batch 6 has 12 advisor forecasts and 12 independent UIDs carried in one asset transaction.
3. **0:45–1:25 — receipt:** open Ray Dalio; show subject, model provenance, anchor, classification, and all 20 returns.
4. **1:25–1:55 — proof:** decode the EAS UID, compare the 17 onchain fields, reconstruct the path, and show digest PASS.
5. **1:55–2:20 — tamper:** edit one local return and show FAIL.
6. **2:20–2:40 — standard:** show OFR Core, Market, and optional AI profiles plus established-standard mappings.
7. **2:40–3:00 — value:** explain production insertion after public publication and the five-dollar five-public-asset policy.

## Optional five-slide deck

1. The trust problem with historical forecasts.
2. OFR: readable receipt plus compact independent onchain proof.
3. Live PepsiCo workflow and tamper detection.
4. Open standard, interoperability, and production architecture.
5. Business value, rollout, and call for implementers/reviewers.
