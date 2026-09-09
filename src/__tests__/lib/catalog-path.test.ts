import { expect, it } from "vitest";
import { catalogCollectionPath } from "../../lib/library/catalog-path";
it("pins a retained generation and keeps explicit legacy paths stable", () => {
  expect(catalogCollectionPath("public_entity_forecast_ledgers", "g-old")).toBe("public_catalog_generations/g-old/public_entity_forecast_ledgers");
  expect(catalogCollectionPath("public_entity_forecast_ledgers", null)).toBe("public_entity_forecast_ledgers");
  expect(() => catalogCollectionPath("public_receipts", "g-new")).toThrow();
  expect(() => catalogCollectionPath("public_collections", "../new")).toThrow();
});
