import { describe, expect, it } from "vitest";
import { assertForecastIdentityPreserved } from "../lib/publication-policy.mjs";

const published = {
  forecastId: "source-42", publisherId: "lab-a", forecastPublicId: "f-original",
  receiptDigest: "sealed-original", sourceRevisionId: 1, entitySlug: "old-name",
};
describe("published forecast identity", () => {
  it("allows presentation refreshes without altering evidence", () => {
    expect(() => assertForecastIdentityPreserved(published, { ...published, entitySlug: "new-name", chainStatus: "verified" })).not.toThrow();
  });
  it.each([
    { sourceRevisionId: 2, forecastPublicId: "f-correction", receiptDigest: "sealed-correction" },
    { receiptDigest: "silently-resealed" },
    { publisherId: "lab-b" },
  ])("rejects a replacement revision or publisher collision: %j", (changes) => {
    expect(() => assertForecastIdentityPreserved(published, { ...published, ...changes })).toThrow(/revision conflict/);
  });
  it("allows a new record and enriches missing legacy identity fields", () => {
    expect(() => assertForecastIdentityPreserved(null, published)).not.toThrow();
    expect(() => assertForecastIdentityPreserved({ forecastId: published.forecastId, receiptDigest: published.receiptDigest }, published)).not.toThrow();
  });
});
