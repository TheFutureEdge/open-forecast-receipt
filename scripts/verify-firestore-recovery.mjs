#!/usr/bin/env node
import { Firestore, FieldPath, Timestamp } from "@google-cloud/firestore";
import { canonicalize } from "json-canonicalize";
import { createHash } from "node:crypto";
const arg = name => process.argv.find(value => value.startsWith(`${name}=`))?.slice(name.length + 1);
const projectId = arg("--project");
const databaseId = arg("--restored-database");
const snapshotTime = arg("--snapshot-time");
if (!projectId || !databaseId || databaseId === "(default)" || !snapshotTime) throw new Error("Specify project, isolated restored-database, and source snapshot-time");
const source = new Firestore({ projectId, preferRest: true });
const restored = new Firestore({ projectId, databaseId, preferRest: true });
const readTime = Timestamp.fromDate(new Date(snapshotTime));
const hash = value => createHash("sha256").update(canonicalize(value)).digest("hex");
const assert = (test, message) => { if (!test) throw new Error(message); };
const sourceCollections = (await source.listCollections()).map(ref => ref.id).sort();
const restoredCollections = (await restored.listCollections()).map(ref => ref.id).sort();
// Include names on either side. A collection created after the snapshot is
// correctly empty at readTime and must also be absent from the restored copy.
const collections = [...new Set([...sourceCollections, ...restoredCollections])].sort();
const revisions = new Map();
const receiptIds = new Set();
const forecastResolvers = new Map();
const receiptResolvers = new Map();
let receiptsVerified = 0;
async function inventory(db, name, pointInTime, group = false) {
  const digest = createHash("sha256");
  let count = 0, cursor;
  while (true) {
    let query = (group ? db.collectionGroup(name) : db.collection(name)).orderBy(FieldPath.documentId()).limit(50);
    if (cursor) query = query.startAfter(cursor);
    const page = pointInTime ? await db.runTransaction(tx => tx.get(query), { readOnly: true, readTime }) : await query.get();
    if (page.empty) break;
    for (const document of page.docs) {
      const value = document.data();
      digest.update(`${document.ref.path}\n${hash(value)}\n`);
      count++;
      if (!pointInTime) {
        if (name === "public_receipts") {
          const calculated = hash(value.document.receiptPayload);
          const expected = String(value.receiptDigest).replace(/^(0x|sha256:)/, "");
          assert(calculated === expected, `Recovered receipt digest mismatch: ${document.id}`);
          assert(document.id === value.receiptDigest, `Recovered receipt ID mismatch: ${document.id}`);
          receiptIds.add(document.id); receiptsVerified++;
        }
        if (name === "public_forecast_revisions") revisions.set(document.id, value);
        if (name === "public_forecast_resolvers") forecastResolvers.set(document.id, value);
        if (name === "public_receipt_resolvers") receiptResolvers.set(document.id, value);
      }
    }
    cursor = page.docs.at(-1);
  }
  return { documents: count, sha256: digest.digest("hex") };
}
const inventories = {};
for (const name of [...collections, "parts"]) {
  const group = name === "parts";
  const [original, recovered] = await Promise.all([inventory(source, name, true, group), inventory(restored, name, false, group)]);
  assert(original.documents === recovered.documents && original.sha256 === recovered.sha256, `Recovery content mismatch: ${name}`);
  inventories[group ? "collectionGroup:parts" : name] = recovered;
  console.error(`Verified ${name}: ${recovered.documents} documents`);
}
for (const [id, revision] of revisions) {
  const forecast = forecastResolvers.get(id), receipt = receiptResolvers.get(revision.receiptDigest);
  assert(revision.forecastPublicId === id && receiptIds.has(revision.receiptDigest), `Broken recovered revision: ${id}`);
  assert(forecast?.receiptDigest === revision.receiptDigest && receipt?.forecastPublicId === id, `Broken recovered resolver: ${id}`);
  assert(revision.canonicalPath && forecast.canonicalPath === revision.canonicalPath && receipt.canonicalPath === revision.canonicalPath, `Recovered permanent URL mismatch: ${id}`);
}
console.log(JSON.stringify({ projectId, databaseId, snapshotTime, completedAt: new Date().toISOString(),
  inventories, receiptsVerified, permanentRevisionLinksVerified: revisions.size,
  result: "PASS", writes: 0 }, null, 2));
await Promise.all([source.terminate(), restored.terminate()]);
