#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { canonicalize } from "json-canonicalize";
import { getServerFirestore } from "./lib/firestore-client.mjs";
const args = process.argv.slice(2);
const value = (name) => args.find((arg) => arg.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
const project = value("project");
if (!["oflapp-staging", "oflapp-prod"].includes(project)) throw new Error("Explicit Forecast Library project required");
const apply = args.includes("--apply");
if (apply && process.env.OFR_CONFIRM_FIRESTORE_PROJECT !== project) throw new Error("Exact project confirmation required");
const db = getServerFirestore(project);
const [forecasts, resolvers, frozen] = await Promise.all([
  db.collection("public_forecasts").get(), db.collection("public_forecast_resolvers").get(), db.collection("public_forecast_revisions").get(),
]);
const resolverMap = new Map(resolvers.docs.map((doc) => [doc.id, doc.data()]));
const frozenMap = new Map(frozen.docs.map((doc) => [doc.id, doc.data()]));
const additions = []; const inventory = [];
for (const doc of forecasts.docs) {
  const forecast = doc.data(); const resolver = resolverMap.get(forecast.forecastPublicId);
  if (!resolver || resolver.receiptDigest !== forecast.receiptDigest || resolver.forecastId !== forecast.forecastId
    || forecast.visibility !== "public" || forecast.publicationStatus !== "published"
    || !resolver.canonicalPath?.startsWith("/entities/")) throw new Error(`Unresolved identity: ${doc.id}`);
  const record = { ...forecast, canonicalPath: resolver.canonicalPath, revisionStorageVersion: "ofl-forecast-revision-v1" };
  const existing = frozenMap.get(forecast.forecastPublicId);
  if (existing && canonicalize(existing) !== canonicalize(record)) throw new Error(`Frozen revision differs: ${doc.id}`);
  if (!existing) additions.push(record);
  inventory.push({ forecastId: forecast.forecastId, forecastPublicId: forecast.forecastPublicId, receiptDigest: forecast.receiptDigest, canonicalPath: record.canonicalPath, entityId: forecast.entityId, originalSource: forecast.originalSource, sourceRevisionId: forecast.sourceRevisionId, forecasterId: forecast.forecasterId, forecasterLabel: forecast.forecasterLabel, forecasterMode: forecast.forecasterMode });
}
if (value("inventory")) await writeFile(value("inventory"), JSON.stringify(inventory, null, 2) + "\n");
if (apply) {
  const writer = db.bulkWriter();
  const results = Promise.allSettled(additions.map((record) => writer.create(db.collection("public_forecast_revisions").doc(record.forecastPublicId), record)));
  await writer.close();
  const failures = (await results).filter((result) => result.status === "rejected");
  if (failures.length) throw new AggregateError(failures.map((result) => result.reason), "Revision backfill incomplete; retry after review");
}
console.log(JSON.stringify({ project, mode: apply ? "apply" : "plan", forecasts: forecasts.size, existingRevisions: frozen.size, newRevisions: additions.length, changedReceipts: 0, changedPublishedUrls: 0 }, null, 2));
await db.terminate();
