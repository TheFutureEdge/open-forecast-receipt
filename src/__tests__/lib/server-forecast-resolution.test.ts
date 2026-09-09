import { afterEach, describe, expect, it, vi } from "vitest";
const { firestore } = vi.hoisted(() => ({ firestore: { collection: vi.fn() } }));
vi.mock("server-only", () => ({}));
vi.mock("../../lib/firestore/server", () => ({ getLibraryServerFirestore: () => firestore }));
import { getPublicForecastByPublicIdServer, getPublicReceiptResolverServer } from "../../lib/library/server-repository";
afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });
describe("stable forecast resolution", () => {
  it("returns not-found for an unknown receipt digest and preserves infrastructure errors", async () => {
    vi.stubEnv("NEXT_PUBLIC_OFL_ENVIRONMENT", "production");
    firestore.collection.mockImplementation(() => ({ doc: () => ({ get: async () => ({ exists: false }) }) }));
    expect(await getPublicReceiptResolverServer("0".repeat(64))).toBeNull();
    firestore.collection.mockImplementation(() => ({ doc: () => ({ get: async () => { throw new Error("datastore unavailable"); } }) }));
    await expect(getPublicReceiptResolverServer("0".repeat(64))).rejects.toThrow("datastore unavailable");
  });
  it("returns not-found for an unknown production ID without scanning", async () => {
    vi.stubEnv("NEXT_PUBLIC_OFL_ENVIRONMENT", "production");
    firestore.collection.mockImplementation(() => ({ doc: () => ({ get: async () => ({ exists: false }) }) }));
    expect(await getPublicForecastByPublicIdServer("f-unknown")).toBeNull();
    expect(firestore.collection).toHaveBeenCalledTimes(2);
  });
  it.each([false, true])("refuses an old resolver after the current index changes (changed=%s)", async (changed) => {
    vi.stubEnv("NEXT_PUBLIC_OFL_ENVIRONMENT", "production");
    const original = { forecastId: "source", forecastPublicId: "f-original", receiptDigest: "digest-original", canonicalPath: "/original" };
    const current = changed ? { ...original, forecastPublicId: "f-new", receiptDigest: "digest-new" } : original;
    firestore.collection.mockImplementation((name: string) => ({ doc: () => ({ get: async () => ({ exists: name !== "public_forecast_revisions", data: () => name === "public_forecast_resolvers" ? original : current }) }) }));
    expect(await getPublicForecastByPublicIdServer("f-original")).toEqual(changed ? null : original);
  });
  it("reads an immutable revision without consulting mutable indexes", async () => {
    const original = { forecastPublicId: "f-original", receiptDigest: "digest-original", canonicalPath: "/original", visibility: "public", publicationStatus: "published" };
    firestore.collection.mockImplementation(() => ({ doc: () => ({ get: async () => ({ exists: true, data: () => original }) }) }));
    expect(await getPublicForecastByPublicIdServer("f-original")).toEqual(original);
    expect(firestore.collection).toHaveBeenCalledTimes(1);
    expect(firestore.collection).toHaveBeenCalledWith("public_forecast_revisions");
  });
});
