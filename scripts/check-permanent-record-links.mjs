#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { canonicalize } from "json-canonicalize";
const [origin, inventoryPath] = process.argv.slice(2);
const local = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin || "");
if ((!origin?.startsWith("https://") && !local) || !inventoryPath) throw new Error("Usage: check-permanent-record-links.mjs https://origin inventory.json");
const inventory = JSON.parse(await readFile(inventoryPath, "utf8"));
const assetPaths = JSON.parse(await readFile(new URL("../src/data/ipulse-public-asset-paths.json", import.meta.url), "utf8"));
const categories = new Map();
for (const record of inventory) {
  const path = assetPaths[record.entityId];
  if (path && !categories.has(path.split("/")[1])) categories.set(path.split("/")[1], record);
}
const checks = [];
async function get(path, expected = 200) {
  const response = await fetch(new URL(path, origin), { redirect: "manual", signal: AbortSignal.timeout(90000), ...(local ? { headers: { "x-forwarded-host": "forecastlibrary.com" } } : {}) });
  if (response.status !== expected) throw new Error(`${path}: HTTP ${response.status}, expected ${expected}`);
  checks.push({ path, status: response.status });
  return response;
}
for (const [category, record] of categories) {
  const [permalink, original, receiptPage, jsonResponse] = await Promise.all([
    get(`/forecasts/${record.forecastPublicId}`), get(record.canonicalPath),
    get(`/receipts/${record.receiptDigest}`), get(`/api/v1/receipts/${record.receiptDigest}`),
  ]);
  const expectedAsset = `https://ipulseai.com${assetPaths[record.entityId]}`;
  for (const response of [permalink, original, receiptPage]) {
    const html = await response.text();
    if (!html.includes(record.receiptDigest) || !html.includes(expectedAsset)) throw new Error(`${category} ${response.url}: digest=${html.includes(record.receiptDigest)}, subjectLink=${html.includes(expectedAsset)}`);
  }
  const receipt = await jsonResponse.json();
  const computed = createHash("sha256").update(canonicalize(receipt.receiptPayload)).digest("hex");
  if (computed !== record.receiptDigest || receipt.proofEnvelope.payloadDigestSha256 !== computed) throw new Error(`${category}: digest mismatch`);
}
await get(`/forecasts/f-${"0".repeat(26)}`, 404);
await get(`/receipts/${"0".repeat(64)}`, 404);
await get(`/api/v1/receipts/${"0".repeat(64)}`, 404);
const schema = await (await get("/schemas/open-forecast-receipt/v0.1.0/schema.json")).text();
const canonicalSchema = await readFile(new URL("../schema/open_forecast_receipt_v0_1.schema.json", import.meta.url), "utf8");
if (schema !== canonicalSchema) throw new Error("Published schema differs from the frozen canonical schema");
console.log(JSON.stringify({ origin, categories: [...categories.keys()], checks, result: "PASS" }, null, 2));
