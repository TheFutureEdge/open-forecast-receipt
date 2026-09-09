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
  publicSlug?: string;
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
  publicSlug?: string;
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
  publicSlug?: string;
  publisherId?: string;
  publisherSlug?: string;
  publicationStatus: typeof PUBLICATION_STATUS;
  visibility: typeof PUBLIC_VISIBILITY;
  entityCount: number;
  receiptCount: number;
  selectedProofCount: number;
  verifiedProofCount: number;
  publishedAt: string;
}

/** Small, server-computed evidence set used on the public landing page. */
export interface PublicLibraryLandingMetrics {
  forecastSubjectCount: number;
  receiptCount: number;
  forecasterCount: number;
  selectedProofCount: number;
  verifiedProofCount: number;
  publishedAt?: string;
}

/** Precomputed site-wide totals. Production pages never aggregate raw forecast documents. */
export interface PublicLibraryStatsRecord extends PublicLibraryLandingMetrics {
  statsVersion: string;
  generatedAt: string;
  collectionCount: number;
  publisherCount: number;
  targetCount: number;
  publicationStatus: typeof PUBLICATION_STATUS;
  visibility: typeof PUBLIC_VISIBILITY;
}

export interface PublicSitemapEntry {
  path: string;
  lastModified?: string;
}

/** Bounded sitemap parts keep several thousand forecast URLs to a few reads. */
export interface PublicSitemapCatalogPartRecord {
  catalogVersion: string;
  catalogId: "site";
  partNumber: number;
  partCount: number;
  generatedAt: string;
  entryCount: number;
  entries: PublicSitemapEntry[];
  publicationStatus: typeof PUBLICATION_STATUS;
  visibility: typeof PUBLIC_VISIBILITY;
}

export interface PublicSitemapCatalogManifestRecord {
  catalogVersion: string;
  catalogId: "site";
  generatedAt: string;
  entryCount: number;
  partCount: number;
  publicationStatus: typeof PUBLICATION_STATUS;
  visibility: typeof PUBLIC_VISIBILITY;
}

export interface PublicCollectionEntityRecord extends BatchManifestEntity {
  collectionId: string;
  entityId: string;
  sortOrder: number;
  publicationStatus: typeof PUBLICATION_STATUS;
  visibility: typeof PUBLIC_VISIBILITY;
}

/** Read-optimized collection projection. Authoritative records remain separate. */
export interface PublicCollectionCatalogRecord {
  catalogVersion: string;
  collectionId: string;
  generatedAt: string;
  manifest: LibraryManifest;
  publicationStatus: typeof PUBLICATION_STATUS;
  visibility: typeof PUBLIC_VISIBILITY;
}

export interface PublicForecastRecord {
  /** Frozen on first publication; display names and catalog reorganizations never rebuild this path. */
  canonicalPath?: string;
  revisionStorageVersion?: string;
  /**
   * Stable public forecast identity. Production publishers must persist this
   * independently from the receipt digest so corrections can issue new
   * receipts without silently changing the forecast URL.
   */
  forecastPublicId?: string;
  /** Publisher-scoped source revision used when deriving the stable public ID. */
  sourceRevisionId?: string | number;
  /** Optional publisher grouping. Individual submissions do not require a collection. */
  collectionId?: string;
  publisherId?: string;
  publisherSlug?: string;
  entityId: string;
  entitySlug: string;
  forecasterId: string;
  forecasterPublicSlug?: string;
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
  /** Immutable, governed public identifier for the target definition. */
  targetSlug?: string;
  subjectCategory?: string;
  forecastCreatedAt: string;
  /** Start of the forecast horizon; normally the receipt temporal anchor. */
  horizonStartAt?: string;
  horizonEndAt: string;
  executionProvenance?: {
    controlFlow?: "single_model_invocation" | "fixed_sequence" | "adaptive_loop" | "multi_agent_orchestration" | "human_process";
    contextAcquisition?: Array<"provided_context" | "retrieval" | "web_search" | "tool_output" | "human_input">;
    transportProtocol?: string;
    declaredAt?: string;
    observedAt?: string;
    provenanceStatus?: "observed" | "declared" | "reconstructed" | "unknown";
  };
  /** Trusted public page where the forecast was originally published. This index metadata is not part of the sealed receipt payload. */
  originalSource?: PublicForecastOriginalSource;
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

export interface PublicForecastOriginalSource {
  publisherName: string;
  label: string;
  url: string;
  publicationId?: string;
  publicationDate?: string;
  /** Optional current subject context, supplied by this publisher's adapter. */
  subjectUrl?: string;
  subjectLabel?: string;
}

/** Read-optimized forecast summaries for one collection/entity pair. */
export interface PublicEntityForecastCatalogRecord {
  catalogVersion: string;
  catalogId: string;
  collectionId: string;
  entityId: string;
  entitySlug: string;
  generatedAt: string;
  forecastCount: number;
  forecasts: PublicForecastRecord[];
  publicationStatus: typeof PUBLICATION_STATUS;
  visibility: typeof PUBLIC_VISIBILITY;
}

/** Read-optimized, cross-publisher ledger for every forecast attached to one entity. */
export interface PublicEntityForecastLedgerCatalogRecord {
  catalogVersion: string;
  entityId: string;
  generatedAt: string;
  forecastCount: number;
  forecasts: PublicForecastRecord[];
  publicationStatus: typeof PUBLICATION_STATUS;
  visibility: typeof PUBLIC_VISIBILITY;
}

export interface PublicEntityForecastLedgerManifestRecord {
  catalogVersion: string;
  entityId: string;
  generatedAt: string;
  forecastCount: number;
  partCount: number;
  latestPartNumber: number;
  latestPartId?: string;
  latestForecastCreatedAt?: string;
  initialReadPartCount: 2;
  publicationStatus: typeof PUBLICATION_STATUS;
  visibility: typeof PUBLIC_VISIBILITY;
}

export interface PublicEntityForecastLedgerPartRecord {
  catalogVersion: string;
  entityId: string;
  partNumber: number;
  partCount: number;
  totalForecastCount: number;
  isLatest: boolean;
  generatedAt: string;
  firstForecastCreatedAt?: string;
  lastForecastCreatedAt?: string;
  forecastCount: number;
  forecasts: PublicForecastRecord[];
  publicationStatus: typeof PUBLICATION_STATUS;
  visibility: typeof PUBLIC_VISIBILITY;
}

/** Compact entity data required by the directory; detail pages use PublicEntityRecord. */
export interface PublicEntityDirectoryItem {
  entityId: string;
  entityType: string;
  entityClasses: string[];
  canonicalName: string;
  stableSlug: string;
  publicSlug?: string;
  aliases: string[];
  displayIdentifier: string;
  searchTerms: string[];
  sameAsCount: number;
  relatedEntityCount: number;
  latestActivityAt?: string;
  logo?: PublicEntityMedia;
}

export interface PublicEntityDirectoryCatalogRecord {
  catalogVersion: string;
  catalogId: "forecast-subjects" | "organizations";
  generatedAt: string;
  entityCount: number;
  entities: PublicEntityDirectoryItem[];
  publicationStatus: typeof PUBLICATION_STATUS;
  visibility: typeof PUBLIC_VISIBILITY;
}

export interface PublicForecasterRecord {
  forecasterId: string;
  /** Immutable URL locator assigned by the publisher. */
  publicSlug?: string;
  currentVersionId?: string;
  forecasterKind?: "human" | "ai" | "quant_model" | "ensemble" | "hybrid" | "organization";
  implementationKind?: "llm" | "statistical_model" | "machine_learning_model" | "rules_engine" | "human" | "hybrid";
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
  publishedSubjectCategories?: string[];
  taskConfigurationIds?: string[];
  subjectAssignmentIds?: string[];
  sameAs?: string[];
  /** Optional governed profile media. Forecast receipts never require or embed this presentation asset. */
  profileMedia?: {
    kind: "avatar" | "logo" | "generated_mark";
    url: string;
    alt: string;
    contentDigestSha256?: string;
    rightsStatement?: string;
  };
  publicationStatus: typeof PUBLICATION_STATUS;
  visibility: typeof PUBLIC_VISIBILITY;
}

export interface PublicReceiptResolverRecord {
  receiptDigest: string;
  forecastPublicId: string;
  canonicalPath: string;
  publicationStatus: typeof PUBLICATION_STATUS;
  visibility: typeof PUBLIC_VISIBILITY;
}

export interface PublicForecastResolverRecord extends PublicReceiptResolverRecord {
  forecastId: string;
  entityId: string;
}

export interface PublicTargetRecord {
  targetId: string;
  publicSlug: string;
  name: string;
  description?: string;
  dimension?: string;
  unit?: string;
  publicationStatus: typeof PUBLICATION_STATUS;
  visibility: typeof PUBLIC_VISIBILITY;
}

export interface PublicPublisherRecord {
  publisherId: string;
  publicSlug: string;
  name: string;
  organizationId?: string;
  description?: string;
  websiteUrl?: string;
  publicationStatus: typeof PUBLICATION_STATUS;
  visibility: typeof PUBLIC_VISIBILITY;
}

export interface PublicForecasterCoverage {
  forecasts: number;
  entities: number;
  modes: string[];
  publishedSubjectCategories: string[];
  proofSelected: number;
  proofVerified: number;
  taskConfigurations: number;
  subjectAssignments: number;
}

/** Compact read model for the public forecaster directory. */
export interface PublicForecasterCatalogRecord {
  catalogVersion: string;
  catalogId: "active";
  generatedAt: string;
  forecasters: PublicForecasterRecord[];
  coverage: Record<string, PublicForecasterCoverage>;
  totals: {
    forecasts: number;
    entities: number;
    proofVerified: number;
  };
  publicationStatus: typeof PUBLICATION_STATUS;
  visibility: typeof PUBLIC_VISIBILITY;
}

export interface PublicReceiptRecord {
  publisherId?: string;
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
  originalSource?: PublicForecastOriginalSource;
  document: OfrDocument;
  projection: CompactEasProjection;
  publicationStatus: typeof PUBLICATION_STATUS;
  visibility: typeof PUBLIC_VISIBILITY;
}

export interface LibraryReceipt {
  document: OfrDocument;
  projection: CompactEasProjection;
  entityId?: string;
  publisherId?: string;
  originalSource?: PublicForecastOriginalSource;
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
