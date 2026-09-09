import { describe, expect, it } from "vitest";
import { ipulseCollectionPresentation } from "../lib/ipulse-collection-presentation.mjs";
const collection = { collectionId: "batch-6", publisherId: "publisher_future_edge_ipulse_ai", publishedAt: "2026-08-06T12:00:00Z" };
const record = { collectionId: "batch-6", entityId: "stock", forecastCreatedAt: "2026-07-05T14:45:00Z", subjectCategory: "equity" };
const entities = new Map([["stock", { entityType: "listed_security" }], ["etf", { entityType: "listed_fund_share" }]]);
describe("publisher collection presentation", () => {
  it("uses the original forecast date rather than the later Library publication date", () => {
    const result = ipulseCollectionPresentation(collection, [record], entities);
    expect(result.title).toContain("5 July 2026 (Batch 6)");
    expect(result.title).not.toContain("August");
    expect(result.description).toContain("added to Forecast Library 6 August 2026");
    expect(result.tags).toEqual(["Financial markets", "Stocks"]);
  });
  it("includes only represented categories and handles multiple dates and collections", () => {
    const result = ipulseCollectionPresentation(collection, [record, { ...record, entityId: "etf", forecastCreatedAt: "2026-07-06T00:00:00Z" }, { ...record, collectionId: "batch-7", subjectCategory: "crypto" }], entities);
    expect(result.title).toContain("2 Forecasts");
    expect(result.forecastDateEnd).toBe("2026-07-06");
    expect(result.tags).toEqual(["Financial markets", "Stocks", "Funds & ETFs"]);
  });
  it("does not classify another publisher as financial markets", () => {
    expect(ipulseCollectionPresentation({ ...collection, publisherId: "weather-lab" }, [record], entities)).toBeUndefined();
  });
});
