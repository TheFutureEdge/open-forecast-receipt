import type { CompactEasProjection, OfrDocument } from "../../types/ofr";
import type { BatchManifest, BatchManifestAsset } from "../../types/manifest";
import type { ChainStatus } from "../../types/verification";

export const PUBLICATION_STATUS = "published" as const;
export const PUBLIC_VISIBILITY = "public" as const;

export interface PublicCollectionRecord extends Omit<BatchManifest, "assets"> {
  collectionId: string;
  publicationStatus: typeof PUBLICATION_STATUS;
  visibility: typeof PUBLIC_VISIBILITY;
  subjectCount: number;
  receiptCount: number;
  selectedProofCount: number;
  verifiedProofCount: number;
  publishedAt: string;
}

export interface PublicCollectionSubjectRecord extends BatchManifestAsset {
  collectionId: string;
  subjectId: string;
  sortOrder: number;
  publicationStatus: typeof PUBLICATION_STATUS;
  visibility: typeof PUBLIC_VISIBILITY;
}

export interface PublicForecastRecord {
  collectionId: string;
  subjectId: string;
  subjectSlug: string;
  forecasterId: string;
  forecasterLabel: string;
  forecaster: {
    type: string;
    sourceName: string;
    displayName: string;
    description: string;
    implementationLabel: string;
    modelName?: string;
    modelProvider?: string;
    reviewStatus: string;
    reviewerCount: number;
    humanReviewerCount: number;
  };
  forecastId: string;
  receiptDigest: string;
  targetName: string;
  forecastCreatedAt: string;
  horizonEndAt: string;
  sortOrder: number;
  chainStatus: ChainStatus;
  showcaseSelected: boolean;
  schemaUID?: string;
  attestationUID?: string;
  transactionHash?: string;
  attester?: string;
  blockTimestamp?: number;
  publicationStatus: typeof PUBLICATION_STATUS;
  visibility: typeof PUBLIC_VISIBILITY;
}

export interface PublicReceiptRecord {
  collectionId: string;
  subjectId: string;
  subjectSlug: string;
  forecasterId: string;
  forecastId: string;
  receiptDigest: string;
  specVersion: string;
  profiles: string[];
  issuedAt: string;
  forecastCreatedAt: string;
  horizonEndAt: string;
  document: OfrDocument;
  projection: CompactEasProjection;
  publicationStatus: typeof PUBLICATION_STATUS;
  visibility: typeof PUBLIC_VISIBILITY;
}

export interface LibraryReceipt {
  document: OfrDocument;
  projection: CompactEasProjection;
}

export interface LibraryShowcaseCounts {
  selected: number;
  verified: number;
}

export interface LibraryManifest extends BatchManifest {
  receiptCount: number;
  selectedProofCount: number;
  verifiedProofCount: number;
}
