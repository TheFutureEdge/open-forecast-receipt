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
4. Generate the whitelisted Code payload with `npm run native:prepare-upload`
   and upload it into the same Native project's Code panel at project root.
5. Run the Native Builder and QA flow after synchronization.
6. Download the resulting final Native export and compare the material files
   and tests with this repository. Do not overwrite local source without
   review.
7. Use the Native-hosted public application and Native project URL in the
   hackathon submission.

Local-only research notebooks, source-data extraction scripts, standard-design
notes, and private iPulse integration adapters do not replace the Native-built
application and need not be exposed as Native-generated UI code.

## Current synchronization path

- Canonical repository:
  `https://github.com/TheFutureEdge/open-forecast-receipt`
- Native project: `9b5dc37e-f409-4f5e-9206-b20d752313a5`
- Upload generator: `npm run native:prepare-upload`
- Upload target: `native-builder/upload-ready/` (generated, ignored, disposable)
- Builder prompt: `native-builder/NATIVE_UPLOAD_AMX_FINISH_PROMPT.md`
- QA prompt: `native-builder/NATIVE_UPLOAD_QA_PROMPT.md`

Native's documented file workflow supports uploading a file or folder into the
Code panel while preserving folder structure. Its documented GitHub flow is
push-oriented, and its troubleshooting guidance says selected-repository GitHub
App installations should work. The live project nevertheless rejected the
correctly scoped one-repository installation and demanded `All repositories`.
That access expansion is not proportionate to this hackathon, so the GitHub App
is not part of the approved workflow.

Uninstalling or revoking the GitHub App does not delete this Native project or
the canonical GitHub repository. It only removes Native's access. The final
application remains Native-origin, returns to the same Native project for its
Builder and QA finishing passes, and uses the Native-hosted application/project
URLs for hackathon submission.

The GitHub repository contains the audited application source, canonical
schema, canonical PepsiCo example, all 60 Phase 1 receipt/projection fixtures,
tests, research evidence, and synchronization documentation. Generated ZIP
handoffs, Git metadata, dependencies, build output, and private source extracts
are not part of the public repository.
