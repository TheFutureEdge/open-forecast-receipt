import catalogData from "./batch6-catalog.json";
import showcaseSelectionData from "./batch6-showcase-selection.json";
import { readFile } from "node:fs/promises";
import type { CompactEasProjection, OfrDocument, OfrFixture } from "../../types/ofr";
import type { ChainStatus } from "../../types/verification";

export interface ShowcaseSelectionEntry {
  assetSlug: string;
  mode: string;
  receiptDigest: string;
}

export interface ShowcaseSelection {
  cohortId: string;
  declaredAt: string;
  batchId: string;
  issuanceMode: "retrospective" | "contemporaneous";
  network: string;
  selectionPolicy: string;
  receipts: ShowcaseSelectionEntry[];
}

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
  chainStatus: ChainStatus;
  schemaUID?: string;
  attestationUID?: string;
  transactionHash?: string;
  attester?: string;
  blockTimestamp?: number;
}

interface FixtureCatalog {
  batchId: string;
  generatedAt: string;
  receiptCount: number;
  entries: FixtureCatalogEntry[];
}

const catalog = catalogData as FixtureCatalog;
const showcaseSelection = showcaseSelectionData as ShowcaseSelection;
const showcaseDigestSet = new Set(
  showcaseSelection.receipts.map((entry) => entry.receiptDigest),
);
export const fixtureCatalog = catalog;
export const phase1ShowcaseSelection = showcaseSelection;

export function isShowcaseReceipt(receiptDigest: string): boolean {
  return showcaseDigestSet.has(receiptDigest);
}

export function getShowcaseCounts(assetSlug?: string): { selected: number; verified: number } {
  const selectedDigests = new Set(
    showcaseSelection.receipts
      .filter((entry) => !assetSlug || entry.assetSlug === assetSlug)
      .map((entry) => entry.receiptDigest),
  );
  return {
    selected: selectedDigests.size,
    verified: catalog.entries.filter(
      (entry) => selectedDigests.has(entry.receiptDigest) && entry.chainStatus === "verified",
    ).length,
  };
}

export function getAssetFixtureEntries(assetSlug: string): FixtureCatalogEntry[] {
  return catalog.entries.filter((entry) => entry.assetSlug === assetSlug);
}

export function findFixtureEntry(receiptDigest: string): FixtureCatalogEntry | undefined {
  return catalog.entries.find((entry) => entry.receiptDigest === receiptDigest);
}

export async function loadFixture(entry: FixtureCatalogEntry): Promise<OfrFixture> {
  const [documentText, projectionText] = await Promise.all([
    readFile(new URL(entry.documentPath, import.meta.url), "utf8"),
    readFile(new URL(entry.projectionPath, import.meta.url), "utf8"),
  ]);
  return {
    assetSlug: entry.assetSlug,
    forecasterLabel: entry.forecasterLabel,
    dataStatus: "loaded",
    document: JSON.parse(documentText) as OfrDocument,
    projection: JSON.parse(projectionText) as CompactEasProjection,
  };
}
