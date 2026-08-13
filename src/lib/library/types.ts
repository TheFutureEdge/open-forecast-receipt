import type { CompactEasProjection, OfrDocument } from "../../types/ofr";
import type { BatchManifest, BatchManifestEntity } from "../../types/manifest";
import type { ChainStatus } from "../../types/verification";

export const PUBLICATION_STATUS = "published" as const;
export const PUBLIC_VISIBILITY = "public" as const;

export interface PublicEntityIdentifier {
  scheme: string;
  value: string;
  canonicalUri?: string;
  matchType?: string;
  verificationStatus?: string;
}

export interface PublicEntityClassification {
  scheme: string;
  code: string;
}

export interface PublicEntityMedia {
  mediaAssetId: string;
  role: string;
  url: string;
  alt: string;
  mimeType?: string;
  width?: number;
  height?: number;
  contentDigestSha256?: string;
  sourceSystem?: string;
  governanceStatus?: string;
}

export interface PublicEntityProfile {
  officialWebsiteUrl?: string;
  countryCode?: string;
  sector?: string;
  industry?: string;
  gicsSector?: string;
  gicsIndustry?: string;
  chiefExecutiveName?: string;
  chiefExecutiveBirthYear?: number;
  fullTimeEmployees?: number;
  ipoDate?: string;
  sourceProvider?: string;
  sourceUpdatedAt?: string;
  observedAt?: string;
}

export interface PublicRelatedEntity {
  predicate: "is_market_representation_of" | "has_market_representation" | "listed_or_quoted_on";
  entityId: string;
  canonicalName: string;
  stableSlug: string;
  entityType: string;
  displayIdentifier?: string;
  schemaTickerSymbol?: string;
  logoUrl?: string;
}

export interface PublicEntityRecord {
  entityId: string;
  currentVersionId: string;
  entityType: string;
  entityClasses: string[];
  canonicalName: string;
  description?: string;
  stableSlug: string;
  aliases: string[];
  classifications: PublicEntityClassification[];
  schemaOrgTypes: string[];
  externalIdentifiers: PublicEntityIdentifier[];
  sameAs: string[];
  lifecycle?: {
    status: "active" | "deprecated" | "inactive";
    sourcePulseStatus?: string;
    sourceOverallStatus?: string;
    sourceUpdatedAt?: string;
  };
  logo?: PublicEntityMedia;
  profile?: PublicEntityProfile;
  relatedEntities?: PublicRelatedEntity[];
  source?: {
    system?: string;
    table?: string;
    sourceId?: string;
    sourceVersion?: number;
    sourceUpdatedAt?: string;
    predictionCohort?: { scoringBatch?: number };
  };
  publicationStatus: typeof PUBLICATION_STATUS;
  visibility: typeof PUBLIC_VISIBILITY;
}

export interface PublicCollectionRecord extends Omit<BatchManifest, "entities"> {
  collectionId: string;
  publicationStatus: typeof PUBLICATION_STATUS;
  visibility: typeof PUBLIC_VISIBILITY;
  entityCount: number;
  receiptCount: number;
  selectedProofCount: number;
  verifiedProofCount: number;
  publishedAt: string;
}

export interface PublicCollectionEntityRecord extends BatchManifestEntity {
  collectionId: string;
  entityId: string;
  sortOrder: number;
  publicationStatus: typeof PUBLICATION_STATUS;
  visibility: typeof PUBLIC_VISIBILITY;
}

export interface PublicForecastRecord {
  collectionId: string;
  entityId: string;
  entitySlug: string;
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
  forecasterMode?: string;
  taskConfigurationId?: string;
  subjectAssignmentId?: string;
  receiptDigest: string;
  targetName: string;
  subjectCategory?: string;
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

export interface PublicForecasterRecord {
  forecasterId: string;
  entityScope?: "global" | "platform";
  profileType?: "ai_forecaster_profile" | "human_forecaster_profile" | "algorithm_forecaster_profile" | "organization_forecaster_profile";
  type: string;
  name: string;
  personaLabel?: string;
  displayName: string;
  description: string;
  typeLabel: string;
  architectureAuthors?: unknown[];
  model?: {
    name?: string;
    provider?: string;
    apiIdentifier?: string;
  } | null;
  reviewCapabilities?: string[];
  publisherOrganization?: {
    organizationId: string;
    name: string;
    schemaOrgType: "Organization";
  };
  publisherTeam?: {
    teamId: string;
    name: string;
    product: string;
  };
  sourceProfile?: {
    sourceSystem: string;
    sourceType: "ai_analyst" | "human_forecaster" | "algorithm" | "organization";
    analystId?: string;
  };
  modes?: string[];
  specializations?: string[];
  taskConfigurationIds?: string[];
  subjectAssignmentIds?: string[];
  sameAs?: string[];
  publicationStatus: typeof PUBLICATION_STATUS;
  visibility: typeof PUBLIC_VISIBILITY;
}

export interface PublicReceiptRecord {
  collectionId: string;
  entityId: string;
  entitySlug: string;
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
