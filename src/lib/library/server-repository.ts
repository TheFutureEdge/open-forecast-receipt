import "server-only";

import { getLibraryServerFirestore } from "../firestore/server";
import type {
  LibraryManifest,
  LibraryReceipt,
  PublicCollectionCatalogRecord,
  PublicCollectionEntityRecord,
  PublicCollectionRecord,
  PublicEntityDirectoryCatalogRecord,
  PublicEntityDirectoryItem,
  PublicEntityForecastCatalogRecord,
  PublicEntityForecastLedgerCatalogRecord,
  PublicEntityForecastLedgerPartRecord,
  PublicEntityRecord,
  PublicForecastResolverRecord,
  PublicLibraryLandingMetrics,
  PublicLibraryStatsRecord,
  PublicForecasterCatalogRecord,
  PublicForecastRecord,
  PublicForecasterRecord,
  PublicReceiptRecord,
  PublicReceiptResolverRecord,
  PublicTargetRecord,
  PublicPublisherRecord,
  PublicSitemapCatalogManifestRecord,
  PublicSitemapCatalogPartRecord,
  PublicSitemapEntry,
} from "./types";
import { buildForecasterCoverage, summarizeForecasts } from "../forecasters/coverage";
import { publicEntitySlug, publicForecastPublicId, slugifyEntityName, type PublicEntityRouteKind } from "./entityRoutes";
import type { PublicForecastEntityStats, PublicForecastLedgerPage } from "./repository";

function isProductionDeployment(): boolean {
  return process.env.NEXT_PUBLIC_OFL_ENVIRONMENT === "production"
    || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === "oflapp-prod";
}

function publicEntityDirectoryItem(entity: PublicEntityRecord): PublicEntityDirectoryItem {
  const relatedIdentifiers = (entity.relatedEntities || [])
    .filter((related) => related.predicate === "has_market_representation")
    .map((related) => related.displayIdentifier)
    .filter((value): value is string => Boolean(value));
  const preferredIdentifier = ["ticker_venue", "ipulse_symbol", "isin"]
    .map((scheme) => entity.externalIdentifiers?.find((identifier) => identifier.scheme === scheme)?.value)
    .find(Boolean);
  return {
    entityId: entity.entityId,
    entityType: entity.entityType,
    entityClasses: entity.entityClasses,
    canonicalName: entity.canonicalName,
    stableSlug: entity.stableSlug,
    publicSlug: entity.publicSlug,
    aliases: entity.aliases || [],
    displayIdentifier: relatedIdentifiers.length > 0
      ? `${relatedIdentifiers.slice(0, 2).join(" · ")}${relatedIdentifiers.length > 2 ? ` · +${relatedIdentifiers.length - 2}` : ""}`
      : preferredIdentifier || entity.entityId,
    searchTerms: [...new Set((entity.externalIdentifiers || []).flatMap(({ scheme, value }) => [scheme, value]))],
    sameAsCount: entity.sameAs?.length || 0,
    relatedEntityCount: entity.relatedEntities?.length || 0,
    latestActivityAt: entity.lifecycle?.sourceUpdatedAt
      || entity.profile?.observedAt
      || entity.profile?.sourceUpdatedAt
      || entity.source?.sourceUpdatedAt,
    logo: entity.logo,
  };
}

async function readEntityDirectoryCatalog(catalogId: "forecast-subjects" | "organizations"): Promise<PublicEntityDirectoryItem[] | null> {
  const snapshot = await getLibraryServerFirestore().collection("public_entity_directory_catalogs").doc(catalogId).get();
  return snapshot.exists ? (snapshot.data() as PublicEntityDirectoryCatalogRecord).entities : null;
}

async function listPublicEntitiesByClass(entityClass: string): Promise<PublicEntityDirectoryItem[]> {
  const catalogId = entityClass === "forecastable_entity" ? "forecast-subjects" : "organizations";
  const catalog = await readEntityDirectoryCatalog(catalogId).catch(() => null);
  if (catalog) return [...catalog].sort((left, right) => left.canonicalName.localeCompare(right.canonicalName));
  if (isProductionDeployment()) throw new Error(`Required production entity catalog ${catalogId} is missing`);
  const snapshot = await getLibraryServerFirestore()
    .collection("public_entities")
    .where("entityClasses", "array-contains", entityClass)
    .get();
  return snapshot.docs
    .map((document) => document.data() as PublicEntityRecord)
    .map(publicEntityDirectoryItem)
    .sort((left, right) => left.canonicalName.localeCompare(right.canonicalName));
}

export function listPublicForecastableEntitiesServer(): Promise<PublicEntityDirectoryItem[]> {
  return listPublicEntitiesByClass("forecastable_entity");
}

export function listPublicOrganizationsServer(): Promise<PublicEntityDirectoryItem[]> {
  return listPublicEntitiesByClass("organization");
}

export async function getPublicLibraryLandingMetricsServer(): Promise<PublicLibraryLandingMetrics> {
  const db = getLibraryServerFirestore();
  const statsSnapshot = await db.collection("public_library_stats").doc("summary").get().catch(() => null);
  if (statsSnapshot?.exists) {
    const stats = statsSnapshot.data() as PublicLibraryStatsRecord;
    return {
      forecastSubjectCount: stats.forecastSubjectCount,
      receiptCount: stats.receiptCount,
      forecasterCount: stats.forecasterCount,
      selectedProofCount: stats.selectedProofCount,
      verifiedProofCount: stats.verifiedProofCount,
      publishedAt: stats.publishedAt,
    };
  }
  if (isProductionDeployment()) throw new Error("Required production library statistics are missing");
  const [collectionSnapshot, forecasterCountSnapshot] = await Promise.all([
    db.collection("public_collections").doc("batch-6").get(),
    db.collection("public_forecasters").count().get(),
  ]);
  const collection = collectionSnapshot.exists
    ? collectionSnapshot.data() as PublicCollectionRecord
    : null;
  return {
    forecastSubjectCount: collection?.entityCount || 0,
    receiptCount: collection?.receiptCount || 0,
    forecasterCount: forecasterCountSnapshot.data().count,
    selectedProofCount: collection?.selectedProofCount || 0,
    verifiedProofCount: collection?.verifiedProofCount || 0,
    publishedAt: collection?.publishedAt,
  };
}

export async function listPublicForecastersServer(): Promise<PublicForecasterRecord[]> {
  const snapshot = await getLibraryServerFirestore().collection("public_forecasters").get();
  return snapshot.docs
    .map((document) => document.data() as PublicForecasterRecord)
    .sort((left, right) => left.displayName.localeCompare(right.displayName));
}

export async function listPublicForecastsServer(): Promise<PublicForecastRecord[]> {
  const snapshot = await getLibraryServerFirestore().collection("public_forecasts").get();
  return snapshot.docs.map((document) => document.data() as PublicForecastRecord);
}

export async function getPublicForecasterCatalogServer(): Promise<PublicForecasterCatalogRecord> {
  const db = getLibraryServerFirestore();
  const catalog = await db.collection("public_forecaster_catalogs").doc("active").get().catch(() => null);
  if (catalog?.exists) {
    const record = catalog.data() as PublicForecasterCatalogRecord;
    return {
      ...record,
      forecasters: record.forecasters.map(({ taskConfigurationIds: _taskConfigurationIds, subjectAssignmentIds: _subjectAssignmentIds, ...forecaster }) => forecaster),
    };
  }

  if (isProductionDeployment()) throw new Error("Required production forecaster catalog is missing");

  const [forecasters, forecasts] = await Promise.all([
    listPublicForecastersServer(),
    listPublicForecastsServer(),
  ]);
  return {
    catalogVersion: "ofl-public-forecaster-catalog-v0.1.0",
    catalogId: "active",
    generatedAt: new Date(0).toISOString(),
    forecasters: forecasters.map(({ taskConfigurationIds: _taskConfigurationIds, subjectAssignmentIds: _subjectAssignmentIds, ...forecaster }) => forecaster),
    coverage: Object.fromEntries(buildForecasterCoverage(forecasters, forecasts)),
    totals: summarizeForecasts(forecasts),
    publicationStatus: "published",
    visibility: "public",
  };
}

export async function getPublicForecasterServer(routeKey: string): Promise<PublicForecasterRecord | null> {
  const db = getLibraryServerFirestore();
  const direct = await db.collection("public_forecasters").doc(routeKey).get();
  if (direct.exists) return direct.data() as PublicForecasterRecord;
  const bySlug = await db.collection("public_forecasters").where("publicSlug", "==", routeKey).limit(1).get();
  if (!bySlug.empty) return bySlug.docs[0].data() as PublicForecasterRecord;
  const catalog = await getPublicForecasterCatalogServer();
  return catalog.forecasters.find((forecaster) => (
    forecaster.publicSlug === routeKey
    || slugifyEntityName(forecaster.displayName || forecaster.name) === routeKey
  )) || null;
}

export async function getPublicTargetServer(routeKey: string): Promise<PublicTargetRecord | null> {
  const snapshot = await getLibraryServerFirestore().collection("public_targets").doc(routeKey).get();
  return snapshot.exists ? snapshot.data() as PublicTargetRecord : null;
}

export async function getPublicPublisherServer(routeKey: string): Promise<PublicPublisherRecord | null> {
  const db = getLibraryServerFirestore();
  const direct = await db.collection("public_publishers").doc(routeKey).get();
  if (direct.exists) return direct.data() as PublicPublisherRecord;
  const bySlug = await db.collection("public_publishers").where("publicSlug", "==", routeKey).limit(1).get();
  if (!bySlug.empty) return bySlug.docs[0].data() as PublicPublisherRecord;
  return routeKey === "ipulse-ai" ? {
    publisherId: "publisher_future_edge_ipulse_ai",
    publicSlug: "ipulse-ai",
    name: "iPulse AI",
    organizationId: "oflorg_future_edge_group_fze",
    description: "The open agentic investment research platform built by Future Edge Group FZE.",
    websiteUrl: "https://ipulseai.com",
    publicationStatus: "published",
    visibility: "public",
  } : null;
}

export async function listPublicTargetsServer(): Promise<PublicTargetRecord[]> {
  const snapshot = await getLibraryServerFirestore().collection("public_targets").get();
  return snapshot.docs.map((document) => document.data() as PublicTargetRecord)
    .sort((left, right) => left.name.localeCompare(right.name));
}

export async function listPublicPublishersServer(): Promise<PublicPublisherRecord[]> {
  const snapshot = await getLibraryServerFirestore().collection("public_publishers").get();
  const records = snapshot.docs.map((document) => document.data() as PublicPublisherRecord);
  if (records.length === 0) {
    const fallback = await getPublicPublisherServer("ipulse-ai");
    if (fallback) records.push(fallback);
  }
  return records.sort((left, right) => left.name.localeCompare(right.name));
}

export async function listPublicCollectionsServer(): Promise<PublicCollectionRecord[]> {
  const snapshot = await getLibraryServerFirestore().collection("public_collections").get();
  return snapshot.docs.map((document) => {
    const collection = document.data() as PublicCollectionRecord;
    const date = collection.publishedAt.slice(0, 10);
    const batch = collection.collectionId.match(/^batch-(\d+)$/i)?.[1];
    return {
      ...collection,
      publicSlug: collection.publicSlug || `${date}-${batch ? `sb${batch}` : collection.collectionId}`,
      publisherId: collection.publisherId || "publisher_future_edge_ipulse_ai",
      publisherSlug: collection.publisherSlug || "ipulse-ai",
    };
  })
    .sort((left, right) => right.publishedAt.localeCompare(left.publishedAt));
}

export async function getPublicCollectionServer(publisherSlug: string, collectionSlug: string): Promise<PublicCollectionRecord | null> {
  const collections = await listPublicCollectionsServer();
  return collections.find((collection) => (
    (collection.publisherSlug || "ipulse-ai") === publisherSlug
    && (collection.publicSlug || (() => {
      const date = collection.publishedAt.slice(0, 10);
      const batch = collection.collectionId.match(/^batch-(\d+)$/i)?.[1];
      return `${date}-${batch ? `sb${batch}` : collection.collectionId}`;
    })()) === collectionSlug
  )) || null;
}

export async function getPublicForecastByPublicIdServer(forecastPublicId: string): Promise<PublicForecastRecord | null> {
  const db = getLibraryServerFirestore();
  const resolver = await db.collection("public_forecast_resolvers").doc(forecastPublicId).get().catch(() => null);
  if (resolver?.exists) {
    const record = resolver.data() as PublicForecastResolverRecord;
    const forecast = await db.collection("public_forecasts").doc(record.forecastId).get();
    return forecast.exists ? forecast.data() as PublicForecastRecord : null;
  }
  if (isProductionDeployment()) throw new Error(`Required production forecast resolver ${forecastPublicId} is missing`);
  const fallback = await db.collection("public_forecasts").where("forecastPublicId", "==", forecastPublicId).limit(1).get();
  if (!fallback.empty) return fallback.docs[0].data() as PublicForecastRecord;
  // Temporary pre-production compatibility. The production launch gate requires
  // public_forecast_resolvers, so this scan must not be exercised in prod.
  if (forecastPublicId.startsWith("f-") && !isProductionDeployment()) {
    const legacy = await db.collection("public_forecasts").get();
    return legacy.docs.map((document) => document.data() as PublicForecastRecord)
      .find((forecast) => publicForecastPublicId(forecast) === forecastPublicId) || null;
  }
  return null;
}

export async function getPublicReceiptResolverServer(receiptDigest: string): Promise<PublicReceiptResolverRecord | null> {
  const snapshot = await getLibraryServerFirestore().collection("public_receipt_resolvers").doc(receiptDigest).get().catch(() => null);
  if (snapshot?.exists) return snapshot.data() as PublicReceiptResolverRecord;
  if (isProductionDeployment()) throw new Error(`Required production receipt resolver ${receiptDigest} is missing`);
  const forecast = await getLibraryServerFirestore().collection("public_forecasts")
    .where("receiptDigest", "==", receiptDigest)
    .limit(1)
    .get();
  if (forecast.empty) return null;
  const record = forecast.docs[0].data() as PublicForecastRecord;
  return record.forecastPublicId ? {
    receiptDigest,
    forecastPublicId: record.forecastPublicId,
    canonicalPath: "",
    publicationStatus: "published",
    visibility: "public",
  } : null;
}

export async function listPublicForecastStatsByEntityServer(): Promise<Map<string, PublicForecastEntityStats>> {
  const db = getLibraryServerFirestore();
  const catalogSnapshots = await db.collection("public_collection_catalogs").get().catch(() => null);
  if (catalogSnapshots && !catalogSnapshots.empty) {
    const stats = new Map<string, PublicForecastEntityStats>();
    for (const snapshot of catalogSnapshots.docs) {
      const catalog = snapshot.data() as PublicCollectionCatalogRecord;
      for (const entity of catalog.manifest.entities) {
        const entityId = (entity as PublicCollectionEntityRecord).entityId;
        if (!entityId) continue;
        const forecastCount = entity.loadedCount ?? entity.advisorCount ?? 0;
        const current = stats.get(entityId);
        stats.set(entityId, {
          forecastCount: (current?.forecastCount || 0) + forecastCount,
          latestActivityAt: [current?.latestActivityAt, catalog.generatedAt].filter(Boolean).sort().at(-1),
        });
      }
    }
    return stats;
  }

  if (isProductionDeployment()) throw new Error("Required production collection catalogs are missing");

  const [entitySnapshots, collectionSnapshots] = await Promise.all([
    db.collection("public_collection_entities").get(),
    db.collection("public_collections").get(),
  ]);
  const activity = new Map<string, string>();
  for (const snapshot of collectionSnapshots.docs) {
    const record = snapshot.data() as PublicCollectionRecord;
    if (record.publishedAt) activity.set(record.collectionId, record.publishedAt);
  }
  const stats = new Map<string, PublicForecastEntityStats>();
  for (const snapshot of entitySnapshots.docs) {
    const record = snapshot.data() as PublicCollectionEntityRecord;
    const current = stats.get(record.entityId);
    stats.set(record.entityId, {
      forecastCount: (current?.forecastCount || 0) + (record.loadedCount ?? record.advisorCount ?? 0),
      latestActivityAt: [current?.latestActivityAt, activity.get(record.collectionId)].filter(Boolean).sort().at(-1),
    });
  }
  return stats;
}

export async function getPublicEntityServer(routeKey: string, routeKind?: PublicEntityRouteKind): Promise<PublicEntityRecord | null> {
  const db = getLibraryServerFirestore();
  const direct = await db.collection("public_entities").doc(routeKey).get();
  if (direct.exists) return direct.data() as PublicEntityRecord;

  const [publicSlug, stableSlug] = await Promise.all([
    db.collection("public_entities").where("publicSlug", "==", routeKey).limit(1).get(),
    db.collection("public_entities").where("stableSlug", "==", routeKey).limit(1).get(),
  ]);
  if (!publicSlug.empty) return publicSlug.docs[0].data() as PublicEntityRecord;
  if (!stableSlug.empty) return stableSlug.docs[0].data() as PublicEntityRecord;

  // The initial Batch 6 publication used aliases such as "pepsi" while the
  // governed identity uses "pepsico-pep". Resolve that historical membership
  // by exact document ID, without opening a production collection scan.
  const legacyMember = await db.collection("public_collection_entities").doc(`batch-6__${routeKey}`).get();
  const legacyEntityId = legacyMember.exists ? legacyMember.data()?.entityId : undefined;
  if (legacyEntityId) {
    const legacyEntity = await db.collection("public_entities").doc(legacyEntityId).get();
    if (legacyEntity.exists) return legacyEntity.data() as PublicEntityRecord;
  }

  if (isProductionDeployment()) return null;

  if (routeKind === "listed-securities") return null;
  const snapshot = routeKind && ["corporations", "investment-funds", "organizations"].includes(routeKind)
    ? await db.collection("public_entities").where("entityClasses", "array-contains", "organization").get()
    : await db.collection("public_entities").get();
  return snapshot.docs
    .map((document) => document.data() as PublicEntityRecord)
    .find((entity) => publicEntitySlug(entity) === routeKey) || null;
}

export async function listEntityCollectionsServer(entityId: string): Promise<PublicCollectionEntityRecord[]> {
  const snapshot = await getLibraryServerFirestore()
    .collection("public_collection_entities")
    .where("entityId", "==", entityId)
    .get();
  return snapshot.docs.map((document) => document.data() as PublicCollectionEntityRecord);
}

export async function getLibraryManifestServer(collectionId: string): Promise<LibraryManifest | null> {
  const db = getLibraryServerFirestore();
  const catalog = await db.collection("public_collection_catalogs").doc(collectionId).get().catch(() => null);
  if (catalog?.exists) return (catalog.data() as PublicCollectionCatalogRecord).manifest;
  if (isProductionDeployment()) throw new Error(`Required production collection catalog ${collectionId} is missing`);

  const [collection, collectionEntities, publicEntities] = await Promise.all([
    db.collection("public_collections").doc(collectionId).get(),
    db.collection("public_collection_entities").where("collectionId", "==", collectionId).get(),
    db.collection("public_entities").where("entityClasses", "array-contains", "forecastable_entity").get(),
  ]);
  if (!collection.exists) return null;
  const record = collection.data() as PublicCollectionRecord;
  const entitiesById = new Map(publicEntities.docs.map((document) => {
    const entity = document.data() as PublicEntityRecord;
    return [entity.entityId, entity] as const;
  }));
  const entities = collectionEntities.docs
    .map((document) => document.data() as PublicCollectionEntityRecord)
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map(({ collectionId: _collectionId, entityId, sortOrder: _sortOrder, publicationStatus: _publicationStatus, visibility: _visibility, ...entity }) => ({
      ...entity,
      logoUrl: entitiesById.get(entityId)?.logo?.url,
      logoAlt: entitiesById.get(entityId)?.logo?.alt,
    }));
  return {
    batchId: record.batchId,
    batchLabel: record.batchLabel,
    description: record.description,
    entities,
    receiptCount: record.receiptCount,
    selectedProofCount: record.selectedProofCount,
    verifiedProofCount: record.verifiedProofCount,
  };
}

export async function getLibraryEntityServer(collectionId: string, routeSlug: string): Promise<PublicCollectionEntityRecord | null> {
  const db = getLibraryServerFirestore();
  const direct = await db.collection("public_collection_entities").doc(`${collectionId}__${routeSlug}`).get();
  if (direct.exists) return direct.data() as PublicCollectionEntityRecord;
  const aliases = await db.collection("public_collection_entities")
    .where("collectionId", "==", collectionId)
    .where("aliases", "array-contains", routeSlug)
    .limit(1)
    .get();
  return aliases.empty ? null : aliases.docs[0].data() as PublicCollectionEntityRecord;
}

export async function listLibraryForecastsServer(collectionId: string, entityId: string): Promise<PublicForecastRecord[]> {
  const db = getLibraryServerFirestore();
  const catalog = await db.collection("public_entity_forecast_catalogs").doc(`${collectionId}__${entityId}`).get().catch(() => null);
  if (catalog?.exists) {
    return [...(catalog.data() as PublicEntityForecastCatalogRecord).forecasts]
      .sort((left, right) => left.sortOrder - right.sortOrder);
  }
  if (isProductionDeployment()) throw new Error(`Required production entity forecast catalog ${collectionId}__${entityId} is missing`);
  const snapshot = await db.collection("public_forecasts")
    .where("collectionId", "==", collectionId)
    .where("entityId", "==", entityId)
    .get();
  return snapshot.docs
    .map((document) => document.data() as PublicForecastRecord)
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

function sortForecasts(forecasts: PublicForecastRecord[]): PublicForecastRecord[] {
  return [...forecasts].sort((left, right) => right.forecastCreatedAt.localeCompare(left.forecastCreatedAt)
    || left.sortOrder - right.sortOrder
    || left.forecastId.localeCompare(right.forecastId));
}

export async function listLibraryForecastLedgerPageServer(entityId: string, beforePartNumber?: number): Promise<PublicForecastLedgerPage> {
  const db = getLibraryServerFirestore();
  let partsQuery = db.collection("public_entity_forecast_ledgers").doc(entityId).collection("parts")
    .orderBy("partNumber", "desc");
  if (beforePartNumber !== undefined) partsQuery = partsQuery.where("partNumber", "<", beforePartNumber);
  const partSnapshots = await partsQuery.limit(2).get().catch(() => null);
  if (partSnapshots && !partSnapshots.empty) {
    const parts = partSnapshots.docs.map((document) => document.data() as PublicEntityForecastLedgerPartRecord);
    const forecasts = sortForecasts(parts.flatMap((part) => part.forecasts));
    const partNumbers = parts.map((part) => part.partNumber).sort((left, right) => right - left);
    const oldest = Math.min(...partNumbers);
    return {
      forecasts,
      partNumbers,
      hasOlderParts: oldest > 1,
      nextBeforePartNumber: oldest > 1 ? oldest : undefined,
      totalForecastCount: parts[0]?.totalForecastCount ?? forecasts.length,
      source: "parts",
    };
  }
  if (beforePartNumber !== undefined) {
    return { forecasts: [], partNumbers: [], hasOlderParts: false, totalForecastCount: 0, source: "parts" };
  }
  if (isProductionDeployment()) throw new Error(`Required production forecast ledger ${entityId} is missing`);
  const legacy = await db.collection("public_entity_forecast_ledgers").doc(entityId).get().catch(() => null);
  if (legacy?.exists && Array.isArray((legacy.data() as PublicEntityForecastLedgerCatalogRecord).forecasts)) {
    const record = legacy.data() as PublicEntityForecastLedgerCatalogRecord;
    const forecasts = sortForecasts(record.forecasts);
    return { forecasts, partNumbers: [], hasOlderParts: false, totalForecastCount: record.forecastCount || forecasts.length, source: "legacy_catalog" };
  }
  const snapshot = await db.collection("public_forecasts").where("entityId", "==", entityId).get();
  const forecasts = sortForecasts(snapshot.docs.map((document) => document.data() as PublicForecastRecord));
  return { forecasts, partNumbers: [], hasOlderParts: false, totalForecastCount: forecasts.length, source: "documents" };
}

export async function getLibraryReceiptServer(receiptDigest: string): Promise<LibraryReceipt | null> {
  const snapshot = await getLibraryServerFirestore().collection("public_receipts").doc(receiptDigest).get();
  if (!snapshot.exists) return null;
  const record = snapshot.data() as PublicReceiptRecord;
  return { document: record.document, projection: record.projection };
}

/** Read the small, materialized sitemap index instead of listing thousands of forecasts. */
export async function listPublicSitemapEntriesServer(): Promise<PublicSitemapEntry[]> {
  const db = getLibraryServerFirestore();
  const manifestSnapshot = await db.collection("public_sitemap_catalogs").doc("site").get().catch(() => null);
  if (!manifestSnapshot?.exists) {
    if (isProductionDeployment()) throw new Error("Required production sitemap catalog is missing");
    return [];
  }
  const manifest = manifestSnapshot.data() as PublicSitemapCatalogManifestRecord;
  const partsSnapshot = await db.collection("public_sitemap_catalogs").doc("site").collection("parts")
    .orderBy("partNumber", "asc")
    .limit(manifest.partCount)
    .get();
  if (partsSnapshot.size !== manifest.partCount) {
    throw new Error(`Sitemap catalog expected ${manifest.partCount} parts but found ${partsSnapshot.size}`);
  }
  const entries = partsSnapshot.docs.flatMap((document) => (document.data() as PublicSitemapCatalogPartRecord).entries);
  if (entries.length !== manifest.entryCount) {
    throw new Error(`Sitemap catalog expected ${manifest.entryCount} entries but found ${entries.length}`);
  }
  return entries;
}
