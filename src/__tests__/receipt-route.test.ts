import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
const { readReceipt } = vi.hoisted(() => ({ readReceipt: vi.fn() }));
vi.mock("../lib/library/server-repository", () => ({ getLibraryReceiptServer: readReceipt }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("HTTP404"); } }));
vi.mock("../components/layout/AppShell", () => ({ AppShell: () => null }));
vi.mock("../components/receipt/ReceiptDetail", () => ({ LoadedReceiptDetail: () => null }));
import ReceiptPage, { generateMetadata } from "../../app/receipts/[digest]/page";
afterEach(() => vi.resetAllMocks());
const document = JSON.parse(readFileSync(new URL("../data/fixtures/pepsi/ray-ofr.json", import.meta.url), "utf8"));
const digest = document.proofEnvelope.payloadDigestSha256;
describe("permanent receipt URL", () => {
  it("renders the exact payload directly and needs no current forecast resolver", async () => {
    readReceipt.mockResolvedValue({ document, projection: {} });
    expect(await ReceiptPage({ params: Promise.resolve({ digest }) })).toBeTruthy();
    expect(readReceipt).toHaveBeenCalledWith(digest);
    expect((await generateMetadata({ params: Promise.resolve({ digest }) })).alternates?.canonical).toBe(`/receipts/${digest}`);
  });
  it("returns not-found for malformed, missing or mismatched evidence", async () => {
    await expect(ReceiptPage({ params: Promise.resolve({ digest: "invalid" }) })).rejects.toThrow("HTTP404");
    expect(readReceipt).not.toHaveBeenCalled();
    readReceipt.mockResolvedValue(null);
    await expect(ReceiptPage({ params: Promise.resolve({ digest }) })).rejects.toThrow("HTTP404");
    readReceipt.mockResolvedValue({ document, projection: {} });
    await expect(ReceiptPage({ params: Promise.resolve({ digest: "0".repeat(64) }) })).rejects.toThrow("HTTP404");
  });
});
