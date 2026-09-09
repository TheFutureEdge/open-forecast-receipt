#!/usr/bin/env node
import assert from "node:assert/strict";
import { Firestore } from "@google-cloud/firestore";
import { createHash } from "node:crypto";
import { canonicalize } from "json-canonicalize";
const arg = name => process.argv.find(value => value.startsWith(`${name}=`))?.slice(name.length + 1);
const projectId = arg("--project"), base = arg("--base");
if (!projectId || !base) throw new Error("Specify --project and --base");
const db = new Firestore({ projectId, databaseId: arg("--database") || "(default)", preferRest: true });
const catalogGenerationId = (await db.doc("public_catalog_state/current").get()).data()?.activeGenerationId ?? null;
const revisions = (await db.collection("public_forecast_revisions").limit(6).get()).docs.map(doc => doc.data());
assert.equal(revisions.length, 6);
const routes = ["/", "/forecasts", "/entities", "/entities/listed-securities", "/forecasters", "/collections/ipulse-ai/2026-08-06-sb6", "/entities/listed-securities/pepsico-pep/forecasts", "/submit", "/sitemap.xml"];
const results = [];
const headers = new URL(base).hostname === "127.0.0.1" ? { "x-forwarded-host": "forecastlibrary.com" } : {};
async function read(path) {
  const response = await fetch(new URL(path, base), { redirect: "manual", headers, signal: AbortSignal.timeout(90000) });
  assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
  const text = await response.text();
  assert(!text.includes("Application error: a server-side exception"), `SSR failure: ${path}`);
  results.push({ path, status: response.status });
  return { response, text };
}
for (const path of routes) {
  const { text } = await read(path);
  if (path === "/forecasts") assert(text.includes("4,511") && text.includes("Financial Markets"), "Collection presentation regressed");
  if (path === "/entities/listed-securities") assert(text.includes("Stocks"), "Stocks label regressed");
  if (path === "/sitemap.xml") assert(text.includes("<urlset"), "Invalid sitemap");
  if (path === "/entities/listed-securities/pepsico-pep/forecasts") {
    assert(text.replaceAll('\\"', '"').includes(`"catalogGenerationId":${JSON.stringify(catalogGenerationId)}`), "SSR read a different catalog/database than the verifier");
  }
}
for (const revision of revisions) {
  for (const path of [`/forecasts/${revision.forecastPublicId}`, revision.canonicalPath, `/receipts/${revision.receiptDigest}`]) await read(path);
  const { response, text } = await read(`/api/v1/receipts/${revision.receiptDigest}`);
  const payload = JSON.parse(text).receiptPayload;
  assert.equal(createHash("sha256").update(canonicalize(payload)).digest("hex"), revision.receiptDigest, "API receipt content mismatch");
  assert.equal(response.headers.get("x-ofr-payload-digest-sha256"), revision.receiptDigest);
}
console.log(JSON.stringify({ projectId, databaseId: arg("--database") || "(default)", catalogGenerationId, base, completedAt: new Date().toISOString(), result: "PASS", routes: results.length, results }, null, 2));
await db.terminate();
