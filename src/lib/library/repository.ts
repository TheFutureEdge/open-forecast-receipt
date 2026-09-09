import { getCatalogCollectionClient, getCatalogGenerationClient } from "./catalog-client";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { getLibraryFirestore } from "../firebase/client";
import type {
  LibraryManifest,
  LibraryReceipt,
  LibraryShowcaseCounts,
  PublicCollectionRecord,
  PublicCollectionEntityRecord,
  PublicCollectionCatalogRecord,
  PublicEntityDirectoryCatalogRecord,
  PublicEntityDirectoryItem,
  PublicEntityRecord,
  PublicEntityForecastCatalogRecord,
  PublicEntityForecastLedgerCatalogRecord,
  PublicEntityForecastLedgerPartRecord,
  PublicForecastRecord,
  PublicForecasterRecord,
  PublicReceiptRecord,
} from "./types";
import { publicEntitySlug } from "./entityRoutes";
import type { PublicEntityRouteKind } from "./entityRoutes";

export async function listPublicForecasters(): Promise<PublicForecasterRecord[]> {
  const snapshots = await getDocs((await getCatalogCollectionClient("public_forecasters")));
  return snapshots.docs
    .map((snapshot) => snapshot.data() as PublicForecasterRecord)
    .sort((left, right) => left.displayName.localeCompare(right.displayName));
}

export async function listPublicForecasts(): Promise<PublicForecastRecord[]> {
  const snapshots = await getDocs(collection(getLibraryFirestore(), "public_forecasts"));
  return snapshots.docs.map((snapshot) => snapshot.data() as PublicForecastRecord);
}

async function readEntityDirectoryCatalog(catalogId: "forecast-subjects" | "organizations"): Promise<PublicEntityDirectoryItem[] | null> {
  try {
    const snapshot = await getDoc(doc(await getCatalogCollectionClient("public_entity_directory_catalogs"), catalogId));
    if (!snapshot.exists()) return null;
    return (snapshot.data() as PublicEntityDirectoryCatalogRecord).entities;
  } catch {
    // Transitional fallback until catalog rules/documents have been promoted.
    return null;
  }
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

async function listPublicEntitiesByClass(entityClass: string): Promise<PublicEntityDirectoryItem[]> {
  const catalogId = entityClass === "forecastable_entity" ? "forecast-subjects" : "organizations";
  const catalog = await readEntityDirectoryCatalog(catalogId);
  if (catalog) return [...catalog].sort((left, right) => left.canonicalName.localeCompare(right.canonicalName));
  const snapshots = await getDocs(query(
    collection(getLibraryFirestore(), "public_entities"),
    where("entityClasses", "array-contains", entityClass),
  ));
  return snapshots.docs
    .map((snapshot) => snapshot.data() as PublicEntityRecord)
    .map(publicEntityDirectoryItem)
    .sort((left, right) => left.canonicalName.localeCompare(right.canonicalName));
}

export function listPublicForecastableEntities(): Promise<PublicEntityDirectoryItem[]> {
  return listPublicEntitiesByClass("forecastable_entity");
}

export function listPublicOrganizations(): Promise<PublicEntityDirectoryItem[]> {
  return listPublicEntitiesByClass("organization");
}

export async function listPublicForecastCountsByEntity(): Promise<Map<string, number>> {
  const stats = await listPublicForecastStatsByEntity();
  return new Map([...stats].map(([entityId, value]) => [entityId, value.forecastCount]));
}

export interface PublicForecastEntityStats {
  forecastCount: number;
  latestActivityAt?: string;
}

/** Aggregate active receipt counts and the newest public collection activity for each entity. */
export async function listPublicForecastStatsByEntity(): Promise<Map<string, PublicForecastEntityStats>> {
  const db = getLibraryFirestore();
  const catalogSnapshots = await getDocs((await getCatalogCollectionClient("public_collection_catalogs"))).catch(() => null);
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
  const [entitySnapshots, collectionSnapshots] = await Promise.all([
    getDocs(collection(db, "public_collection_entities")),
    getDocs((await getCatalogCollectionClient("public_collections"))),
  ]);
  const collectionActivity = new Map<string, string>();
  for (const snapshot of collectionSnapshots.docs) {
    const record = snapshot.data() as PublicCollectionRecord;
    if (record.publishedAt) collectionActivity.set(record.collectionId, record.publishedAt);
  }

  const stats = new Map<string, PublicForecastEntityStats>();
  for (const snapshot of entitySnapshots.docs) {
    const record = snapshot.data() as PublicCollectionEntityRecord;
    const forecastCount = record.loadedCount ?? record.advisorCount ?? 0;
    const latestActivityAt = collectionActivity.get(record.collectionId);
    const current = stats.get(record.entityId);
    stats.set(record.entityId, {
      forecastCount: (current?.forecastCount || 0) + forecastCount,
      latestActivityAt: [current?.latestActivityAt, latestActivityAt]
        .filter((value): value is string => Boolean(value))
        .sort()
        .at(-1),
    });
  }
  return stats;
}

export async function getPublicEntity(routeKey: string, routeKind?: PublicEntityRouteKind): Promise<PublicEntityRecord | null> {
  const db = getLibraryFirestore();
  const directSnapshot = await getDoc(doc(db, "public_entities", routeKey));
  if (directSnapshot.exists()) return directSnapshot.data() as PublicEntityRecord;

  const [publicSlugSnapshots, legacySlugSnapshots] = await Promise.all([
    getDocs(query(
      collection(db, "public_entities"),
      where("publicSlug", "==", routeKey),
    )),
    getDocs(query(
      collection(db, "public_entities"),
      where("stableSlug", "==", routeKey),
    )),
  ]);
  if (!publicSlugSnapshots.empty) return publicSlugSnapshots.docs[0].data() as PublicEntityRecord;
  if (!legacySlugSnapshots.empty) return legacySlugSnapshots.docs[0].data() as PublicEntityRecord;

  // Transitional fallback for catalogs published before publicSlug was added.
  if (routeKind === "listed-securities") return null;
  const snapshots = routeKind && ["corporations", "investment-funds", "organizations"].includes(routeKind)
    ? await getDocs(query(collection(db, "public_entities"), where("entityClasses", "array-contains", "organization")))
    : await getDocs(collection(db, "public_entities"));
  return snapshots.docs
    .map((snapshot) => snapshot.data() as PublicEntityRecord)
    .find((entity) => publicEntitySlug(entity) === routeKey) || null;
}

export async function listEntityCollections(entityId: string): Promise<PublicCollectionEntityRecord[]> {
  const snapshots = await getDocs(query(
    collection(getLibraryFirestore(), "public_collection_entities"),
    where("entityId", "==", entityId),
  ));
  return snapshots.docs.map((snapshot) => snapshot.data() as PublicCollectionEntityRecord);
}

function collectionEntityDocumentId(collectionId: string, routeSlug: string): string {
  return `${collectionId}__${routeSlug}`;
}

export async function getLibraryManifest(collectionId: string): Promise<LibraryManifest | null> {
  const db = getLibraryFirestore();
  const catalogSnapshot = await getDoc(doc(await getCatalogCollectionClient("public_collection_catalogs"), collectionId)).catch(() => null);
  if (catalogSnapshot?.exists()) return (catalogSnapshot.data() as PublicCollectionCatalogRecord).manifest;
  const [collectionSnapshot, entitySnapshots, publicEntitySnapshots] = await Promise.all([
    getDoc(doc(await getCatalogCollectionClient("public_collections"), collectionId)),
    getDocs(query(collection(db, "public_collection_entities"), where("collectionId", "==", collectionId))),
    getDocs(query(collection(db, "public_entities"), where("entityClasses", "array-contains", "forecastable_entity"))),
  ]);

  if (!collectionSnapshot.exists()) return null;

  const record = collectionSnapshot.data() as PublicCollectionRecord;
  const publicEntitiesById = new Map(
    publicEntitySnapshots.docs.map((snapshot) => {
      const entity = snapshot.data() as PublicEntityRecord;
      return [entity.entityId, entity] as const;
    }),
  );
  const entities = entitySnapshots.docs
    .map((snapshot) => snapshot.data() as PublicCollectionEntityRecord)
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map(({ collectionId: _collectionId, entityId, sortOrder: _sortOrder, publicationStatus: _publicationStatus, visibility: _visibility, ...entity }) => ({
      ...entity,
      logoUrl: publicEntitiesById.get(entityId)?.logo?.url,
      logoAlt: publicEntitiesById.get(entityId)?.logo?.alt,
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

export async function getLibraryEntity(
  collectionId: string,
  routeSlug: string,
): Promise<PublicCollectionEntityRecord | null> {
  const db = getLibraryFirestore();
  const directSnapshot = await getDoc(
    doc(db, "public_collection_entities", collectionEntityDocumentId(collectionId, routeSlug)),
  );
  if (directSnapshot.exists()) return directSnapshot.data() as PublicCollectionEntityRecord;

  const aliasesSnapshot = await getDocs(query(
    collection(db, "public_collection_entities"),
    where("collectionId", "==", collectionId),
    where("aliases", "array-contains", routeSlug),
  ));
  return aliasesSnapshot.empty
    ? null
    : aliasesSnapshot.docs[0].data() as PublicCollectionEntityRecord;
}

export async function listLibraryForecasts(
  collectionId: string,
  entityId: string,
): Promise<PublicForecastRecord[]> {
  const db = getLibraryFirestore();
  const catalogSnapshot = await getDoc(doc(await getCatalogCollectionClient("public_entity_forecast_catalogs"), `${collectionId}__${entityId}`)).catch(() => null);
  if (catalogSnapshot?.exists()) {
    return [...(catalogSnapshot.data() as PublicEntityForecastCatalogRecord).forecasts]
      .sort((left, right) => left.sortOrder - right.sortOrder);
  }
  const snapshots = await getDocs(query(
    collection(db, "public_forecasts"),
    where("collectionId", "==", collectionId),
    where("entityId", "==", entityId),
  ));
  return snapshots.docs
    .map((snapshot) => snapshot.data() as PublicForecastRecord)
    .sort((left, right) => left.sortOrder - right.sortOrder);
}

export interface PublicForecastLedgerPage {
  catalogGenerationId?: string | null;
  forecasts: PublicForecastRecord[];
  partNumbers: number[];
  hasOlderParts: boolean;
  nextBeforePartNumber?: number;
  totalForecastCount: number;
  source: "parts" | "legacy_catalog" | "documents";
}

const forecastLedgerPageCache = new Map<string, Promise<PublicForecastLedgerPage>>();
const forecastLedgerAggregateCache = new Map<string, PublicForecastRecord[]>();

function sortForecasts(forecasts: PublicForecastRecord[]): PublicForecastRecord[] {
  return [...forecasts].sort((left, right) => right.forecastCreatedAt.localeCompare(left.forecastCreatedAt)
    || left.sortOrder - right.sortOrder
    || left.forecastId.localeCompare(right.forecastId));
}

function mergeForecastLedgerAggregate(entityId: string, forecasts: PublicForecastRecord[]): PublicForecastRecord[] {
  const merged = new Map<string, PublicForecastRecord>();
  for (const forecast of [...(forecastLedgerAggregateCache.get(entityId) || []), ...forecasts]) {
    merged.set(forecast.receiptDigest || forecast.forecastId, forecast);
  }
  const ordered = sortForecasts([...merged.values()]);
  forecastLedgerAggregateCache.set(entityId, ordered);
  return ordered;
}

/**
 * Read two newest materialized ledger parts at a time. Part numbers increase
 * with forecast time, so the initial screen always includes both a newly
 * opened sparse part and the preceding populated part.
 */
export async function listLibraryForecastLedgerPage(
  entityId: string,
  beforePartNumber?: number,
  requestedGenerationId?: string | null,
): Promise<PublicForecastLedgerPage> {
  const catalogGenerationId = requestedGenerationId === undefined ? await getCatalogGenerationClient() : requestedGenerationId;
  const aggregateKey = `${catalogGenerationId ?? "legacy"}:${entityId}`;
  const cacheKey = `${aggregateKey}:${beforePartNumber ?? "latest"}`;
  const cached = forecastLedgerPageCache.get(cacheKey);
  if (cached) return cached;

  const request = (async () => {
    const db = getLibraryFirestore();
    const partsCollection = collection(doc(await getCatalogCollectionClient("public_entity_forecast_ledgers", catalogGenerationId), entityId), "parts");
    const partQuery = beforePartNumber === undefined
      ? query(partsCollection, orderBy("partNumber", "desc"), limit(2))
      : query(partsCollection, where("partNumber", "<", beforePartNumber), orderBy("partNumber", "desc"), limit(2));
    const partSnapshots = await getDocs(partQuery);

    if (partSnapshots && !partSnapshots.empty) {
      const parts = partSnapshots.docs.map((snapshot) => snapshot.data() as PublicEntityForecastLedgerPartRecord);
      const forecasts = sortForecasts(parts.flatMap((part) => part.forecasts));
      mergeForecastLedgerAggregate(aggregateKey, forecasts);
      const partNumbers = parts.map((part) => part.partNumber).sort((left, right) => right - left);
      const oldestLoadedPart = Math.min(...partNumbers);
      return {
        catalogGenerationId,
        forecasts,
        partNumbers,
        hasOlderParts: oldestLoadedPart > 1,
        nextBeforePartNumber: oldestLoadedPart > 1 ? oldestLoadedPart : undefined,
        totalForecastCount: parts[0]?.totalForecastCount ?? forecasts.length,
        source: "parts" as const,
      };
    }

    if (beforePartNumber !== undefined) {
      return {
        catalogGenerationId,
        forecasts: [],
        partNumbers: [],
        hasOlderParts: false,
        totalForecastCount: forecastLedgerAggregateCache.get(aggregateKey)?.length || 0,
        source: "parts" as const,
      };
    }

    if (catalogGenerationId !== null) throw new Error(`Required forecast ledger ${entityId} is missing`);

    // Transitional compatibility while v0.2 part catalogs are promoted.
    const legacySnapshot = await getDoc(doc(await getCatalogCollectionClient("public_entity_forecast_ledgers", catalogGenerationId), entityId)).catch(() => null);
    const legacy = legacySnapshot?.exists()
      ? legacySnapshot.data() as PublicEntityForecastLedgerCatalogRecord
      : null;
    if (legacy && Array.isArray(legacy.forecasts)) {
      const forecasts = sortForecasts(legacy.forecasts);
      mergeForecastLedgerAggregate(aggregateKey, forecasts);
      return {
        catalogGenerationId,
        forecasts,
        partNumbers: [],
        hasOlderParts: false,
        totalForecastCount: legacy.forecastCount || forecasts.length,
        source: "legacy_catalog" as const,
      };
    }

    const snapshots = await getDocs(query(
      collection(db, "public_forecasts"),
      where("entityId", "==", entityId),
    ));
    const forecasts = sortForecasts(snapshots.docs.map((snapshot) => snapshot.data() as PublicForecastRecord));
    mergeForecastLedgerAggregate(aggregateKey, forecasts);
    return {
      catalogGenerationId,
      forecasts,
      partNumbers: [],
      hasOlderParts: false,
      totalForecastCount: forecasts.length,
      source: "documents" as const,
    };
  })();

  forecastLedgerPageCache.set(cacheKey, request);
  request.catch(() => forecastLedgerPageCache.delete(cacheKey));
  return request;
}

/** Read the newest ledger window plus any older catalog pages already loaded in this browser session. */
export async function listLibraryForecastLedger(entityId: string): Promise<PublicForecastRecord[]> {
  const page = await listLibraryForecastLedgerPage(entityId);
  return forecastLedgerAggregateCache.get(`${page.catalogGenerationId ?? "legacy"}:${entityId}`) || [];
}

export function getLoadedLibraryForecastLedger(entityId: string): PublicForecastRecord[] {
  // Only an opportunistic lookup for immutable revision navigation.
  return [...forecastLedgerAggregateCache.entries()].filter(([key]) => key.endsWith(`:${entityId}`)).flatMap(([, records]) => records);
}

export async function getLibraryReceipt(receiptDigest: string): Promise<LibraryReceipt | null> {
  const snapshot = await getDoc(doc(getLibraryFirestore(), "public_receipts", receiptDigest));
  if (!snapshot.exists()) return null;
  const record = snapshot.data() as PublicReceiptRecord;
  return { document: record.document, projection: record.projection };
}

export function getManifestProofCounts(manifest: LibraryManifest): LibraryShowcaseCounts {
  return {
    selected: manifest.selectedProofCount,
    verified: manifest.verifiedProofCount,
  };
}

export function getEntityProofCounts(entity: PublicCollectionEntityRecord): LibraryShowcaseCounts {
  return {
    selected: entity.showcaseSelectionCount ?? 0,
    verified: entity.proofCount ?? 0,
  };
}
