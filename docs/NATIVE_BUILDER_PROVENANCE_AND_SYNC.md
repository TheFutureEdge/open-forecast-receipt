# Native Builder provenance and synchronization

Status: active hackathon compliance record

## Native origin

- Native Builder project ID: `9b5dc37e-f409-4f5e-9206-b20d752313a5`
- Export filename: `New-Project-source-code (3).zip`
- Export SHA-256: `dc4348bf79248afa1cc52efa8f19cb78acae2292e32f52c8da7b3d381d9e1683`
- Imported into this dedicated repository: 2026-08-06
- Imported application surface: Vite/React UI, manifest and receipt routes,
  deterministic verification modules, EAS modules, tamper sandbox, fixtures,
  and tests.

The export did not contain Git metadata. This directory was initialized as a
dedicated local Git repository after import. No commit, remote publication, or
deployment was performed as part of the import.

## Event requirement

The official AI Factory event page requires a functional deployed application
built primarily with Native Builder, meaningful use beyond a landing page, a
Native project or application URL, and a written explanation of how Native was
used. It lists applications built primarily outside Native Builder as
ineligible.

Official event page:
`https://lablab.ai/ai-hackathons/nativebuilder-build-without-limits`

## Required synchronization workflow

1. Native Builder remains the application-generation and final deployment
   environment.
2. Local work may inspect, test, validate data, prepare exact patches, and
   identify security or correctness defects.
3. Record material local changes in `docs/NATIVE_SYNC_CHANGELOG.md`.
4. Pull every material application change from the canonical public GitHub
   repository into the same Native project.
5. Run the Native Builder and QA flow after synchronization.
6. Commit Native-origin changes to an explicit integration branch or download
   the resulting export and compare the material files and tests with this
   repository. Do not overwrite `main` without review.
7. Use the Native-hosted public application and Native project URL in the
   hackathon submission.

Local-only research notebooks, source-data extraction scripts, standard-design
notes, and private iPulse integration adapters do not replace the Native-built
application and need not be exposed as Native-generated UI code.

## Current synchronization path

- Canonical repository:
  `https://github.com/TheFutureEdge/open-forecast-receipt`
- Native project: `9b5dc37e-f409-4f5e-9206-b20d752313a5`
- Prompt: `native-builder/NATIVE_GITHUB_SYNC_PROMPT_V03.md`

The GitHub repository contains the audited application source, canonical
schema, canonical PepsiCo example, all 60 Phase 1 receipt/projection fixtures,
tests, research evidence, and synchronization documentation. Generated ZIP
handoffs, Git metadata, dependencies, build output, and private source extracts
are not part of the public repository.
