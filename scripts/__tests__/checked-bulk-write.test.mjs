import { describe, expect, it, vi } from "vitest";
import { checkedBulkWrite } from "../lib/checked-bulk-write.mjs";

describe("catalog bulk write completion", () => {
  it("reports an operation failure even when close succeeds", async () => {
    const writer = { set: vi.fn().mockRejectedValue(new Error("write denied")), close: vi.fn().mockResolvedValue() };
    await expect(checkedBulkWrite({ bulkWriter: () => writer }, [{ kind: "set", reference: {}, value: {} }])).rejects.toThrow(/publication is incomplete/);
    expect(writer.close).toHaveBeenCalled();
  });
  it("reports a failed cleanup operation", async () => {
    const writer = { delete: vi.fn().mockRejectedValue(new Error("delete denied")), close: vi.fn().mockResolvedValue() };
    await expect(checkedBulkWrite({ bulkWriter: () => writer }, [{ kind: "delete", reference: {} }])).rejects.toThrow(/publication is incomplete/);
  });
  it("accepts an empty generation without opening a writer", async () => {
    const db = { bulkWriter: vi.fn() };
    await checkedBulkWrite(db, []);
    expect(db.bulkWriter).not.toHaveBeenCalled();
  });
});
