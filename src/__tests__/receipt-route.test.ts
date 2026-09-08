import { afterEach, describe, expect, it, vi } from "vitest";

const { resolveReceipt } = vi.hoisted(() => ({ resolveReceipt: vi.fn() }));
vi.mock("../lib/library/server-repository", () => ({ getPublicReceiptResolverServer: resolveReceipt }));
import { GET } from "../../app/receipts/[digest]/route";

afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });
const digest = "a".repeat(64);
const request = new Request(`https://forecastlibrary.com/receipts/${digest}`);

describe("receipt URL HTTP contract", () => {
  it("returns a real permanent redirect after resolving the stored digest", async () => {
    vi.stubEnv("NEXT_PUBLIC_OFL_ENVIRONMENT", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_ORIGIN", "https://forecastlibrary.com");
    resolveReceipt.mockResolvedValue({ canonicalPath: "/entities/listed-securities/pepsico-pep/forecasts/example" });
    const response = await GET(request, { params: Promise.resolve({ digest: digest.toUpperCase() }) });
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("https://forecastlibrary.com/entities/listed-securities/pepsico-pep/forecasts/example");
    expect(resolveReceipt).toHaveBeenCalledWith(digest);
  });

  it("returns HTTP 404 for missing or malformed receipts", async () => {
    resolveReceipt.mockResolvedValue(null);
    expect((await GET(request, { params: Promise.resolve({ digest }) })).status).toBe(404);
    expect((await GET(request, { params: Promise.resolve({ digest: "invalid" }) })).status).toBe(404);
    expect(resolveReceipt).toHaveBeenCalledTimes(1);
  });

  it("rejects an external resolver destination", async () => {
    vi.stubEnv("NEXT_PUBLIC_OFL_ENVIRONMENT", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_ORIGIN", "https://forecastlibrary.com");
    resolveReceipt.mockResolvedValue({ canonicalPath: "https://example.com/" });
    await expect(GET(request, { params: Promise.resolve({ digest }) })).rejects.toThrow("canonical origin");
  });
});
