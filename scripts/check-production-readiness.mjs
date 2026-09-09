#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const failures = [];
const passes = [];

async function text(path) {
  return readFile(resolve(ROOT, path), "utf8");
}

function check(condition, label) {
  if (condition) passes.push(label);
  else failures.push(label);
}

const [
  packageJson,
  productionHosting,
  stagingHosting,
  siteOrigin,
  proxy,
  rules,
  materializer,
  publisher,
  entitySync,
  sitemap,
  routes,
  urlGovernance,
] = await Promise.all([
  text("package.json").then(JSON.parse),
  text("apphosting.production.yaml"),
  text("apphosting.staging.yaml"),
  text("src/lib/siteOrigin.ts"),
  text("proxy.ts"),
  text("firestore.rules"),
  text("scripts/materialize-public-catalogs.mjs"),
  text("scripts/lib/library-publisher.mjs"),
  text("scripts/sync-ipulse-entity-catalog.mjs"),
  text("app/sitemap.ts"),
  text("app/[[...slug]]/page.tsx"),
  text("docs/OPEN_FORECAST_LIBRARY_URL_AND_DOMAIN_GOVERNANCE_V1.md"),
]);

check(Number(process.versions.node.split(".")[0]) >= 22, "Node.js 22 or newer");
check(packageJson.dependencies?.next?.startsWith("16."), "Next.js 16 is pinned");
check(packageJson.scripts?.test === "vitest run", "Deterministic test command exists");
check(packageJson.scripts?.["build:production"], "Explicit production build command exists");

check(productionHosting.includes("NEXT_PUBLIC_OFL_ENVIRONMENT") && productionHosting.includes("value: production"), "Production App Hosting environment is explicit");
check(productionHosting.includes("value: https://forecastlibrary.com"), "Production App Hosting origin is canonical");
check(!productionHosting.includes("hosted.app") && !productionHosting.includes("web.app"), "Production App Hosting config contains no Firebase canonical host");
check(stagingHosting.includes("value: staging") && stagingHosting.includes("ofl-staging--oflapp-staging.us-central1.hosted.app"), "Staging App Hosting environment remains isolated");

check(siteOrigin.includes('CANONICAL_PRODUCTION_ORIGIN = "https://forecastlibrary.com"'), "Canonical production origin is frozen");
check(siteOrigin.includes("Production requires NEXT_PUBLIC_SITE_ORIGIN"), "Production origin fails closed");
check(proxy.includes("NextResponse.redirect(destination, 308)"), "Non-canonical production hosts redirect permanently");
check(!proxy.includes("robots.txt|sitemap.xml"), "Robots and sitemap pass through environment controls");

check(rules.includes("match /{document=**}") && rules.includes("allow read, write: if false"), "Firestore has a default deny rule");
check(/match \/public_forecasts\/\{documentId\}[\s\S]*?allow list: if false;/.test(rules), "Raw forecast listing is denied to browsers");
check(/match \/public_receipts\/\{documentId\}[\s\S]*?allow get: if true;[\s\S]*?allow list: if false;/.test(rules), "Receipts are point-read only");
check(rules.includes("request.query.limit <= 2"), "Browser ledger pagination is bounded to two catalog parts");

check(!/collection\(["']public_receipts["']\)\.get\(\)/.test(materializer), "Catalog materializer never lists full receipts");
check(materializer.includes("MAX_PUBLIC_CATALOG_BYTES = 650 * 1024"), "Catalogs retain headroom below 700 KiB");
check(publisher.includes("MAX_PUBLIC_CATALOG_BYTES = 650 * 1024") && entitySync.includes("MAX_PUBLIC_CATALOG_BYTES = 650 * 1024"), "All publisher paths enforce the same catalog ceiling");
check(materializer.includes('collectionName: "public_entity_forecast_catalogs"'), "Collection/entity forecast catalogs are materialized");
check(materializer.includes('collectionName: "public_entity_forecast_ledgers"'), "Cross-collection entity ledgers are materialized");
check(materializer.includes('tx.get(db.collection("public_forecast_revisions"))') && !materializer.includes('collectionName: "public_forecast_resolvers"'), "Catalog rebuilds read immutable revisions without rewriting permanent resolvers");
check(materializer.includes('collectionName: "public_sitemap_catalogs"'), "Bounded sitemap catalogs are materialized");

check(sitemap.includes('dynamic = "force-dynamic"') && sitemap.includes("listPublicSitemapEntriesServer"), "Sitemap is SSR from bounded catalogs");
check(routes.includes("parsePublicForecastPath") && routes.includes("!permanentId && pathname !== canonicalPath") && !routes.includes("permanentRedirect(canonicalPath)"), "Published forecast paths resolve directly against frozen canonical paths");
check(routes.includes('pathname === "/integrity-test"'), "Canonical integrity-test route exists");
check(!routes.includes('pathname === "/showcase"'), "No showcase product route remains");
check(urlGovernance.includes("https://forecastlibrary.com") && urlGovernance.includes("Forecast Library URL and Domain Governance v1"), "Domain and URL governance is documented");

console.log(JSON.stringify({
  status: failures.length === 0 ? "PASS" : "FAIL",
  checks: passes.length + failures.length,
  passed: passes,
  failed: failures,
}, null, 2));

if (failures.length > 0) process.exit(1);
