# Launch dependency security patch

Repository CI on `9ce4b1f` passed tests, TypeScript, and the production build,
but failed its dependency audit. The preceding `8d2280f` release also failed
the audit. This is a launch requirement, not optional feature work.

Commit `607ab46` updates:

| Dependency | Previous | Patched |
| --- | --- | --- |
| Next.js | 16.3.1 | 16.3.4 |
| Sharp (Next.js dependency) | vulnerable range below 0.35.4 | 0.35.4 |
| Vitest and its mocker | 4.1.10 | 4.1.11 |

The reported issues include the Next.js/Sharp AVIF image-processing advisory,
a Windows-hosted Next.js advisory, and the development-only Vitest mocker
advisory. Patch versions were selected explicitly; the audit threshold was not
weakened or bypassed.

Validation: all 96 deterministic tests, TypeScript, production build, and 28
readiness checks passed. `npm audit` reports zero vulnerabilities across all
dependencies. [CI for the patch](https://github.com/TheFutureEdge/open-forecast-receipt/actions/runs/34394023447)
completed successfully. Both staging and production are deployed from `607ab46`
and each passed all 33 public route checks with the existing catalog generation
active. The security patch changed no forecast identities or receipt payloads.

Advisories: [Next.js image processing](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4),
[Sharp](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c),
[Vitest mocker](https://github.com/advisories/GHSA-82fw-gwwq-j7x9).
