import { describe, expect, it } from "vitest";
import {
  parseEntityDetailPath,
  parseEntityForecastCollectionPath,
  parseEntityForecastLedgerPath,
  parseEntityForecastSetPath,
  parsePublicForecastPath,
  publicEntityForecastCollectionPath,
  publicEntityForecastLedgerPath,
  publicEntityForecastSetPath,
  publicEntityPath,
  publicEntitySlug,
  publicForecastOriginalSource,
  publicForecastSubjectSource,
  publicForecastKeyMatches,
  publicForecastPath,
  publicRelatedEntityPath,
} from "../../lib/library/entityRoutes";
import type { PublicForecastRecord } from "../../lib/library/types";

describe("public entity routes", () => {
  it("separates listed securities from organizations", () => {
    expect(publicEntityPath({ canonicalName: "3M Company", stableSlug: "3m-mmm", entityType: "listed_security", entityClasses: ["forecastable_entity"] }))
      .toBe("/entities/listed-securities/3m-mmm");
    expect(publicEntityPath({ canonicalName: "3M Company", stableSlug: "entity-3fff", entityType: "corporation", entityClasses: ["organization"] }))
      .toBe("/entities/corporations/3m-company");
    expect(publicEntitySlug({ canonicalName: "3M Company", stableSlug: "entity-3fff", entityType: "corporation", entityClasses: ["organization"] }))
      .toBe("3m-company");
  });

  it("parses typed routes while retaining legacy detail links", () => {
    expect(parseEntityDetailPath("/entities/listed-securities/3m-mmm")).toEqual({ routeKind: "listed-securities", routeKey: "3m-mmm" });
    expect(parseEntityDetailPath("/entities/corporations/3m-company")).toEqual({ routeKind: "corporations", routeKey: "3m-company" });
    expect(parseEntityDetailPath("/entities/entity-3fff")).toEqual({ routeKey: "entity-3fff" });
    expect(parseEntityDetailPath("/entities/organizations")).toBeNull();
    expect(parseEntityDetailPath("/entities/corporations")).toBeNull();
  });

  it("puts the security-wide forecast ledger before optional publication sets", () => {
    const ledgerPath = publicEntityForecastLedgerPath("3m-mmm");
    expect(ledgerPath).toBe("/entities/listed-securities/3m-mmm/forecasts");
    expect(parseEntityForecastLedgerPath(ledgerPath)).toEqual({ routeSlug: "3m-mmm" });

    const setPath = publicEntityForecastSetPath("3m-mmm", "batch-6");
    expect(setPath).toBe("/entities/listed-securities/3m-mmm/forecast-sets/2026-07-05-sb6");
    expect(parseEntityForecastSetPath(setPath)).toEqual({ routeSlug: "3m-mmm", setSlug: "2026-07-05-sb6", collectionId: "batch-6" });
  });

  it("gives every forecast a date, target, forecaster, and receipt-independent public identity", () => {
    const path = publicForecastPath("3m-mmm", {
      forecastCreatedAt: "2026-07-05T14:55:00Z",
      targetName: "eod_close_price_step_over_step_percentage_change",
      targetSlug: "adjusted-end-of-day-close-return",
      forecasterId: "ray-dalio-ai",
      forecasterPublicSlug: "ray-dalio-ai-on-gemini-3-1-pro",
      forecasterLabel: "Ray Dalio AI",
      forecaster: { displayName: "Ray Dalio AI on Gemini 3.1 Pro" },
      forecastId: "forecast-1",
      forecastPublicId: "f-0h7k7x2r6j4p8w9m3d1c5b0nqt",
      receiptDigest: "85e82d474841f0497fb7f6fcb0a7fec7ce808de9779ff69eff32a6b6560ea4a5",
    } as PublicForecastRecord);
    expect(path).toBe("/entities/listed-securities/3m-mmm/forecasts/2026-07-05/adjusted-end-of-day-close-return/ray-dalio-ai-on-gemini-3-1-pro/f-0h7k7x2r6j4p8w9m3d1c5b0nqt");
    expect(parsePublicForecastPath(path)).toEqual({
      routeSlug: "3m-mmm",
      generatedDate: "2026-07-05",
      targetSlug: "adjusted-end-of-day-close-return",
      forecasterSlug: "ray-dalio-ai-on-gemini-3-1-pro",
      forecastPublicId: "f-0h7k7x2r6j4p8w9m3d1c5b0nqt",
    });

    const forecast = {
      forecastId: "forecast-1",
      receiptDigest: "85e82d474841f0497fb7f6fcb0a7fec7ce808de9779ff69eff32a6b6560ea4a5",
    } as PublicForecastRecord;
    expect(publicForecastKeyMatches(forecast, "85e82d474841f049")).toBe(true);
    expect(publicForecastKeyMatches(forecast, "85e82d474841")).toBe(true);
    expect(publicForecastKeyMatches(forecast, "85e82d474840")).toBe(false);
  });

  it("links Batch 6+ forecasts to their original iPulse AI historical publication", () => {
    expect(publicForecastOriginalSource("3m-mmm", {
      publisherId: "publisher_future_edge_ipulse_ai",
      originalSource: { publisherName: "iPulse AI", label: "Historical forecast", url: "https://ipulseai.com/stocks/3m-mmm" },
      collectionId: "batch-6",
      forecastCreatedAt: "2026-07-05T14:56:47Z",
    })).toEqual({
      publisherName: "iPulse AI",
      label: "View the original historical forecast",
      url: "https://ipulseai.com/stocks/3m-mmm/forecast-history/2026-07-05-sb6/ai-forecasts",
      publicationId: "2026-07-05-sb6",
      publicationDate: "2026-07-05",
    });

    expect(publicForecastOriginalSource("3m-mmm", {
      collectionId: "batch-5",
      forecastCreatedAt: "2026-01-05T00:00:00Z",
    })).toBeUndefined();
  });

  it("keeps other forecasting domains independent from iPulse asset mappings", () => {
    const weather = { publisherId: "weather-lab", entityId: "unrelated-subject", collectionId: "batch-6", forecastCreatedAt: "2026-07-05T00:00:00Z",
      originalSource: { publisherName: "Weather Lab", label: "Original weather forecast", url: "https://example.org/forecasts/rain-2026", subjectUrl: "https://example.org/regions/abu-dhabi", subjectLabel: "Current weather research" } };
    expect(publicForecastOriginalSource("3m-mmm", weather)).toEqual(weather.originalSource);
    expect(publicForecastSubjectSource(weather)).toEqual({ url: weather.originalSource.subjectUrl, label: weather.originalSource.subjectLabel });
    expect(publicForecastOriginalSource("3m-mmm", { collectionId: "batch-6", forecastCreatedAt: weather.forecastCreatedAt })).toBeUndefined();
    expect(publicForecastSubjectSource({ ...weather, originalSource: { ...weather.originalSource, subjectUrl: "javascript:alert(1)" } })).toBeUndefined();
  });

  it("retains the first hackathon collection route only as a redirect input", () => {
    const path = publicEntityForecastCollectionPath("3m-mmm", "batch-6");
    expect(path).toBe("/entities/listed-securities/3m-mmm/forecasts/batch-6");
    expect(parseEntityForecastCollectionPath(path)).toEqual({ routeSlug: "3m-mmm", collectionId: "batch-6" });
    expect(parseEntityForecastCollectionPath("/showcase/3m-mmm")).toBeNull();
  });

  it("types related entity links from their relationship", () => {
    expect(publicRelatedEntityPath({
      predicate: "has_market_representation",
      entityId: "equity-1",
      canonicalName: "3M Company",
      stableSlug: "3m-mmm",
      entityType: "listed_security",
    })).toBe("/entities/listed-securities/3m-mmm");

    expect(publicRelatedEntityPath({
      predicate: "is_market_representation_of",
      entityId: "company-1",
      canonicalName: "3M Company",
      stableSlug: "entity-3fff",
      entityType: "corporation",
    })).toBe("/entities/corporations/3m-company");
  });
});
