import type { CoverageStatus } from "./verification";

export interface BatchManifestAsset {
  slug: string;
  aliases?: string[];
  displaySymbol: string;
  name: string;
  marketIdentifier: string;
  coverageStatus: CoverageStatus;
  chainStatus: "not_issued";
  advisorCount: number;
  loadedCount: number;
}

export interface BatchManifest {
  batchId: string;
  batchLabel: string;
  description: string;
  assets: BatchManifestAsset[];
}
