import { createHash } from "node:crypto";
import { canonicalize } from "json-canonicalize";
import { getServerFirestore } from "./firestore-client.mjs";

export const PUBLICATION_BUNDLE_VERSION = "ofl-publication-bundle-v0.1.0";
export const MAX_SAFE_DOCUMENT_BYTES = 900_000;
export const MAX_PUBLIC_CATALOG_BYTES = 650 * 1024;
const PUBLISHER_ORGANIZATION = {
  organizationId: "oflorg_future_edge_group_fze",
  name: "Future Edge Group FZE",
  schemaOrgType: "Organization",
};
const PUBLIC_PUBLISHER = {
  publisherId: "publisher_future_edge_ipulse_ai",
  publicSlug: "ipulse-ai",
  name: "iPulse AI",
  organizationId: PUBLISHER_ORGANIZATION.organizationId,
  description: "The open agentic investment research platform built by Future Edge Group FZE.",
  websiteUrl: "https://ipulseai.com",
};
const PUBLISHER_TEAM = {
  teamId: "oflteam_ipulse_ai_research",
  name: "iPulse AI Research",
  product: "iPulse AI",
};
const SUBJECT_CATEGORY_ORDER = ["equity", "crypto", "forex", "commodity", "index", "fund"];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function jsonCopy(value) {
  return JSON.parse(JSON.stringify(value));
}

function sha256Canonical(value) {
  return createHash("sha256").update(canonicalize(value), "utf8").digest("hex");
}

const CROCKFORD_BASE32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function encodeCrockfordBase32(bytes) {
  let bits = 0;
  let value = 0;
  let result = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += CROCKFORD_BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) result += CROCKFORD_BASE32[(value << (5 - bits)) & 31];
  return result;
}

/** Stable 128-bit public forecast ID, independent from the receipt digest. */
export function deriveForecastPublicId({ publisherId, sourceForecastId, sourceRevisionId }) {
  const input = `${publisherId}\n${sourceForecastId}\n${sourceRevisionId}`;
  const digest = createHash("sha256").update(input, "utf8").digest().subarray(0, 16);
  return `f-${encodeCrockfordBase32(digest).toLowerCase()}`;
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

function publicTargetSlug(target) {
  const governed = {
    eod_close_price_step_over_step_percentage_change: "adjusted-end-of-day-close-return",
    eod_close_price_pct_change: "adjusted-end-of-day-close-return",
  };
  return governed[target.name] || slugify(target.name) || "unspecified-target";
}

function publicCollectionSlug(collectionId, publishedAt) {
  const date = String(publishedAt || "undated").slice(0, 10);
  const batch = String(collectionId).match(/^batch-(\d+)$/i)?.[1];
  return `${date}-${batch ? `sb${batch}` : slugify(collectionId)}`;
}

function canonicalForecastPath({ entitySlug, forecastCreatedAt, targetSlug, forecasterSlug, forecastPublicId }) {
  return `/entities/listed-securities/${encodeURIComponent(entitySlug)}/forecasts/${String(forecastCreatedAt).slice(0, 10)}/${encodeURIComponent(targetSlug)}/${encodeURIComponent(forecasterSlug)}/${encodeURIComponent(forecastPublicId)}`;
}

function assertDocumentSize(collectionName, documentId, value) {
  const bytes = Buffer.byteLength(JSON.stringify(value), "utf8");
  assert(
    bytes <= MAX_SAFE_DOCUMENT_BYTES,
    `${collectionName}/${documentId} is ${bytes} bytes and exceeds the ${MAX_SAFE_DOCUMENT_BYTES}-byte publisher limit`,
  );
}

function normalizeType(value) {
  return String(value || "unknown").trim().replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
}

function isHumanParty(type) {
  return ["human", "person", "individual"].includes(normalizeType(type));
}

function forecasterTypeLabel(type) {
  const normalized = normalizeType(type);
  if (normalized.includes("ai")) return "AI forecaster";
  if (normalized.includes("ensemble")) return "Ensemble forecaster";
  if (normalized.includes("hybrid")) return "Hybrid forecaster";
  if (normalized.includes("algorithm") || normalized.includes("model")) return "Model forecaster";
  if (normalized.includes("organization")) return "Organization forecaster";
  if (isHumanParty(type)) return "Human forecaster";
  return `${normalized.replaceAll("_", " ")} forecaster`;
}

function forecasterDisplayName(forecaster) {
  if (isHumanParty(forecaster.type)) return forecaster.name;
  const normalized = normalizeType(forecaster.type);
  const suffix = normalized.includes("ai")
    ? "AI"
    : normalized.includes("algorithm") || normalized.includes("model")
      ? "Model"
      : "Forecaster";
  const personaLabel = new RegExp(`\\b${suffix}$`, "i").test(forecaster.name)
    ? forecaster.name
    : `${forecaster.name} ${suffix}`;
  const modelName = forecaster.model?.name?.trim();
  return !modelName || personaLabel.toLowerCase().includes(modelName.toLowerCase())
    ? personaLabel
    : `${personaLabel} on ${modelName}`;
}

function forecasterPersonaLabel(forecaster) {
  if (isHumanParty(forecaster.type)) return forecaster.name;
  const normalized = normalizeType(forecaster.type);
  const suffix = normalized.includes("ai")
    ? "AI"
    : normalized.includes("algorithm") || normalized.includes("model")
      ? "Model"
      : "Forecaster";
  return new RegExp(`\\b${suffix}$`, "i").test(forecaster.name) ? forecaster.name : `${forecaster.name} ${suffix}`;
}

function subjectAssignmentId(forecastId) {
  return String(forecastId || "").match(/__(xrefsubjtskconf_[0-9a-f-]+)__/i)?.[1];
}

function sortSubjectCategories(values) {
  return [...new Set(values.filter(Boolean))].sort((left, right) => {
    const leftRank = SUBJECT_CATEGORY_ORDER.indexOf(left);
    const rightRank = SUBJECT_CATEGORY_ORDER.indexOf(right);
    if (leftRank === -1 && rightRank === -1) return left.localeCompare(right);
    if (leftRank === -1) return 1;
    if (rightRank === -1) return -1;
    return leftRank - rightRank;
  });
}

function forecastReview(forecast) {
  const review = forecast.review || {
    status: forecast.methodology?.humanReviewStatus === "not_reviewed" ? "not_reviewed" : "unknown",
    reviewers: [],
  };
  const reviewers = review.reviewers || [];
  assert(Array.isArray(reviewers), `Forecast ${forecast.forecastId} reviewers must be an array`);
  assert(reviewers.length <= 10, `Forecast ${forecast.forecastId} has more than 10 reviewers`);
  return {
    status: review.status || "unknown",
    reviewers,
    reviewerCount: reviewers.length,
    humanReviewerCount: reviewers.filter((reviewer) => isHumanParty(reviewer.type)).length,
  };
}

function forecasterSummary(forecast) {
  const forecaster = forecast.forecaster;
  const model = forecaster.model;
  const review = forecastReview(forecast);
  const authors = forecaster.architectureAuthors || [];
  assert(Array.isArray(authors), `Forecaster ${forecaster.id} architectureAuthors must be an array`);
  assert(authors.length <= 10, `Forecaster ${forecaster.id} has more than 10 architecture authors`);
  return {
    type: forecaster.type,
    sourceName: forecaster.name,
    personaLabel: forecasterPersonaLabel(forecaster),
    displayName: forecasterDisplayName(forecaster),
    description: forecaster.description
      || [forecaster.role, forecaster.mode].filter(Boolean).join(" · ")
      || "Independent forecaster",
    typeLabel: forecasterTypeLabel(forecaster.type),
    implementationLabel: model
      ? `${model.name}${model.provider ? ` by ${model.provider}` : ""}`
      : forecasterTypeLabel(forecaster.type),
    modelName: model?.name,
    modelProvider: model?.provider,
    architectureAuthors: authors,
    reviewStatus: review.status,
    reviewers: review.reviewers,
    reviewerCount: review.reviewerCount,
    humanReviewerCount: review.humanReviewerCount,
  };
}

function proofMetadata(projection) {
  return projection?.protocolSuppliedAfterIssuance || {};
}

function stableEntityPresentation(entry, forecast) {
  const presentation = entry.entityPresentation;
  assert(presentation && typeof presentation === "object", `Forecast ${forecast.forecastId} is missing entityPresentation`);
  assert(typeof presentation.routeSlug === "string" && presentation.routeSlug.length > 0, `Forecast ${forecast.forecastId} is missing entityPresentation.routeSlug`);
  return {
    routeSlug: presentation.routeSlug,
    aliases: presentation.aliases || [],
    displaySymbol: presentation.displaySymbol || forecast.entity.name,
    marketIdentifier: presentation.marketIdentifier || Object.values(forecast.entity.identifiers || {})[0] || forecast.entity.id,
    iconKey: presentation.iconKey || presentation.routeSlug,
    logoUrl: presentation.logoUrl,
    logoAlt: presentation.logoAlt,
  };
}

function originalSourceMetadata(entry, forecast) {
  const source = entry.originalSource;
  if (!source) return undefined;
  assert(typeof source.publisherName === "string" && source.publisherName.trim(), `Forecast ${forecast.forecastId} originalSource.publisherName is required`);
  assert(typeof source.label === "string" && source.label.trim(), `Forecast ${forecast.forecastId} originalSource.label is required`);
  assert(typeof source.url === "string" && source.url.trim(), `Forecast ${forecast.forecastId} originalSource.url is required`);
  let parsed;
  try {
    parsed = new URL(source.url);
  } catch {
    throw new Error(`Forecast ${forecast.forecastId} originalSource.url must be an absolute URL`);
  }
  assert(parsed.protocol === "https:" && parsed.hostname && !parsed.username && !parsed.password, `Forecast ${forecast.forecastId} originalSource.url must be a credential-free HTTPS URL`);
  return {
    publisherName: source.publisherName.trim(),
    label: source.label.trim(),
    url: parsed.toString(),
    publicationId: source.publicationId?.trim() || undefined,
    publicationDate: source.publicationDate?.trim() || undefined,
  };
}

function addPlannedDocument(target, collectionName, documentId, value, writeMode = "immutable") {
  const normalized = jsonCopy(value);
  assertDocumentSize(collectionName, documentId, normalized);
  const key = `${collectionName}/${documentId}`;
  const existing = target.get(key);
  if (existing) {
    assert(
      canonicalize(existing.value) === canonicalize(normalized),
      `Bundle produces conflicting values for ${key}`,
    );
    return;
  }
  target.set(key, { collectionName, documentId, value: normalized, writeMode });
}

/** Validate a caller-supplied bundle and create a deterministic Firestore plan. */
export function planPublicationBundle(bundle, validateReceiptSchema) {
  assert(bundle?.bundleVersion === PUBLICATION_BUNDLE_VERSION, `bundleVersion must be ${PUBLICATION_BUNDLE_VERSION}`);
  assert(bundle.collection && typeof bundle.collection === "object", "Bundle is missing collection metadata");
  assert(typeof bundle.collection.collectionId === "string" && bundle.collection.collectionId.length > 0, "collection.collectionId is required");
  assert(Array.isArray(bundle.entries) && bundle.entries.length > 0, "Bundle entries must be a non-empty array");
  assert(typeof validateReceiptSchema === "function", "A receipt schema validator is required");

  const collectionId = bundle.collection.collectionId;
  const planned = new Map();
  const entityGroups = new Map();
  const forecastRecordsByEntity = new Map();
  const forecasterGroups = new Map();
  const forecasterSlugOwners = new Map();
  const receiptDigests = new Set();
  const forecastIds = new Set();
  let selectedProofCount = 0;
  let verifiedProofCount = 0;

  for (const [entryIndex, entry] of bundle.entries.entries()) {
    const document = entry.receipt;
    const projection = entry.projection;
    assert(document && typeof document === "object", `Entry ${entryIndex} is missing receipt`);
    assert(projection && typeof projection === "object", `Entry ${entryIndex} is missing projection`);
    const validation = validateReceiptSchema(document);
    assert(validation.valid, `Receipt schema validation failed for entry ${entryIndex}: ${validation.errors?.join("; ") || "unknown error"}`);

    const payload = document.receiptPayload;
    const forecast = payload.forecast;
    const digest = document.proofEnvelope.payloadDigestSha256;
    const recomputedDigest = sha256Canonical(payload);
    assert(digest === recomputedDigest, `Receipt ${forecast.forecastId} payload digest mismatch`);
    const projectionDigest = String(projection.encodedFields?.receiptDigest || "").replace(/^0x/, "");
    assert(projectionDigest === digest, `Projection digest mismatch for ${forecast.forecastId}`);
    assert(!receiptDigests.has(digest), `Duplicate receipt digest ${digest}`);
    assert(!forecastIds.has(forecast.forecastId), `Duplicate forecast ID ${forecast.forecastId}`);
    receiptDigests.add(digest);
    forecastIds.add(forecast.forecastId);

    const presentation = stableEntityPresentation(entry, forecast);
    const originalSource = originalSourceMetadata(entry, forecast);
    const entityKey = forecast.entity.id;
    const group = entityGroups.get(entityKey) || { entries: [], presentation, entity: forecast.entity };
    assert(group.presentation.routeSlug === presentation.routeSlug, `Entity ${entityKey} has conflicting route slugs`);
    group.entries.push({ entry, document, projection, forecast, digest, presentation, entryIndex });
    entityGroups.set(entityKey, group);

    const summary = forecasterSummary(forecast);
    const forecasterPublicSlug = slugify(summary.displayName) || slugify(forecast.forecaster.id);
    const previousForecasterId = forecasterSlugOwners.get(forecasterPublicSlug);
    assert(!previousForecasterId || previousForecasterId === forecast.forecaster.id, `Forecaster public slug collision ${forecasterPublicSlug}`);
    forecasterSlugOwners.set(forecasterPublicSlug, forecast.forecaster.id);
    const protocol = proofMetadata(projection);
    const proofRequested = Boolean(entry.requestBlockchainProof);
    if (proofRequested) selectedProofCount += 1;
    if (protocol.attestationUID) verifiedProofCount += 1;

    const forecasterGroup = forecasterGroups.get(forecast.forecaster.id) || {
      forecast,
      summary,
      modes: new Set(),
      subjectCategories: new Set(),
      taskConfigurationIds: new Set(),
      subjectAssignmentIds: new Set(),
    };
    forecasterGroup.modes.add(forecast.forecaster.mode);
    forecasterGroup.subjectCategories.add(forecast.entity.identifiers?.subjectCategory || forecast.entity.type);
    if (payload.provenance?.generationConfiguration?.taskConfigId) {
      forecasterGroup.taskConfigurationIds.add(payload.provenance.generationConfiguration.taskConfigId);
    }
    const assignmentId = subjectAssignmentId(forecast.forecastId);
    if (assignmentId) forecasterGroup.subjectAssignmentIds.add(assignmentId);
    forecasterGroups.set(forecast.forecaster.id, forecasterGroup);

    const sourceRevisionId = payload.receipt?.revisionNumber ?? payload.provenance?.sourcePublication?.revision ?? 1;
    const publicForecastRecord = {
      forecastPublicId: deriveForecastPublicId({
        publisherId: PUBLIC_PUBLISHER.publisherId,
        sourceForecastId: forecast.forecastId,
        sourceRevisionId,
      }),
      sourceRevisionId,
      collectionId,
      publisherId: PUBLIC_PUBLISHER.publisherId,
      publisherSlug: PUBLIC_PUBLISHER.publicSlug,
      entityId: forecast.entity.id,
      entitySlug: presentation.routeSlug,
      forecasterId: forecast.forecaster.id,
      forecasterPublicSlug,
      forecasterLabel: entry.forecasterLabel || projection.encodedFields?.forecasterLabel || summary.displayName,
      forecaster: summary,
      forecastId: forecast.forecastId,
      forecasterMode: forecast.forecaster.mode,
      taskConfigurationId: payload.provenance?.generationConfiguration?.taskConfigId,
      subjectAssignmentId: assignmentId,
      receiptDigest: digest,
      targetName: forecast.target.name,
      targetSlug: publicTargetSlug(forecast.target),
      subjectCategory: forecast.entity.identifiers?.subjectCategory || forecast.entity.type,
      forecastCreatedAt: forecast.temporal.forecastCreatedAt,
      horizonStartAt: forecast.temporal.anchorAt,
      horizonEndAt: forecast.temporal.horizonEndAt,
      executionProvenance: entry.executionProvenance || undefined,
      originalSource,
      sortOrder: entry.sortOrder ?? entryIndex,
      chainStatus: protocol.attestationUID ? "verified" : "not_issued",
      showcaseSelected: proofRequested,
      schemaUID: protocol.schemaUID || undefined,
      attestationUID: protocol.attestationUID || undefined,
      transactionHash: protocol.transactionHash || undefined,
      attester: protocol.attester || undefined,
      blockTimestamp: protocol.blockTimestamp || undefined,
      publicationStatus: "published",
      visibility: "public",
    };
    addPlannedDocument(planned, "public_forecasts", forecast.forecastId, publicForecastRecord, "mutable_current");
    const canonicalPath = canonicalForecastPath({
      entitySlug: presentation.routeSlug,
      forecastCreatedAt: forecast.temporal.forecastCreatedAt,
      targetSlug: publicForecastRecord.targetSlug,
      forecasterSlug: forecasterPublicSlug,
      forecastPublicId: publicForecastRecord.forecastPublicId,
    });
    addPlannedDocument(planned, "public_receipt_resolvers", digest, {
      receiptDigest: digest,
      forecastPublicId: publicForecastRecord.forecastPublicId,
      canonicalPath,
      publicationStatus: "published",
      visibility: "public",
    });
    addPlannedDocument(planned, "public_forecast_resolvers", publicForecastRecord.forecastPublicId, {
      forecastPublicId: publicForecastRecord.forecastPublicId,
      forecastId: forecast.forecastId,
      entityId: forecast.entity.id,
      receiptDigest: digest,
      canonicalPath,
      publicationStatus: "published",
      visibility: "public",
    });
    addPlannedDocument(planned, "public_targets", publicForecastRecord.targetSlug, {
      targetId: `target_${publicForecastRecord.targetSlug.replaceAll("-", "_")}`,
      publicSlug: publicForecastRecord.targetSlug,
      name: forecast.target.name,
      description: forecast.target.observationDefinition,
      dimension: forecast.target.transformation || forecast.target.quantity,
      unit: forecast.target.unit,
      publicationStatus: "published",
      visibility: "public",
    });
    const forecastCatalogRecords = forecastRecordsByEntity.get(entityKey) || [];
    forecastCatalogRecords.push(publicForecastRecord);
    forecastRecordsByEntity.set(entityKey, forecastCatalogRecords);

    addPlannedDocument(planned, "public_receipts", digest, {
      collectionId,
      entityId: forecast.entity.id,
      entitySlug: presentation.routeSlug,
      forecasterId: forecast.forecaster.id,
      forecastId: forecast.forecastId,
      receiptDigest: digest,
      specVersion: document.specVersion,
      profiles: document.profiles,
      issuedAt: payload.receipt.issuedAt,
      forecastCreatedAt: forecast.temporal.forecastCreatedAt,
      horizonEndAt: forecast.temporal.horizonEndAt,
      originalSource,
      document,
      projection,
      publicationStatus: "published",
      visibility: "public",
    });

    if (protocol.attestationUID) {
      addPlannedDocument(planned, "public_proofs", `${projection.chain.hackathonTarget.caip2}__${protocol.attestationUID}`, {
        receiptDigest: digest,
        state: "verified",
        network: projection.chain.hackathonTarget,
        schemaUID: protocol.schemaUID,
        attestationUID: protocol.attestationUID,
        transactionHash: protocol.transactionHash,
        attester: protocol.attester,
        blockTimestamp: protocol.blockTimestamp,
        publicationStatus: "published",
        visibility: "public",
      });
    } else if (proofRequested) {
      addPlannedDocument(planned, "proof_jobs", `${digest}__${bundle.proofNetwork || "base-sepolia"}`, {
        receiptDigest: digest,
        collectionId,
        state: "planned",
        network: projection.chain.hackathonTarget.caip2,
        projectionVersion: projection.projectionVersion,
        createdAt: bundle.createdAt,
        attempts: 0,
      }, "mutable_current");
    }
  }

  for (const [forecasterId, group] of forecasterGroups) {
    const { forecast, summary } = group;
    addPlannedDocument(planned, "public_forecasters", forecasterId, {
      forecasterId,
      publicSlug: slugify(summary.displayName) || slugify(forecasterId),
      currentVersionId: `forecaster_version_${sha256Canonical({ forecasterId, model: forecast.forecaster.model || null }).slice(0, 20)}`,
      forecasterKind: normalizeType(forecast.forecaster.type).includes("ai") ? "ai" : isHumanParty(forecast.forecaster.type) ? "human" : "quant_model",
      implementationKind: normalizeType(forecast.forecaster.type).includes("ai") ? "llm" : isHumanParty(forecast.forecaster.type) ? "human" : "machine_learning_model",
      entityScope: "platform",
      profileType: "ai_forecaster_profile",
      type: forecast.forecaster.type,
      name: forecast.forecaster.name,
      personaLabel: summary.personaLabel,
      displayName: summary.displayName,
      description: summary.description,
      typeLabel: summary.typeLabel,
      architectureAuthors: summary.architectureAuthors,
      model: forecast.forecaster.model || null,
      publisherOrganization: PUBLISHER_ORGANIZATION,
      publisherTeam: PUBLISHER_TEAM,
      sourceProfile: {
        sourceSystem: "iPulse AI prediction architecture v2",
        sourceType: "ai_analyst",
        analystId: forecasterId,
      },
      modes: [...group.modes].filter(Boolean).sort(),
      publishedSubjectCategories: sortSubjectCategories([...group.subjectCategories]),
      taskConfigurationIds: [...group.taskConfigurationIds].sort(),
      subjectAssignmentIds: [...group.subjectAssignmentIds].sort(),
      sameAs: [],
      reviewCapabilities: ["human", "ai", "algorithm", "organization"],
      publicationStatus: "published",
      visibility: "public",
    }, "mutable_current");
  }

  addPlannedDocument(planned, "public_publishers", PUBLIC_PUBLISHER.publisherId, {
    ...PUBLIC_PUBLISHER,
    publicationStatus: "published",
    visibility: "public",
  });

  const collectionCatalogEntities = [];
  for (const [entityIndex, [entityId, group]] of [...entityGroups.entries()].entries()) {
    const proofSelected = group.entries.filter(({ entry }) => entry.requestBlockchainProof).length;
    const proofVerified = group.entries.filter(({ projection }) => proofMetadata(projection).attestationUID).length;
    const collectionEntityRecord = {
      slug: group.presentation.routeSlug,
      aliases: group.presentation.aliases,
      name: group.entity.name,
      displaySymbol: group.presentation.displaySymbol,
      marketIdentifier: group.presentation.marketIdentifier,
      iconKey: group.presentation.iconKey,
      advisorCount: group.entries.length,
      loadedCount: group.entries.length,
      receiptCount: group.entries.length,
      coverageStatus: "complete",
      chainStatus: proofVerified > 0 ? "verified" : "not_issued",
      showcaseSelectionCount: proofSelected,
      proofCount: proofVerified,
      logoUrl: group.presentation.logoUrl,
      logoAlt: group.presentation.logoAlt,
      collectionId,
      entityId,
      sortOrder: group.entries[0].entry.entitySortOrder ?? entityIndex,
      publicationStatus: "published",
      visibility: "public",
    };
    addPlannedDocument(planned, "public_collection_entities", `${collectionId}__${group.presentation.routeSlug}`, collectionEntityRecord, "mutable_current");
    collectionCatalogEntities.push(collectionEntityRecord);

    const forecastCatalogId = `${collectionId}__${entityId}`;
    const forecasts = [...(forecastRecordsByEntity.get(entityId) || [])].sort((left, right) => left.sortOrder - right.sortOrder);
    const forecastCatalog = {
      catalogVersion: "ofl-public-entity-forecast-catalog-v0.1.0",
      catalogId: forecastCatalogId,
      collectionId,
      entityId,
      entitySlug: group.presentation.routeSlug,
      generatedAt: bundle.collection.publishedAt || bundle.createdAt,
      forecastCount: forecasts.length,
      forecasts,
      publicationStatus: "published",
      visibility: "public",
    };
    assert(Buffer.byteLength(JSON.stringify(forecastCatalog), "utf8") <= MAX_PUBLIC_CATALOG_BYTES, `${forecastCatalogId} exceeds the public forecast catalog limit`);
    addPlannedDocument(planned, "public_entity_forecast_catalogs", forecastCatalogId, forecastCatalog, "mutable_current");
  }

  addPlannedDocument(planned, "public_collections", collectionId, {
    collectionId,
    publicSlug: publicCollectionSlug(collectionId, bundle.collection.publishedAt || bundle.createdAt),
    publisherId: PUBLIC_PUBLISHER.publisherId,
    publisherSlug: PUBLIC_PUBLISHER.publicSlug,
    batchId: collectionId,
    batchLabel: bundle.collection.label,
    description: bundle.collection.description,
    entityCount: entityGroups.size,
    receiptCount: bundle.entries.length,
    selectedProofCount,
    verifiedProofCount,
    publishedAt: bundle.collection.publishedAt || bundle.createdAt,
    publicationStatus: "published",
    visibility: "public",
  }, "mutable_current");

  const collectionCatalog = {
    catalogVersion: "ofl-public-collection-catalog-v0.1.0",
    collectionId,
    generatedAt: bundle.collection.publishedAt || bundle.createdAt,
    manifest: {
      batchId: collectionId,
      batchLabel: bundle.collection.label,
      description: bundle.collection.description,
      entities: collectionCatalogEntities
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map(({ collectionId: _collectionId, entityId, sortOrder: _sortOrder, publicationStatus: _publicationStatus, visibility: _visibility, ...entity }) => ({
          ...entity,
          entityId,
        })),
      receiptCount: bundle.entries.length,
      selectedProofCount,
      verifiedProofCount,
    },
    publicationStatus: "published",
    visibility: "public",
  };
  assert(Buffer.byteLength(JSON.stringify(collectionCatalog), "utf8") <= MAX_PUBLIC_CATALOG_BYTES, `${collectionId} exceeds the public collection catalog limit`);
  addPlannedDocument(planned, "public_collection_catalogs", collectionId, collectionCatalog, "mutable_current");

  const bundleDigest = sha256Canonical(bundle);
  return {
    bundleDigest,
    collectionId,
    documents: [...planned.values()],
    counts: {
      entities: entityGroups.size,
      forecasts: bundle.entries.length,
      receipts: receiptDigests.size,
      selectedProofs: selectedProofCount,
      verifiedProofs: verifiedProofCount,
    },
  };
}

/** Apply immutable records with create-or-verify semantics and refresh mutable collection indexes with Firestore BulkWriter. */
export async function publishPlan(plan, projectId, { startIndex = 0 } = {}) {
  const db = getServerFirestore(projectId);
  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let completed = 0;
  const writer = db.bulkWriter();
  writer.onWriteError((error) => [4, 8, 10, 13, 14].includes(error.code) && error.failedAttempts < 4);
  assert(Number.isInteger(startIndex) && startIndex >= 0 && startIndex <= plan.documents.length, "Invalid publisher resume index");
  const pendingDocuments = plan.documents.slice(startIndex);
  const operations = pendingDocuments.map(async (item) => {
    const reference = db.collection(item.collectionName).doc(item.documentId);
    if (item.writeMode === "mutable_current") {
      await writer.set(reference, item.value);
      updated += 1;
    } else {
      try {
        await writer.create(reference, item.value);
        created += 1;
      } catch (error) {
        if (error?.code !== 6 && error?.code !== "already-exists") throw error;
        const snapshot = await reference.get();
        assert(snapshot.exists && canonicalize(snapshot.data()) === canonicalize(item.value), `Immutable public document differs: ${reference.path}`);
        unchanged += 1;
      }
    }
    completed += 1;
    if (completed % 1_000 === 0 || completed === pendingDocuments.length) {
      console.log(`Published or verified ${completed} of ${pendingDocuments.length} pending Firestore documents...`);
    }
  });
  const operationResults = Promise.all(operations);
  await writer.close();
  await operationResults;
  const completedAt = new Date().toISOString();
  await db.collection("publisher_runs").doc(plan.bundleDigest).set({
    bundleDigest: plan.bundleDigest,
    collectionId: plan.collectionId,
    created,
    updated,
    unchanged,
    documentCount: plan.documents.length,
    resumedFrom: startIndex,
    completedAt,
    status: "complete",
  });
  return { created, updated, unchanged, resumedFrom: startIndex, completedAt };
}
