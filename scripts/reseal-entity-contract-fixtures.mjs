#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { canonicalize } from "json-canonicalize";

const ROOT = resolve(import.meta.dirname, "..");
const FIXTURES = resolve(ROOT, "src/data/fixtures");

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

async function resealReceipt(receiptPath, projectionPath) {
  const receipt = await readJson(receiptPath);
  const projection = await readJson(projectionPath);
  const digest = sha256(canonicalize(receipt.receiptPayload));
  receipt.proofEnvelope.payloadDigestSha256 = digest;
  projection.encodedFields.receiptDigest = `0x${digest}`;
  await writeJson(receiptPath, receipt);
  await writeJson(projectionPath, projection);
  return digest;
}

const catalogPath = resolve(FIXTURES, "batch6-catalog.json");
const selectionPath = resolve(FIXTURES, "batch6-showcase-selection.json");
const catalog = await readJson(catalogPath);
const digestByForecastId = new Map();

for (const entry of catalog.entries) {
  const receiptPath = resolve(FIXTURES, entry.documentPath);
  const projectionPath = resolve(FIXTURES, entry.projectionPath);
  const digest = await resealReceipt(receiptPath, projectionPath);
  entry.receiptDigest = digest;
  digestByForecastId.set(entry.forecastId, digest);
}

const selection = await readJson(selectionPath);
for (const entry of selection.receipts) {
  const selected = catalog.entries.find((candidate) => (
    candidate.assetSlug === entry.assetSlug
    && candidate.mode === entry.mode
    && candidate.forecasterLabel.startsWith("Ray Dalio /")
  ));
  if (!selected) throw new Error(`No selected receipt found for ${entry.assetSlug}/${entry.mode}`);
  entry.receiptDigest = selected.receiptDigest;
}

const exampleReceiptPath = resolve(ROOT, "examples/ipulse/pepsi_batch6_ray_open_forecast_receipt_v0_1.json");
const exampleProjectionPath = resolve(ROOT, "examples/ipulse/pepsi_batch6_ray_onchain_projection_v0_1.json");
await resealReceipt(exampleReceiptPath, exampleProjectionPath);

await writeJson(catalogPath, catalog);
await writeJson(selectionPath, selection);

console.log(JSON.stringify({ resealedReceipts: catalog.entries.length + 1 }, null, 2));
