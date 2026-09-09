import type { ChainStatus, CoverageStatus } from "./verification";

export interface BatchManifestEntity {
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
  logoUrl?: string;
  logoAlt?: string;
}

export interface BatchManifest {
  batchId: string;
  batchLabel: string;
  description: string;
  presentation?: {
    title: string;
    publisherName: string;
    description: string;
    tags: string[];
    forecastDateStart: string;
    forecastDateEnd: string;
  };
  entities: BatchManifestEntity[];
}
