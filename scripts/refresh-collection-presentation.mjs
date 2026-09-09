#!/usr/bin/env node
import { getServerFirestore } from "./lib/firestore-client.mjs";
import { ipulseCollectionPresentation } from "./lib/ipulse-collection-presentation.mjs";
const project = process.argv.find(arg => arg.startsWith("--project="))?.split("=")[1];
const apply = process.argv.includes("--apply");
if (!["oflapp-staging", "oflapp-prod"].includes(project)) throw new Error("Specify an approved Forecast Library project");
if (apply && process.env.OFR_CONFIRM_FIRESTORE_PROJECT !== project) throw new Error("Confirm the exact target project");
const db = getServerFirestore(project);
const [collections, revisions, subjects] = await Promise.all([
  db.collection("public_collections").get(),
  db.collection("public_forecast_revisions").select("collectionId", "forecastCreatedAt", "subjectCategory", "entityId").get(),
  db.collection("public_entity_directory_catalogs").doc("forecast-subjects").get(),
]);
const records = revisions.docs.map(doc => doc.data());
const entities = new Map(subjects.data().entities.map(entity => [entity.entityId, entity]));
const changes = [];
for (const snapshot of collections.docs) {
  const collection = snapshot.data();
  if (collection.publisherId !== "publisher_future_edge_ipulse_ai") continue;
  const presentation = ipulseCollectionPresentation(collection, records, entities);
  if (!presentation) continue;
  const catalogRef = db.collection("public_collection_catalogs").doc(snapshot.id);
  const catalog = await catalogRef.get();
  if (!catalog.exists) throw new Error(`Missing catalog ${snapshot.id}`);
  changes.push({ collectionId: snapshot.id, presentation, writes: 2 });
  if (apply) await db.runTransaction(async transaction => {
    const current = await transaction.get(snapshot.ref);
    const currentCatalog = await transaction.get(catalogRef);
    if (!current.updateTime.isEqual(snapshot.updateTime)) throw new Error("Collection changed during review; rerun");
    if (!currentCatalog.updateTime.isEqual(catalog.updateTime)) throw new Error("Catalog changed during review; rerun");
    transaction.update(snapshot.ref, { presentation });
    transaction.update(catalogRef, { "manifest.presentation": presentation });
  });
}
console.log(JSON.stringify({ project, apply, changes, receiptWrites: 0, resolverWrites: 0 }, null, 2));
