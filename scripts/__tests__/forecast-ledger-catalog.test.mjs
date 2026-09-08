import { describe, expect, it } from "vitest";
import { buildForecastLedgerCatalogParts } from "../lib/forecast-ledger-catalog.mjs";

function forecast(index, padding = "x".repeat(180)) {
  return {
    entityId: "entity-test",
    forecastId: `forecast-${String(index).padStart(4, "0")}`,
    receiptDigest: `digest-${String(index).padStart(4, "0")}`,
    forecastCreatedAt: new Date(Date.UTC(2026, 0, 1, 0, index)).toISOString(),
    sortOrder: index,
    padding,
  };
}

describe("forecast ledger catalog parts", () => {
  it("keeps every part below the configured limit and orders newest forecasts last", () => {
    const forecasts = Array.from({ length: 18 }, (_, index) => forecast(index));
    const parts = buildForecastLedgerCatalogParts({
      entityId: "entity-test",
      generatedAt: "2026-08-14T00:00:00.000Z",
      forecasts: forecasts.reverse(),
      maxDocumentBytes: 2_400,
    });

    expect(parts.length).toBeGreaterThan(2);
    expect(parts.every((part) => part.bytes <= 2_400)).toBe(true);
    expect(parts.map((part) => part.partId)).toEqual(parts.map((_, index) => `part-${String(index + 1).padStart(6, "0")}`));
    expect(parts[0].value.forecasts[0].forecastId).toBe("forecast-0000");
    expect(parts.at(-1).value.forecasts.at(-1).forecastId).toBe("forecast-0017");
    expect(parts.at(-1).value.isLatest).toBe(true);
    expect(parts.every((part) => part.value.totalForecastCount === 18)).toBe(true);
  });

  it("makes the newest two parts a useful initial window when the newest part is sparse", () => {
    const parts = buildForecastLedgerCatalogParts({
      entityId: "entity-test",
      generatedAt: "2026-08-14T00:00:00.000Z",
      forecasts: Array.from({ length: 5 }, (_, index) => forecast(index, "x".repeat(220))),
      maxDocumentBytes: 2_200,
    });
    const newestTwo = parts.slice(-2).flatMap((part) => part.value.forecasts);

    expect(parts.length).toBeGreaterThan(1);
    expect(parts.at(-1).value.forecastCount).toBe(1);
    expect(newestTwo.length).toBeGreaterThan(1);
    expect(newestTwo.at(-1).forecastId).toBe("forecast-0004");
    expect(parts.at(-1).value.partNumber).toBe(parts.length);
  });
});
