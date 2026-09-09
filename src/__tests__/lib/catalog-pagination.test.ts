import { it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({ paths: [] as string[], active: "g-new", fail: false }));
vi.mock("../../lib/firebase/client", () => ({ getLibraryFirestore: () => ({}) }));
vi.mock("../../lib/library/catalog-client", () => ({
  getCatalogGenerationClient: async () => mocks.active,
  getCatalogCollectionClient: async (name: string, generation: string | null) => ({ path: generation === null ? name : `public_catalog_generations/${generation}/${name}` }),
}));
vi.mock("firebase/firestore", () => ({
  doc: (ref: { path: string }, id: string) => ({ path: `${ref.path}/${id}` }),
  collection: (ref: { path: string }, id: string) => ({ path: `${ref.path}/${id}` }),
  limit: (n: number) => ({ limit: n }), orderBy: () => ({}), where: () => ({}),
  query: (ref: { path: string }) => ref,
  getDoc: vi.fn(),
  getDocs: async (ref: { path: string }) => {
    mocks.paths.push(ref.path);
    if (mocks.fail) throw new Error("read failed");
    return { empty: false, docs: [{ data: () => ({ partNumber: 2, totalForecastCount: 3, forecasts: [{ forecastId: ref.path, receiptDigest: ref.path, forecastCreatedAt: "2026-07-05", sortOrder: 0 }] }) }] };
  },
}));
import { listLibraryForecastLedgerPage } from "../../lib/library/repository";
it("pins older pages to the SSR generation even after the active pointer changes", async () => {
  const first = await listLibraryForecastLedgerPage("entity-a", undefined, "g-old");
  mocks.active = "g-later";
  const older = await listLibraryForecastLedgerPage("entity-a", 2, first.catalogGenerationId);
  expect(older.catalogGenerationId).toBe("g-old");
  expect(mocks.paths.slice(-2)).toEqual(Array(2).fill("public_catalog_generations/g-old/public_entity_forecast_ledgers/entity-a/parts"));
  const current = await listLibraryForecastLedgerPage("entity-a");
  expect(current.catalogGenerationId).toBe("g-later");
  expect(current.forecasts[0].forecastId).not.toBe(first.forecasts[0].forecastId);
});
it("keeps a legacy page on its original root catalog", async () => {
  await listLibraryForecastLedgerPage("entity-legacy", 2, null);
  expect(mocks.paths.at(-1)).toBe("public_entity_forecast_ledgers/entity-legacy/parts");
});
it("surfaces read failures and allows retry without changing generations", async () => {
  mocks.fail = true;
  await expect(listLibraryForecastLedgerPage("entity-error", 2, "g-old")).rejects.toThrow("read failed");
  mocks.fail = false;
  expect((await listLibraryForecastLedgerPage("entity-error", 2, "g-old")).catalogGenerationId).toBe("g-old");
});
