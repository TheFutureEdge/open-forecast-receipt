import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, writer } = vi.hoisted(() => {
  const writer = { onWriteError: vi.fn(), create: vi.fn(), update: vi.fn(), set: vi.fn(), close: vi.fn() };
  const db = { collection: vi.fn(), getAll: vi.fn(), bulkWriter: vi.fn(() => writer) };
  return { db, writer };
});
vi.mock("../lib/firestore-client.mjs", () => ({ getServerFirestore: () => db }));
import { publishPlan } from "../lib/library-publisher.mjs";

const value = { forecastId: "source-42", publisherId: "publisher-a", forecastPublicId: "f-original", receiptDigest: "digest-1", sourceRevisionId: 1 };
const plan = { bundleDigest: "audit-only", collectionId: "audit", documents: [{ collectionName: "public_forecasts", documentId: "source-42", writeMode: "mutable_current", value }] };

describe("publication identity preflight", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.collection.mockImplementation((collection) => ({ doc: (id) => ({ path: `${collection}/${id}`, set: vi.fn() }) }));
  });

  it("rejects a replacement before opening the bulk writer", async () => {
    db.getAll.mockResolvedValue([{ exists: true, data: () => ({ ...value, receiptDigest: "another-receipt" }) }]);
    await expect(publishPlan(plan, "test-only")).rejects.toThrow(/revision conflict/);
    expect(db.bulkWriter).not.toHaveBeenCalled();
  });

  it("uses the read version as a write precondition", async () => {
    const updateTime = { seconds: 123 };
    db.getAll.mockResolvedValue([{ exists: true, data: () => value, updateTime }]);
    await expect(publishPlan(plan, "test-only")).resolves.toMatchObject({ created: 0, updated: 1 });
    expect(writer.update).toHaveBeenCalledWith(expect.objectContaining({ path: "public_forecasts/source-42" }), value, { lastUpdateTime: updateTime });
    expect(writer.set).not.toHaveBeenCalled();
  });

  it("creates new forecast identities without an upsert", async () => {
    db.getAll.mockResolvedValue([{ exists: false }]);
    await expect(publishPlan(plan, "test-only")).resolves.toMatchObject({ created: 1, updated: 0 });
    expect(writer.create).toHaveBeenCalledWith(expect.objectContaining({ path: "public_forecasts/source-42" }), value);
    expect(writer.set).not.toHaveBeenCalled();
  });
});
