import type { ChainStatus, CoverageStatus } from "./verification";

export interface BatchManifestAsset {
  slug: string;
  aliases?: string[];
  displaySymbol: string;
  name: string;
  marketIdentifier: string;
  coverageStatus: CoverageStatus;
  chainStatus: ChainStatus;
  advisorCount: number;
  loadedCount: number;
  showcaseSelectionCount?: number;
  proofCount?: number;
}

export interface BatchManifest {
  batchId: string;
  batchLabel: string;
  description: string;
  assets: BatchManifestAsset[];
}
