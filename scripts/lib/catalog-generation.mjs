import { createHash, randomUUID } from "node:crypto";
import { canonicalize } from "json-canonicalize";
import { checkedBulkWrite } from "./checked-bulk-write.mjs";

const namespaces = new Set([
  "public_targets", "public_forecasters", "public_collections",
  "public_forecaster_catalogs", "public_entity_directory_catalogs",
  "public_collection_catalogs", "public_entity_forecast_catalogs",
  "public_entity_forecast_ledgers", "public_library_stats", "public_sitemap_catalogs",
]);
const digest = value => createHash("sha256").update(canonicalize(value)).digest("hex");

export function catalogGenerationPlan(planned) {
  if (!planned.length) throw new Error("Cannot publish an empty catalog generation");
  const records = planned.map(({ collectionName, documentId, value }) => {
    const path = `${collectionName}/${documentId}`;
    const segments = path.split("/");
    if (!namespaces.has(segments[0]) || segments.some(segment => !segment || segment === "." || segment === "..")
      || !(segments.length === 2 || (segments.length === 4 && segments[2] === "parts"
        && ["public_entity_forecast_ledgers", "public_sitemap_catalogs"].includes(segments[0])))) {
      throw new Error(`Not a derived catalog path: ${path}`);
    }
    return { path, value, sha256: digest(value) };
  }).sort((a, b) => a.path.localeCompare(b.path));
  if (new Set(records.map(record => record.path)).size !== records.length) throw new Error("Duplicate catalog path");
  return { records, contentDigest: digest(records.map(({ path, sha256 }) => ({ path, sha256 }))) };
}

/** One pointer transaction; a stale concurrent build or rollback must fail. */
export async function activateCatalogGeneration(db, generationId, expectedPointer) {
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(generationId)) throw new Error("Invalid generation ID");
  const pointer = db.doc("public_catalog_state/current");
  return db.runTransaction(async transaction => {
    const current = await transaction.get(pointer);
    const generation = await transaction.get(db.doc(`public_catalog_generations/${generationId}`));
    if (current.exists !== expectedPointer.exists
      || (current.exists && !current.updateTime.isEqual(expectedPointer.updateTime))) {
      throw new Error("Catalog pointer changed during build/review; refusing stale activation");
    }
    if (generation.data()?.status !== "ready") throw new Error("Only a verified ready generation can be activated");
    const value = {
      activeGenerationId: generationId,
      previousGenerationId: current.data()?.activeGenerationId ?? null,
      activatedAt: new Date().toISOString(),
      contentDigest: generation.data().contentDigest,
    };
    transaction.set(pointer, value);
    return value;
  });
}

/** Build privately, read back every document, then atomically expose the result. */
export async function publishCatalogGeneration(db, planned, { expectedPointer, generationId = `g-${Date.now()}-${randomUUID().slice(0, 8)}`, activate = true } = {}) {
  if (!expectedPointer) throw new Error("Capture the active pointer before reading source data");
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(generationId)) throw new Error("Invalid generation ID");
  const { records, contentDigest } = catalogGenerationPlan(planned);
  const generation = db.doc(`public_catalog_generations/${generationId}`);
  // Reservation is create-only: no publisher can overwrite a retained generation.
  await generation.create({ status: "building", createdAt: new Date().toISOString(), documentCount: records.length, contentDigest });
  await checkedBulkWrite(db, records.map(record => ({ kind: "set", reference: db.doc(`${generation.path}/${record.path}`), value: record.value })));
  for (let offset = 0; offset < records.length; offset += 40) {
    const batch = records.slice(offset, offset + 40);
    const restored = await db.getAll(...batch.map(record => db.doc(`${generation.path}/${record.path}`)));
    for (let i = 0; i < batch.length; i++) {
      if (!restored[i].exists || digest(restored[i].data()) !== batch[i].sha256) throw new Error(`Catalog verification failed: ${batch[i].path}`);
    }
  }
  await generation.update({ status: "ready", verifiedAt: new Date().toISOString() });
  const activation = activate ? await activateCatalogGeneration(db, generationId, expectedPointer) : null;
  return { generationId, documentCount: records.length, contentDigest, activation };
}
