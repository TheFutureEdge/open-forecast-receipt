# Open Forecast Library Next.js SSR migration plan

Status: proposed for approval. No migration or App Hosting backend creation has
started.

## Decision

Migrate the public Open Forecast Library UI from Vite to the Next.js App Router
and deploy it with Firebase App Hosting in `us-central1`.

Firestore remains the source of truth. Public pages will be rendered into HTML
on the server so their meaningful content, metadata, and structured data do not
depend on client-side JavaScript. Interactive features will remain small Client
Component islands.

The existing Firebase Hosting deployment stays live and unchanged until the
Next.js version passes the complete staging acceptance gate.

## Verified starting point

- Repository: `TheFutureEdge/open-forecast-receipt`
- Working branch: `staging`
- Current runtime: React 18 plus Vite 7
- Current public host: Firebase Hosting at `oflapp-staging.web.app`
- Staging database: Firestore Standard, Native mode, `us-central1`
- Firestore delete protection: enabled
- Current public collections used by the UI:
  - `public_entities`
  - `public_entity_relationships`
  - `public_forecast_collections`
  - `public_forecasts`
  - `public_forecasters`
  - receipt and manifest collections already used by the toolkit
- No Firebase emulator will be introduced. Local development will read the
  staging project through Application Default Credentials.

## Rendering policy

"SSR" here means that a crawler or browser receives useful HTML from the
server. It does not mean paying for a new Firestore query on every page view.

| Page type | Rendering | Freshness policy |
| --- | --- | --- |
| Landing and protocol pages | Server-rendered, cacheable | Rebuild/revalidate with releases |
| Entity, forecast, and forecaster catalogs | Server-rendered | Five-minute revalidation |
| Entity, forecaster, collection, and receipt details | Server-rendered | Five-minute revalidation |
| Integrity/tamper test | Server-rendered shell plus Client Component | Local interaction only |
| Future authenticated/editor screens | Dynamic server rendering | Never cached across users |

This produces indexable initial HTML while keeping Firestore reads and Cloud Run
work low. A five-minute maximum public-data delay is acceptable for the current
controlled publishing workflow. We can add authenticated on-demand cache
invalidation later if publication frequency warrants it.

## Target application structure

```text
src/
  app/
    layout.tsx
    page.tsx
    entities/
      page.tsx
      [stableSlug]/page.tsx
    forecasts/page.tsx
    forecasters/page.tsx
    showcase/[assetSlug]/page.tsx
    receipts/[digest]/page.tsx
    manifest/[collectionId]/page.tsx
    manifest/[collectionId]/assets/[assetSlug]/page.tsx
    standards/page.tsx
    test/page.tsx
    sitemap.ts
    robots.ts
    not-found.tsx
  components/
    server/
    client/
  lib/
    firebase/admin.ts
    firebase/client.ts
    library/server-repository.ts
    library/types.ts
    seo/json-ld.ts
```

The existing URLs remain valid. Compatibility routes such as `/assets/[slug]`,
`/showcase`, and `/receipts` will use explicit permanent or temporary redirects
only where they are aliases. Published receipt URLs will not change.

## Firestore access and security

1. Create a server-only Firebase Admin initializer using Application Default
   Credentials. No service-account JSON key is committed or uploaded.
2. Put public read queries in `server-repository.ts` and mark the module as
   server-only so it cannot enter the browser bundle.
3. Limit the App Hosting runtime service account to the minimum Firestore read
   permissions needed by the public site. Firebase Admin/server SDK calls bypass
   Firestore Security Rules, so IAM becomes the enforcement layer for these
   server reads.
4. Never accept an arbitrary collection name, document path, or query field from
   a request. Every query is a typed, allowlisted repository method.
5. Keep the browser Firebase SDK only for a feature that genuinely needs direct
   client access. The current public catalogs and detail pages do not need it.
6. Remove production fixture fallback behavior. Test fixtures remain test-only;
   a production data error must be visible and logged instead of silently serving
   a stale file.

## Exact migration sequence

### Gate 0 - preserve the Vite baseline

1. Finish and approve the current Forecasters catalog change.
2. Commit that tested Vite baseline on `staging` only after explicit approval.
3. Record the commit SHA and create a migration branch from it.
4. Keep the existing Firebase Hosting deployment untouched throughout the port.

Rollback at this stage is simply the known Vite commit and current live host.

### Gate 1 - introduce Next.js without deleting the old app

1. Pin an App Hosting-supported stable Next.js release and its compatible React
   release.
2. Add Next.js scripts while temporarily retaining `dev:vite` and `build:vite`.
3. Replace the Vite-specific Tailwind integration with the supported PostCSS
   integration for Next.js.
4. Add `next.config.ts`, `postcss.config.mjs`, `src/app/layout.tsx`, global styles,
   and a minimal home route.
5. Add `apphosting.yaml` with cost-safe defaults:
   - `minInstances: 0`
   - a conservative `maxInstances` cap
   - default 512 MiB memory unless measurement shows otherwise
6. Verify that both the old Vite build and the new Next.js build still pass.

No existing components or routes are deleted in this gate.

### Gate 2 - move data access to the server

1. Add `firebase-admin` as a runtime dependency and initialize it with App
   Hosting Application Default Credentials.
2. Create typed server repository functions for entities, relationships,
   forecasters, forecast collections, forecasts, manifests, and receipts.
3. Add deterministic serialization for Firestore timestamps and other values that
   cross from Server Components to Client Components.
4. Test the repository directly against `oflapp-staging`; do not run an emulator.
5. Confirm that no credential, private collection, or Admin SDK code is present in
   the browser bundle.

### Gate 3 - port the application shell and routes

1. Port the shared layout, navigation, sidebar, footer, theme handling, and
   breadcrumbs.
2. Replace the custom router and custom `Link` with App Router routes and
   `next/link`.
3. Port routes in this order:
   - landing page
   - entity catalog and entity details
   - forecast collections and showcase details
   - forecaster catalog
   - receipt detail
   - standards and integrity test
4. Keep page components as Server Components by default.
5. Isolate search boxes, theme toggles, chart interactions, receipt tabs, copy
   actions, and tamper testing behind narrowly scoped `"use client"` components.
6. Preserve every public URL or define an explicit redirect and test it.

### Gate 4 - make SEO and semantic identity server-native

1. Generate a canonical title, description, canonical URL, Open Graph metadata,
   and share image for each public route with the Next.js Metadata API.
2. Render sanitized JSON-LD in the initial HTML for entities, organizations,
   listed securities, funds, forecasters, forecasts, and receipts.
3. Include approved `sameAs`, Wikidata, Wikipedia, MIC, ISIN, ticker, and related
   entity links from Firestore rather than reconstructing them in the browser.
4. Generate `sitemap.xml` from the governed Firestore catalog and add `robots.ts`.
5. Validate representative pages with Schema Markup Validator and Google Rich
   Results Test where the schema type is supported.

### Gate 5 - verification before any cloud cutover

1. Run unit tests for receipt canonicalization, hashing, verification, route
   helpers, repository mapping, JSON-LD sanitization, and forecaster aggregation.
2. Run production builds for both the retained Vite baseline and Next.js app.
3. Test every route directly, by internal navigation, with JavaScript disabled,
   and at mobile and desktop widths.
4. Inspect the raw HTML response for meaningful page content, canonical metadata,
   and JSON-LD.
5. Confirm 404 behavior, legacy redirects, theme hydration, accessibility basics,
   and absence of private values in HTML or JavaScript.
6. Compare Firestore read counts and rendered values with the current staging app.

### Gate 6 - create a separate staging App Hosting backend

This is a cloud mutation and requires separate explicit approval.

1. Ensure `oflapp-staging` is on Blaze and has a budget alert.
2. Create the App Hosting backend in `us-central1` and connect it to the migration
   branch or a deliberately selected staging branch.
3. Keep automatic production rollouts disabled until the migration is accepted.
4. Use the generated URL, expected in the form
   `backend-id--oflapp-staging.us-central1.hosted.app`, for acceptance testing.
5. Do not replace or delete `oflapp-staging.web.app`.
6. Check Cloud Build, Cloud Run, CDN, application logs, SSR responses, and
   Firestore permissions.

### Gate 7 - staging acceptance and cutover

1. Run the route and visual acceptance suite against the `hosted.app` backend.
2. Crawl the site and validate metadata, JSON-LD, canonical URLs, and sitemaps.
3. Compare the Next.js screens against the accepted Vite screens.
4. After explicit approval, choose one canonical public address:
   - preferred: a Future Edge/iPulse AI custom subdomain connected directly to
     App Hosting;
   - temporary: the generated `hosted.app` address.
5. Keep the old `web.app` site available during a monitoring window, then redirect
   it to the chosen canonical address if technically and operationally useful.

The `web.app` address belongs to Firebase Hosting; App Hosting uses a
`hosted.app` address. A custom domain is therefore the clean long-term canonical
URL for the SSR application.

### Gate 8 - production, later

1. Create a distinct production Firebase project and production App Hosting
   backend; do not reuse the staging project.
2. Use the same codebase with environment-specific App Hosting configuration.
3. Promote a reviewed commit, run the same acceptance suite, and connect the
   production custom domain.
4. Retain App Hosting rollout history for instant rollback.

## Cost controls

- Keep `minInstances` at zero.
- Use server-generated, revalidated pages so repeated visits are served through
  the CDN rather than recomputing and rereading Firestore.
- Put image media in the governed shared public bucket with long immutable cache
  headers and stable entity-based object names.
- Cap `maxInstances` while traffic is small.
- Avoid unnecessary secrets and verbose logs.
- Enable billing alerts before the first App Hosting rollout.

Firebase's published example estimates virtually no cost at 10,000 visits under
its stated assumptions. That is not a guarantee, but this architecture should
remain within the current low-volume budget if response sizes and media are kept
controlled.

## Approval boundaries

Approval of this document authorizes local migration work only. The following
remain separate approval points:

- commit or push;
- create or modify an App Hosting backend;
- enable or change billing;
- deploy a rollout;
- change DNS, a custom domain, or redirects;
- modify the production Firebase project.

## Primary references

- Next.js App Router data fetching:
  https://nextjs.org/docs/app/getting-started/fetching-data
- Next.js dynamic metadata:
  https://nextjs.org/docs/app/api-reference/functions/generate-metadata
- Next.js JSON-LD:
  https://nextjs.org/docs/app/guides/json-ld
- Next.js metadata file conventions:
  https://nextjs.org/docs/app/api-reference/file-conventions/metadata
- Firebase App Hosting getting started:
  https://firebase.google.com/docs/app-hosting/get-started
- Firebase App Hosting multiple environments:
  https://firebase.google.com/docs/app-hosting/multiple-environments
- Firebase App Hosting configuration:
  https://firebase.google.com/docs/app-hosting/configure
- Firebase App Hosting costs:
  https://firebase.google.com/docs/app-hosting/costs
- Firestore security rules and server SDK behavior:
  https://firebase.google.com/docs/firestore/security/rules-conditions
