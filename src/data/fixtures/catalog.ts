import catalogData from "./batch6-catalog.json";
import type { CompactEasProjection, OfrDocument, OfrFixture } from "../../types/ofr";

export interface FixtureCatalogEntry {
  assetSlug: string;
  assetId: string;
  forecasterLabel: string;
  mode: string;
  forecastId: string;
  receiptDigest: string;
  documentPath: string;
  projectionPath: string;
  dataStatus: "loaded";
  chainStatus: "not_issued";
}

interface FixtureCatalog {
  batchId: string;
  generatedAt: string;
  receiptCount: number;
  entries: FixtureCatalogEntry[];
}

const catalog = catalogData as FixtureCatalog;
const documentLoaders = import.meta.glob("./*/*-ofr.json", { import: "default" });
const projectionLoaders = import.meta.glob("./*/*-projection.json", { import: "default" });

export const fixtureCatalog = catalog;

export function getAssetFixtureEntries(assetSlug: string): FixtureCatalogEntry[] {
  return catalog.entries.filter((entry) => entry.assetSlug === assetSlug);
}

export function findFixtureEntry(receiptDigest: string): FixtureCatalogEntry | undefined {
  return catalog.entries.find((entry) => entry.receiptDigest === receiptDigest);
}

export async function loadFixture(entry: FixtureCatalogEntry): Promise<OfrFixture> {
  const documentLoader = documentLoaders[entry.documentPath];
  const projectionLoader = projectionLoaders[entry.projectionPath];
  if (!documentLoader || !projectionLoader) {
    throw new Error(`Fixture files are missing for ${entry.forecastId}`);
  }
  const [document, projection] = await Promise.all([documentLoader(), projectionLoader()]);
  return {
    assetSlug: entry.assetSlug,
    forecasterLabel: entry.forecasterLabel,
    dataStatus: "loaded",
    document: document as OfrDocument,
    projection: projection as CompactEasProjection,
  };
}
