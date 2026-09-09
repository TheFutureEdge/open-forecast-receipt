#!/usr/bin/env node

import process from "node:process";
import { buildForecastLedgerCatalogParts } from "./lib/forecast-ledger-catalog.mjs";
import { getServerFirestore } from "./lib/firestore-client.mjs";
import { publishCatalogGeneration } from "./lib/catalog-generation.mjs";
import { ipulseCollectionPresentation } from "./lib/ipulse-collection-presentation.mjs";

const DEFAULT_TARGET_PROJECT = "oflapp-staging";
// Stay below the agreed 700 KiB ceiling with enough room for Firestore field
// encoding overhead and future schema additions.
const MAX_PUBLIC_CATALOG_BYTES = 650 * 1024;

function argumentValue(name) {
  const prefix = `${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function compact(value) {
  if (Array.isArray(value)) return value.map(compact).filter((item) => item !== undefined);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .map(([key, item]) => [key, compact(item)])
      .filter(([, item]) => item !== undefined));
  }
  return value === null || value === "" || value === undefined ? undefined : value;
}

function slugify(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function targetSlugFor(forecast) {
  if (forecast.targetSlug) return forecast.targetSlug;
  if (["eod_close_price_step_over_step_percentage_change", "eod_close_price_pct_change"].includes(forecast.targetName)) {
    return "adjusted-end-of-day-close-return";
  }
  return slugify(forecast.targetName) || "unspecified-target";
}

function forecasterSlugFor(forecast) {
  return forecast.forecasterPublicSlug
    || slugify(forecast.forecaster?.displayName || forecast.forecasterLabel || forecast.forecasterId);
}

function collectionPublicSlug(collection) {
  const date = String(collection.publishedAt || "undated").slice(0, 10);
  const batch = String(collection.collectionId).match(/^batch-(\d+)$/i)?.[1];
  return `${date}-${batch ? `sb${batch}` : slugify(collection.collectionId)}`;
}

function canonicalForecastPath(forecast) {
  if (forecast.canonicalPath) return forecast.canonicalPath;
  return `/entities/listed-securities/${encodeURIComponent(forecast.entitySlug)}/forecasts/${String(forecast.forecastCreatedAt).slice(0, 10)}/${encodeURIComponent(forecast.targetSlug)}/${encodeURIComponent(forecast.forecasterPublicSlug)}/${encodeURIComponent(forecast.forecastPublicId)}`;
}

function canonicalEntityPath(entity) {
  const slug = entity.publicSlug
    || (entity.entityType === "listed_security" ? entity.stableSlug : slugify(entity.canonicalName))
    || entity.stableSlug;
  if (entity.entityType === "listed_security") return `/entities/listed-securities/${encodeURIComponent(slug)}`;
  if (entity.entityType === "corporation") return `/entities/corporations/${encodeURIComponent(slug)}`;
  if (entity.entityType === "investment_fund") return `/entities/investment-funds/${encodeURIComponent(slug)}`;
  return `/entities/organizations/${encodeURIComponent(slug)}`;
}

function buildSitemapCatalogParts(entries) {
  const sorted = [...new Map(entries.map((entry) => [entry.path, compact(entry)])).values()]
    .sort((left, right) => left.path.localeCompare(right.path));
  const groups = [];
  let current = [];
  for (const entry of sorted) {
    const candidate = [...current, entry];
    const envelope = {
      catalogVersion: "ofl-public-sitemap-catalog-v0.1.0",
      catalogId: "site",
      partNumber: groups.length + 1,
      partCount: 9999,
      generatedAt: "9999-12-31T23:59:59.999Z",
      entryCount: candidate.length,
      entries: candidate,
      publicationStatus: "published",
      visibility: "public",
    };
    if (documentBytes(envelope) > MAX_PUBLIC_CATALOG_BYTES && current.length > 0) {
      groups.push(current);
      current = [entry];
    } else {
      current = candidate;
    }
  }
  if (current.length > 0) groups.push(current);
  return groups;
}

function documentBytes(value) {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

function assertCatalogSize(path, value) {
  const bytes = documentBytes(value);
  assert(bytes <= MAX_PUBLIC_CATALOG_BYTES, `${path} is ${bytes} bytes; shard it before publishing beyond ${MAX_PUBLIC_CATALOG_BYTES} bytes`);
  return bytes;
}

function directoryProjection(entity) {
  const preferredIdentifier = ["ticker_venue", "ipulse_symbol", "isin"]
    .map((scheme) => (entity.externalIdentifiers || []).find((identifier) => identifier.scheme === scheme)?.value)
    .find(Boolean);
  const relatedIdentifiers = (entity.relatedEntities || [])
    .filter((related) => related.predicate === "has_market_representation")
    .map((related) => related.displayIdentifier)
    .filter(Boolean);
  return compact({
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
    sameAsCount: (entity.sameAs || []).length,
    relatedEntityCount: (entity.relatedEntities || []).length,
    latestActivityAt: entity.lifecycle?.sourceUpdatedAt
      || entity.profile?.observedAt
      || entity.profile?.sourceUpdatedAt
      || entity.source?.sourceUpdatedAt,
    logo: entity.logo ? {
      mediaAssetId: entity.logo.mediaAssetId,
      role: entity.logo.role,
      url: entity.logo.url,
      alt: entity.logo.alt,
    } : undefined,
  });
}

function publicManifestEntity(record, publicEntity) {
  const {
    collectionId: _collectionId,
    sortOrder: _sortOrder,
    publicationStatus: _publicationStatus,
    visibility: _visibility,
    ...entity
  } = record;
  return compact({
    ...entity,
    logoUrl: publicEntity?.logo?.url || entity.logoUrl,
    logoAlt: publicEntity?.logo?.alt || entity.logoAlt,
  });
}

const targetProject = argumentValue("--project") || DEFAULT_TARGET_PROJECT;
const apply = process.argv.includes("--apply");
const db = getServerFirestore(targetProject);
// Every input belongs to one consistent source snapshot, even if a publisher
// writes new authoritative records while the derived generation is building.
const [expectedPointer, entitySnapshot, collectionSnapshot, collectionEntitySnapshot, forecastSnapshot, forecasterSnapshot, publisherSnapshot, targetSnapshot] = await db.runTransaction(tx => Promise.all([
  tx.get(db.doc("public_catalog_state/current")),
  tx.get(db.collection("public_entities")),
  tx.get(db.collection("public_collections")),
  tx.get(db.collection("public_collection_entities")),
  tx.get(db.collection("public_forecast_revisions")),
  tx.get(db.collection("public_forecasters")),
  tx.get(db.collection("public_publishers")),
  tx.get(db.collection("public_targets")),
]), { readOnly: true });
assert(forecastSnapshot.size > 0, "Backfill immutable public_forecast_revisions before materializing catalogs");
const existingTargets = new Map(targetSnapshot.docs.map((snapshot) => [snapshot.id, snapshot.data()]));

const publicEntities = entitySnapshot.docs.map((snapshot) => snapshot.data());
const publicEntitiesById = new Map(publicEntities.map((entity) => [entity.entityId, entity]));
const publicCollections = collectionSnapshot.docs.map((snapshot) => ({
  ...snapshot.data(),
  publicSlug: snapshot.data().publicSlug || collectionPublicSlug(snapshot.data()),
}));
const collectionEntities = collectionEntitySnapshot.docs.map((snapshot) => snapshot.data());
const forecasts = forecastSnapshot.docs.map((snapshot) => {
  const forecast = snapshot.data();
  const entity = publicEntitiesById.get(forecast.entityId);
  assert(entity, `Missing governed entity for forecast ${snapshot.id}`);
  // Public catalogs are derived exclusively from lightweight forecast index
  // records. Full receipts can be large and remain point-read artifacts; a
  // catalog rebuild must never list and download every sealed receipt.
  assert(forecast.forecastPublicId && forecast.publisherId && forecast.canonicalPath, `Incomplete immutable revision identity: ${snapshot.id}`);
  return compact({
    ...forecast,
    // Collection membership keeps its original label; public forecast URLs
    // use the governed entity locator, not the original publisher route alias.
    entitySlug: entity.publicSlug || entity.stableSlug || forecast.entitySlug,
    targetSlug: targetSlugFor(forecast),
    forecasterPublicSlug: forecasterSlugFor(forecast),
    horizonStartAt: forecast.horizonStartAt || forecast.forecastCreatedAt,
    executionProvenance: forecast.executionProvenance || { provenanceStatus: "unknown" },
  });
});
const forecasters = forecasterSnapshot.docs.map((snapshot) => {
  const forecaster = snapshot.data();
  return compact({
    ...forecaster,
    publicSlug: forecaster.publicSlug || slugify(forecaster.displayName || forecaster.name || forecaster.forecasterId),
  });
});
const generatedAt = publicCollections.map((collection) => collection.publishedAt).filter(Boolean).sort().at(-1)
  || new Date(0).toISOString();
const planned = [];
const targetsBySlug = new Map();

// Publisher ownership must be explicit; never infer iPulse ownership from
// subject shape, collection labels, or missing data in another domain.
const publishers = new Set(publisherSnapshot.docs.map((snapshot) => snapshot.id));
for (const record of [...forecasts, ...publicCollections]) {
  assert(record.publisherId && publishers.has(record.publisherId), "Missing governed publisher identity");
}

for (const forecast of forecasts) {
  // Sealed revisions and permanent resolver addresses are publication-owned.
  // A browsing rebuild must never rewrite either namespace.
  const knownMarketReturnTarget = forecast.targetSlug === "adjusted-end-of-day-close-return";
  const targetRecord = compact({
      targetId: `target_${forecast.targetSlug.replaceAll("-", "_")}`,
      publicSlug: forecast.targetSlug,
      name: forecast.targetSlug === "adjusted-end-of-day-close-return"
        ? "Adjusted end-of-day close return"
        : String(forecast.targetName || forecast.targetSlug).replaceAll("_", " "),
      description: knownMarketReturnTarget
        ? "The percentage change in adjusted end-of-day close price between consecutive forecast steps."
        : undefined,
      dimension: knownMarketReturnTarget ? "step_over_step_percentage_change" : undefined,
      unit: knownMarketReturnTarget ? "%" : undefined,
      publicationStatus: "published",
      visibility: "public",
  });
  const previousTarget = targetsBySlug.get(forecast.targetSlug);
  if (previousTarget) {
    assert(JSON.stringify(previousTarget) === JSON.stringify(targetRecord), `Conflicting target definition for ${forecast.targetSlug}`);
  } else {
    targetsBySlug.set(forecast.targetSlug, targetRecord);
  }
}

for (const [targetSlug, target] of targetsBySlug) {
  const authoritativeTarget = existingTargets.get(targetSlug) || target;
  planned.push({ collectionName: "public_targets", documentId: targetSlug, value: authoritativeTarget, bytes: assertCatalogSize(`public_targets/${targetSlug}`, authoritativeTarget) });
}

for (const forecaster of forecasters) {
  planned.push({ collectionName: "public_forecasters", documentId: forecaster.forecasterId, value: forecaster, bytes: assertCatalogSize(`public_forecasters/${forecaster.forecasterId}`, forecaster) });
}

for (const collection of publicCollections) {
  const presentation = ipulseCollectionPresentation(collection, forecasts, publicEntitiesById);
  if (presentation) collection.presentation = presentation;
  planned.push({ collectionName: "public_collections", documentId: collection.collectionId, value: collection, bytes: assertCatalogSize(`public_collections/${collection.collectionId}`, collection) });
}

const forecastsByForecaster = new Map();
for (const forecast of forecasts) {
  const records = forecastsByForecaster.get(forecast.forecasterId) || [];
  records.push(forecast);
  forecastsByForecaster.set(forecast.forecasterId, records);
}
const forecasterCoverage = Object.fromEntries(forecasters.map((forecaster) => {
  const records = forecastsByForecaster.get(forecaster.forecasterId) || [];
  return [forecaster.forecasterId, {
    forecasts: records.length,
    entities: new Set(records.map((record) => record.entityId)).size,
    modes: [...new Set(records.map((record) => record.forecasterMode).filter(Boolean))].sort(),
    publishedSubjectCategories: [...new Set(records.map((record) => record.subjectCategory).filter(Boolean))].sort(),
    proofSelected: records.filter((record) => record.showcaseSelected).length,
    proofVerified: records.filter((record) => record.chainStatus === "verified").length,
    taskConfigurations: new Set(records.map((record) => record.taskConfigurationId).filter(Boolean)).size
      || forecaster.taskConfigurationIds?.length || 0,
    subjectAssignments: new Set(records.map((record) => record.subjectAssignmentId).filter(Boolean)).size
      || forecaster.subjectAssignmentIds?.length || 0,
  }];
}));
const forecasterCatalog = {
  catalogVersion: "ofl-public-forecaster-catalog-v0.1.0",
  catalogId: "active",
  generatedAt,
  forecasters: forecasters
    .map(({ taskConfigurationIds: _taskConfigurationIds, subjectAssignmentIds: _subjectAssignmentIds, ...forecaster }) => forecaster)
    .sort((left, right) => left.displayName.localeCompare(right.displayName)),
  coverage: forecasterCoverage,
  totals: {
    forecasts: forecasts.length,
    entities: new Set(forecasts.map((forecast) => forecast.entityId)).size,
    proofVerified: forecasts.filter((forecast) => forecast.chainStatus === "verified").length,
  },
  publicationStatus: "published",
  visibility: "public",
};
planned.push({ collectionName: "public_forecaster_catalogs", documentId: "active", value: forecasterCatalog, bytes: assertCatalogSize("public_forecaster_catalogs/active", forecasterCatalog) });

for (const [catalogId, entityClass] of [["forecast-subjects", "forecastable_entity"], ["organizations", "organization"]]) {
  const entities = publicEntities
    .filter((entity) => entity.entityClasses?.includes(entityClass))
    .map(directoryProjection)
    .sort((left, right) => left.canonicalName.localeCompare(right.canonicalName));
  const value = {
    catalogVersion: "ofl-public-entity-directory-v0.1.0",
    catalogId,
    generatedAt,
    entityCount: entities.length,
    entities,
    publicationStatus: "published",
    visibility: "public",
  };
  planned.push({ collectionName: "public_entity_directory_catalogs", documentId: catalogId, value, bytes: assertCatalogSize(`public_entity_directory_catalogs/${catalogId}`, value) });
}

for (const collectionRecord of publicCollections) {
  const records = collectionEntities
    .filter((entity) => entity.collectionId === collectionRecord.collectionId)
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const manifestEntities = records.map((record) => publicManifestEntity(record, publicEntitiesById.get(record.entityId)));
  const collectionCatalog = {
    catalogVersion: "ofl-public-collection-catalog-v0.1.0",
    collectionId: collectionRecord.collectionId,
    generatedAt: collectionRecord.publishedAt || generatedAt,
    manifest: {
      batchId: collectionRecord.batchId,
      batchLabel: collectionRecord.batchLabel,
      description: collectionRecord.description,
      ...(collectionRecord.presentation ? { presentation: collectionRecord.presentation } : {}),
      entities: manifestEntities,
      receiptCount: collectionRecord.receiptCount,
      selectedProofCount: collectionRecord.selectedProofCount,
      verifiedProofCount: collectionRecord.verifiedProofCount,
    },
    publicationStatus: "published",
    visibility: "public",
  };
  planned.push({ collectionName: "public_collection_catalogs", documentId: collectionRecord.collectionId, value: collectionCatalog, bytes: assertCatalogSize(`public_collection_catalogs/${collectionRecord.collectionId}`, collectionCatalog) });

  // The collection workspace needs one bounded forecast projection per
  // collection/entity pair. This prevents the public UI from querying the raw
  // forecast namespace and keeps the initial view to a single document read.
  for (const record of records) {
    const collectionForecasts = forecasts
      .filter((forecast) => forecast.collectionId === collectionRecord.collectionId && forecast.entityId === record.entityId)
      .sort((left, right) => left.sortOrder - right.sortOrder);
    if (collectionForecasts.length === 0) continue;
    const catalogId = `${collectionRecord.collectionId}__${record.entityId}`;
    const entityForecastCatalog = {
      catalogVersion: "ofl-public-entity-forecast-catalog-v0.2.0",
      catalogId,
      collectionId: collectionRecord.collectionId,
      entityId: record.entityId,
      entitySlug: collectionForecasts[0].entitySlug,
      generatedAt: collectionRecord.publishedAt || generatedAt,
      forecastCount: collectionForecasts.length,
      forecasts: collectionForecasts,
      publicationStatus: "published",
      visibility: "public",
    };
    planned.push({
      collectionName: "public_entity_forecast_catalogs",
      documentId: catalogId,
      value: entityForecastCatalog,
      bytes: assertCatalogSize(`public_entity_forecast_catalogs/${catalogId}`, entityForecastCatalog),
    });
  }
}

for (const entityId of [...new Set(forecasts.map((forecast) => forecast.entityId))].sort()) {
  const entityForecasts = forecasts
    .filter((forecast) => forecast.entityId === entityId)
    .sort((left, right) => right.forecastCreatedAt.localeCompare(left.forecastCreatedAt)
      || left.sortOrder - right.sortOrder);
  const parts = buildForecastLedgerCatalogParts({
    entityId,
    generatedAt,
    forecasts: entityForecasts,
    maxDocumentBytes: MAX_PUBLIC_CATALOG_BYTES,
  });
  const ledgerManifest = {
    catalogVersion: "ofl-public-entity-forecast-ledger-v0.2.0",
    entityId,
    generatedAt,
    forecastCount: entityForecasts.length,
    partCount: parts.length,
    latestPartNumber: parts.at(-1)?.partNumber || 0,
    latestPartId: parts.at(-1)?.partId,
    latestForecastCreatedAt: parts.at(-1)?.value.lastForecastCreatedAt,
    initialReadPartCount: 2,
    publicationStatus: "published",
    visibility: "public",
  };
  planned.push({ collectionName: "public_entity_forecast_ledgers", documentId: entityId, value: ledgerManifest, bytes: assertCatalogSize(`public_entity_forecast_ledgers/${entityId}`, ledgerManifest) });
  for (const part of parts) {
    planned.push({
      collectionName: `public_entity_forecast_ledgers/${entityId}/parts`,
      documentId: part.partId,
      value: part.value,
      bytes: part.bytes,
    });
  }
}

const libraryStats = {
  statsVersion: "ofl-public-library-stats-v0.1.0",
  generatedAt,
  forecastSubjectCount: new Set(forecasts.map((forecast) => forecast.entityId)).size,
  receiptCount: new Set(forecasts.map((forecast) => forecast.receiptDigest)).size,
  forecasterCount: forecasters.length,
  selectedProofCount: forecasts.filter((forecast) => forecast.showcaseSelected).length,
  verifiedProofCount: forecasts.filter((forecast) => forecast.chainStatus === "verified").length,
  collectionCount: publicCollections.length,
  publisherCount: 1,
  targetCount: targetsBySlug.size,
  publishedAt: generatedAt,
  publicationStatus: "published",
  visibility: "public",
};
planned.push({
  collectionName: "public_library_stats",
  documentId: "summary",
  value: libraryStats,
  bytes: assertCatalogSize("public_library_stats/summary", libraryStats),
});

const forecastEntityIds = new Set(forecasts.map((forecast) => forecast.entityId));
const sitemapEntries = [
  ...publicEntities.map((entity) => ({
    path: canonicalEntityPath(entity),
    lastModified: entity.lifecycle?.sourceUpdatedAt || entity.profile?.observedAt || entity.source?.sourceUpdatedAt,
  })),
  ...publicEntities
    .filter((entity) => entity.entityType === "listed_security" && forecastEntityIds.has(entity.entityId))
    .map((entity) => ({ path: `${canonicalEntityPath(entity)}/forecasts`, lastModified: generatedAt })),
  ...forecasters.map((forecaster) => ({ path: `/forecasters/${encodeURIComponent(forecaster.publicSlug)}`, lastModified: generatedAt })),
  ...[...targetsBySlug.keys()].map((targetSlug) => ({ path: `/targets/${encodeURIComponent(targetSlug)}`, lastModified: generatedAt })),
  { path: "/publishers/ipulse-ai", lastModified: generatedAt },
  ...publicCollections.map((collection) => ({
    path: `/collections/${encodeURIComponent(collection.publisherSlug)}/${encodeURIComponent(collection.publicSlug)}`,
    lastModified: collection.publishedAt,
  })),
  ...forecasts.map((forecast) => ({ path: canonicalForecastPath(forecast), lastModified: forecast.forecastCreatedAt })),
];
const sitemapGroups = buildSitemapCatalogParts(sitemapEntries);
const sitemapManifest = {
  catalogVersion: "ofl-public-sitemap-catalog-v0.1.0",
  catalogId: "site",
  generatedAt,
  entryCount: new Set(sitemapEntries.map((entry) => entry.path)).size,
  partCount: sitemapGroups.length,
  publicationStatus: "published",
  visibility: "public",
};
planned.push({
  collectionName: "public_sitemap_catalogs",
  documentId: "site",
  value: sitemapManifest,
  bytes: assertCatalogSize("public_sitemap_catalogs/site", sitemapManifest),
});
for (const [index, entries] of sitemapGroups.entries()) {
  const partNumber = index + 1;
  const part = {
    catalogVersion: "ofl-public-sitemap-catalog-v0.1.0",
    catalogId: "site",
    partNumber,
    partCount: sitemapGroups.length,
    generatedAt,
    entryCount: entries.length,
    entries,
    publicationStatus: "published",
    visibility: "public",
  };
  planned.push({
    collectionName: "public_sitemap_catalogs/site/parts",
    documentId: `part-${String(partNumber).padStart(4, "0")}`,
    value: part,
    bytes: assertCatalogSize(`public_sitemap_catalogs/site/parts/part-${String(partNumber).padStart(4, "0")}`, part),
  });
}

let writeCount = 0;
const deleteCount = 0;
let generation = null;
if (apply) {
  assert(process.env.OFR_CONFIRM_FIRESTORE_PROJECT === targetProject, "Set OFR_CONFIRM_FIRESTORE_PROJECT to the exact target project before --apply");
  generation = await publishCatalogGeneration(db, planned, {
    expectedPointer,
    generationId: argumentValue("--generation"),
    activate: !process.argv.includes("--stage-only"),
  });
  writeCount = planned.length;
}

function reportCollectionName(collectionName) {
  if (collectionName === "public_sitemap_catalogs/site/parts") return collectionName;
  return collectionName.startsWith("public_entity_forecast_ledgers/") && collectionName.endsWith("/parts")
    ? "public_entity_forecast_ledgers/{entityId}/parts"
    : collectionName;
}

const reportCollectionNames = [...new Set(planned.map((item) => reportCollectionName(item.collectionName)))];
const byCollection = Object.fromEntries(reportCollectionNames.map((collectionName) => {
  const items = planned.filter((item) => reportCollectionName(item.collectionName) === collectionName);
  return [collectionName, {
    documents: items.length,
    totalBytes: items.reduce((sum, item) => sum + (item.bytes ?? documentBytes(item.value)), 0),
    largestDocumentBytes: Math.max(...items.map((item) => item.bytes ?? documentBytes(item.value))),
  }];
}));

console.log(JSON.stringify({
  mode: apply ? "apply" : "plan-only",
  targetProject,
  sourceDocumentsRead: entitySnapshot.size + collectionSnapshot.size + collectionEntitySnapshot.size + forecastSnapshot.size + forecasterSnapshot.size + publisherSnapshot.size + targetSnapshot.size,
  sourceCounts: {
    publicEntities: entitySnapshot.size,
    publicCollections: collectionSnapshot.size,
    publicCollectionEntities: collectionEntitySnapshot.size,
    publicForecasts: forecastSnapshot.size,
    publicReceipts: 0,
    receiptReadPolicy: "point-read-only; catalog materialization never lists full receipts",
    publicForecasters: forecasterSnapshot.size,
    publicPublishers: publisherSnapshot.size,
    publicTargets: targetSnapshot.size,
  },
  plannedCatalogDocuments: planned.length,
  safeDocumentLimitBytes: MAX_PUBLIC_CATALOG_BYTES,
  byCollection,
  writeCount,
  deleteCount,
  generation,
}, null, 2));
