import { afterEach, describe, expect, it, vi } from "vitest";

const { firestore } = vi.hoisted(() => ({ firestore: { collection: vi.fn() } }));
vi.mock("server-only", () => ({}));
vi.mock("../../lib/firestore/server", () => ({ getLibraryServerFirestore: () => firestore }));
import { getPublicEntityServer } from "../../lib/library/server-repository";

afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });

describe("historical Batch 6 entity aliases", () => {
  it("resolves an exact old membership alias to its governed identity without scanning", async () => {
    vi.stubEnv("NEXT_PUBLIC_OFL_ENVIRONMENT", "production");
    const entity = { entityId: "equity_pep", publicSlug: "pepsico-pep", stableSlug: "pepsico-pep" };
    const reads: string[] = [];
    firestore.collection.mockImplementation((name: string) => ({
      doc: (id: string) => ({ get: async () => {
        reads.push(`${name}/${id}`);
        if (name === "public_collection_entities" && id === "batch-6__pepsi") return { exists: true, data: () => ({ entityId: entity.entityId }) };
        return { exists: id === entity.entityId, data: () => entity };
      } }),
      where: () => ({ limit: (count: number) => {
        expect(count).toBe(1);
        return { get: async () => ({ empty: true, docs: [] }) };
      } }),
    }));
    expect(await getPublicEntityServer("pepsi", "listed-securities")).toEqual(entity);
    expect(reads).toEqual(["public_entities/pepsi", "public_collection_entities/batch-6__pepsi", "public_entities/equity_pep"]);
  });

  it("does not resolve an unknown alias from unrelated entities", async () => {
    vi.stubEnv("NEXT_PUBLIC_OFL_ENVIRONMENT", "production");
    firestore.collection.mockImplementation(() => ({
      doc: () => ({ get: async () => ({ exists: false }) }),
      where: () => ({ limit: () => ({ get: async () => ({ empty: true, docs: [] }) }) }),
    }));
    expect(await getPublicEntityServer("unknown", "listed-securities")).toBeNull();
  });
});
