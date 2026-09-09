import { describe, it, expect } from "vitest";
import { publishCatalogGeneration, activateCatalogGeneration, catalogGenerationPlan } from "../lib/catalog-generation.mjs";

function database({ failWrite = false, corruptRead = false } = {}) {
  const data = new Map();
  let version = 0;
  const put = (path, value) => data.set(path, { value: structuredClone(value), version: ++version });
  const snapshot = path => {
    const entry = data.get(path);
    return { exists: !!entry, data: () => entry?.value, updateTime: entry ? { version: entry.version, isEqual: other => entry.version === other.version } : undefined };
  };
  const db = {
    data, put,
    doc: path => ({ path, get: async () => snapshot(path),
      create: async value => { if (data.has(path)) throw new Error("Already exists"); put(path, value); },
      update: async value => put(path, { ...data.get(path).value, ...value }) }),
    bulkWriter: () => ({ set: async (ref, value) => {
      if (failWrite) throw new Error("injected write failure");
      put(ref.path, value);
    }, close: async () => {} }),
    getAll: async (...refs) => refs.map(ref => corruptRead ? { exists: true, data: () => ({ corrupted: true }) } : snapshot(ref.path)),
    runTransaction: async callback => callback({ get: async ref => snapshot(ref.path), set: (ref, value) => put(ref.path, value) }),
  };
  return db;
}
const plan = [{ collectionName: "public_library_stats", documentId: "summary", value: { receipts: 4511 } }];

describe("atomic catalog publication", () => {
  it("does not activate a failed partial write", async () => {
    const db = database({ failWrite: true });
    const expectedPointer = await db.doc("public_catalog_state/current").get();
    await expect(publishCatalogGeneration(db, plan, { expectedPointer, generationId: "failed" })).rejects.toThrow(/incomplete/);
    expect(db.data.has("public_catalog_state/current")).toBe(false);
    expect(db.data.get("public_catalog_generations/failed").value.status).toBe("building");
  });
  it("does not activate corrupted or missing staged content", async () => {
    const db = database({ corruptRead: true });
    const expectedPointer = await db.doc("public_catalog_state/current").get();
    await expect(publishCatalogGeneration(db, plan, { expectedPointer })).rejects.toThrow(/verification failed/);
    expect(db.data.has("public_catalog_state/current")).toBe(false);
  });
  it("keeps the current catalog until explicit activation, and retains old data for rollback", async () => {
    const db = database();
    let expectedPointer = await db.doc("public_catalog_state/current").get();
    await publishCatalogGeneration(db, plan, { expectedPointer, generationId: "one" });
    expectedPointer = await db.doc("public_catalog_state/current").get();
    await publishCatalogGeneration(db, plan, { expectedPointer, generationId: "two", activate: false });
    expect(db.data.get("public_catalog_state/current").value.activeGenerationId).toBe("one");
    await activateCatalogGeneration(db, "two", expectedPointer);
    await activateCatalogGeneration(db, "one", await db.doc("public_catalog_state/current").get());
    expect(db.data.get("public_catalog_state/current").value.activeGenerationId).toBe("one");
    expect(db.data.has("public_catalog_generations/two/public_library_stats/summary")).toBe(true);
    expect(db.data.has("public_library_stats/summary")).toBe(false);
  });
  it("rejects stale concurrent activation even if the pointer returns to the same ID", async () => {
    const db = database();
    db.put("public_catalog_state/current", { activeGenerationId: "one" });
    const expectedPointer = await db.doc("public_catalog_state/current").get();
    db.put("public_catalog_state/current", { activeGenerationId: "one" });
    await expect(publishCatalogGeneration(db, plan, { expectedPointer, generationId: "two" })).rejects.toThrow(/pointer changed/);
    expect(db.data.get("public_catalog_state/current").value.activeGenerationId).toBe("one");
  });
  it("never overwrites an existing generation", async () => {
    const db = database();
    const expectedPointer = await db.doc("public_catalog_state/current").get();
    await publishCatalogGeneration(db, plan, { expectedPointer, generationId: "one", activate: false });
    await expect(publishCatalogGeneration(db, plan, { expectedPointer, generationId: "one" })).rejects.toThrow(/Already exists/);
  });
  it("rejects sealed namespaces, duplicate IDs and malformed paths", () => {
    for (const collectionName of ["public_receipts", "public_forecast_resolvers", "public_forecast_revisions", "public_library_stats/../../public_receipts"]) {
      expect(() => catalogGenerationPlan([{ ...plan[0], collectionName }])).toThrow();
    }
    expect(() => catalogGenerationPlan([...plan, ...plan])).toThrow(/Duplicate/);
  });
});
