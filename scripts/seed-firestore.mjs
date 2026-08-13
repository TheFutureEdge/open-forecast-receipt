import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { canonicalize } from "json-canonicalize";

const ROOT = resolve(import.meta.dirname, "..");
const MAX_SAFE_DOCUMENT_BYTES = 900_000;
const PUBLISHER_ORGANIZATION = {
  organizationId: "oflorg_future_edge_group_fze",
  name: "Future Edge Group FZE",
  schemaOrgType: "Organization",
};
const PUBLISHER_TEAM = {
  teamId: "oflteam_ipulse_ai_research",
  name: "iPulse AI Research",
  product: "iPulse AI",
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readJson(path) {
  return JSON.parse(await readFile(resolve(ROOT, path), "utf8"));
}

function argumentValue(name) {
  const prefix = `${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

function withoutUndefined(value) {
  return JSON.parse(JSON.stringify(value));
}

function assertDocumentSize(collectionName, documentId, value) {
  const bytes = Buffer.byteLength(JSON.stringify(value), "utf8");
  assert(
    bytes <= MAX_SAFE_DOCUMENT_BYTES,
    `${collectionName}/${documentId} is ${bytes} bytes and is too close to Firestore's 1 MiB document limit`,
  );
}

function documentPathFromCatalog(relativePath) {
  return `src/data/fixtures/${relativePath.replace(/^\.\//, "")}`;
}

function normalizeForecasterType(value) {
  return value.trim().replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
}

function isHumanParty(type) {
  return ["human", "person", "individual"].includes(normalizeForecasterType(type));
}

function forecasterTypeLabel(type) {
  const normalized = normalizeForecasterType(type);
  if (normalized.includes("ai")) return "AI forecaster";
  if (normalized.includes("ensemble")) return "Ensemble forecaster";
  if (normalized.includes("hybrid")) return "Hybrid forecaster";
  if (normalized.includes("algorithm") || normalized.includes("model")) return "Model forecaster";
  if (normalized.includes("organization")) return "Organization forecaster";
  if (isHumanParty(type)) return "Human forecaster";
  return `${normalized.replaceAll("_", " ")} forecaster`;
}

function forecasterPersonaLabel(forecaster) {
  if (isHumanParty(forecaster.type)) return forecaster.name;
  const normalized = normalizeForecasterType(forecaster.type);
  const suffix = normalized.includes("ai")
    ? "AI"
    : normalized.includes("algorithm") || normalized.includes("model")
      ? "Model"
      : "Forecaster";
  return new RegExp(`\\b${suffix}$`, "i").test(forecaster.name)
    ? forecaster.name
    : `${forecaster.name} ${suffix}`;
}

function forecasterDisplayName(forecaster) {
  const personaLabel = forecasterPersonaLabel(forecaster);
  const modelName = forecaster.model?.name?.trim();
  if (!modelName || personaLabel.toLowerCase().includes(modelName.toLowerCase())) return personaLabel;
  return `${personaLabel} on ${modelName}`;
}

function forecastReviewSummary(forecast) {
  const review = forecast.review || {
    status: forecast.methodology?.humanReviewStatus === "not_reviewed" ? "not_reviewed" : "unknown",
    reviewers: [],
  };
  const reviewers = (review.reviewers || []).slice(0, 10);
  return {
    status: review.status,
    reviewers,
    reviewerCount: reviewers.length,
    humanReviewerCount: reviewers.filter((reviewer) => isHumanParty(reviewer.type)).length,
  };
}

function forecastForecasterSummary(forecast) {
  const forecaster = forecast.forecaster;
  const model = forecaster.model;
  const review = forecastReviewSummary(forecast);
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
    architectureAuthors: (forecaster.architectureAuthors || []).slice(0, 10),
    reviewStatus: review.status,
    reviewers: review.reviewers,
    reviewerCount: review.reviewerCount,
    humanReviewerCount: review.humanReviewerCount,
  };
}

function subjectAssignmentId(forecastId) {
  return String(forecastId || "").match(/__(xrefsubjtskconf_[0-9a-f-]+)__/i)?.[1];
}

const SUBJECT_CATEGORY_ORDER = ["equity", "crypto", "forex", "commodity", "index", "fund"];

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

const projectId = argumentValue("--project")
  || process.env.GCLOUD_PROJECT
  || process.env.GOOGLE_CLOUD_PROJECT;
const applyToCloud = process.argv.includes("--apply");

assert(projectId, "Pass --project=<project-id>.");
const [manifest, catalog, showcaseSelection] = await Promise.all([
  readJson("src/data/fixtures/batch6-manifest.json"),
  readJson("src/data/fixtures/batch6-catalog.json"),
  readJson("src/data/fixtures/batch6-showcase-selection.json"),
]);

const selectedDigests = new Set(showcaseSelection.receipts.map((receipt) => receipt.receiptDigest));
const entriesByAsset = new Map();
for (const entry of catalog.entries) {
  const entries = entriesByAsset.get(entry.assetSlug) || [];
  entries.push(entry);
  entriesByAsset.set(entry.assetSlug, entries);
}

const documents = [];
function addDocument(collectionName, documentId, value) {
  const normalized = withoutUndefined(value);
  assertDocumentSize(collectionName, documentId, normalized);
  documents.push({ collectionName, documentId, value: normalized });
}

const verifiedProofCount = catalog.entries.filter((entry) => entry.chainStatus === "verified").length;
addDocument("public_collections", manifest.batchId, {
  collectionId: manifest.batchId,
  batchId: manifest.batchId,
  batchLabel: manifest.batchLabel,
  description: manifest.description,
  entityCount: manifest.entities.length,
  receiptCount: catalog.entries.length,
  selectedProofCount: selectedDigests.size,
  verifiedProofCount,
  publishedAt: catalog.generatedAt,
  publicationStatus: "published",
  visibility: "public",
});

const entityRecords = new Map();
const forecasterRecords = new Map();

for (const [sortOrder, asset] of manifest.entities.entries()) {
  const assetEntries = entriesByAsset.get(asset.slug) || [];
  assert(assetEntries.length > 0, `No catalog entries found for ${asset.slug}`);
  const firstDocument = await readJson(documentPathFromCatalog(assetEntries[0].documentPath));
  const entity = firstDocument.receiptPayload.forecast.entity;
  const selectedCount = assetEntries.filter((entry) => selectedDigests.has(entry.receiptDigest)).length;
  const proofCount = assetEntries.filter((entry) => entry.chainStatus === "verified").length;

  const publicEntity = {
    entityId: entity.id,
    entityType: entity.type,
    canonicalName: entity.name,
    stableSlug: asset.slug,
    aliases: asset.aliases || [],
    identifiers: entity.identifiers || {},
    currentDisplaySymbol: asset.displaySymbol,
    currentMarketIdentifier: asset.marketIdentifier,
    publicationStatus: "published",
    visibility: "public",
  };
  entityRecords.set(entity.id, publicEntity);

  addDocument("public_collection_entities", `${manifest.batchId}__${asset.slug}`, {
    ...asset,
    collectionId: manifest.batchId,
    entityId: entity.id,
    showcaseSelectionCount: selectedCount,
    proofCount,
    sortOrder,
    publicationStatus: "published",
    visibility: "public",
  });
}

for (const [sortOrder, entry] of catalog.entries.entries()) {
  const [document, projection] = await Promise.all([
    readJson(documentPathFromCatalog(entry.documentPath)),
    readJson(documentPathFromCatalog(entry.projectionPath)),
  ]);
  const payload = document.receiptPayload;
  const forecast = payload.forecast;
  const forecaster = forecast.forecaster;
  const forecasterSummary = forecastForecasterSummary(forecast);
  const protocol = projection.protocolSuppliedAfterIssuance;
  const generationConfiguration = payload.provenance?.generationConfiguration;
  const assignmentId = subjectAssignmentId(forecast.forecastId);

  if (!forecasterRecords.has(forecaster.id)) {
    forecasterRecords.set(forecaster.id, {
      forecasterId: forecaster.id,
      entityScope: "platform",
      profileType: "ai_forecaster_profile",
      type: forecaster.type,
      name: forecaster.name,
      personaLabel: forecasterSummary.personaLabel,
      displayName: forecasterSummary.displayName,
      description: forecasterSummary.description,
      typeLabel: forecasterSummary.typeLabel,
      architectureAuthors: forecasterSummary.architectureAuthors,
      model: forecaster.model || null,
      publisherOrganization: PUBLISHER_ORGANIZATION,
      publisherTeam: PUBLISHER_TEAM,
      sourceProfile: {
        sourceSystem: "iPulse AI prediction architecture v2",
        sourceType: "ai_analyst",
        analystId: forecaster.id,
      },
      modes: [],
      publishedSubjectCategories: [],
      taskConfigurationIds: [],
      subjectAssignmentIds: [],
      sameAs: [],
      reviewCapabilities: ["human", "ai", "algorithm", "organization"],
      publicationStatus: "published",
      visibility: "public",
    });
  }
  const forecasterRecord = forecasterRecords.get(forecaster.id);
  forecasterRecord.modes = [...new Set([...forecasterRecord.modes, forecaster.mode].filter(Boolean))].sort();
  const subjectCategory = forecast.entity.identifiers?.subjectCategory || forecast.entity.type;
  forecasterRecord.publishedSubjectCategories = sortSubjectCategories([
    ...forecasterRecord.publishedSubjectCategories,
    subjectCategory,
  ]);
  forecasterRecord.taskConfigurationIds = [...new Set([
    ...forecasterRecord.taskConfigurationIds,
    generationConfiguration?.taskConfigId,
  ].filter(Boolean))].sort();
  forecasterRecord.subjectAssignmentIds = [...new Set([
    ...forecasterRecord.subjectAssignmentIds,
    assignmentId,
  ].filter(Boolean))].sort();

  addDocument("public_forecasts", forecast.forecastId, {
    collectionId: manifest.batchId,
    entityId: forecast.entity.id,
    entitySlug: entry.assetSlug,
    forecasterId: forecaster.id,
    forecasterLabel: entry.forecasterLabel,
    forecaster: forecasterSummary,
    forecastId: forecast.forecastId,
    forecasterMode: forecaster.mode,
    taskConfigurationId: generationConfiguration?.taskConfigId,
    subjectAssignmentId: assignmentId,
    receiptDigest: entry.receiptDigest,
    targetName: forecast.target.name,
    subjectCategory,
    forecastCreatedAt: forecast.temporal.forecastCreatedAt,
    horizonEndAt: forecast.temporal.horizonEndAt,
    sortOrder,
    chainStatus: entry.chainStatus,
    showcaseSelected: selectedDigests.has(entry.receiptDigest),
    schemaUID: protocol.schemaUID || undefined,
    attestationUID: protocol.attestationUID || undefined,
    transactionHash: protocol.transactionHash || undefined,
    attester: protocol.attester || undefined,
    blockTimestamp: protocol.blockTimestamp || undefined,
    publicationStatus: "published",
    visibility: "public",
  });

  addDocument("public_receipts", entry.receiptDigest, {
    collectionId: manifest.batchId,
    entityId: forecast.entity.id,
    entitySlug: entry.assetSlug,
    forecasterId: forecaster.id,
    forecastId: forecast.forecastId,
    receiptDigest: entry.receiptDigest,
    specVersion: document.specVersion,
    profiles: document.profiles,
    issuedAt: payload.receipt.issuedAt,
    forecastCreatedAt: forecast.temporal.forecastCreatedAt,
    horizonEndAt: forecast.temporal.horizonEndAt,
    document,
    projection,
    publicationStatus: "published",
    visibility: "public",
  });

  if (protocol.attestationUID) {
    addDocument("public_proofs", `${projection.chain.hackathonTarget.caip2}__${protocol.attestationUID}`, {
      receiptDigest: entry.receiptDigest,
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
  } else if (selectedDigests.has(entry.receiptDigest)) {
    addDocument("proof_jobs", `${entry.receiptDigest}__base-sepolia`, {
      receiptDigest: entry.receiptDigest,
      collectionId: manifest.batchId,
      state: "planned",
      network: "eip155:84532",
      projectionVersion: projection.projectionVersion,
      createdAt: catalog.generatedAt,
      attempts: 0,
    });
  }
}

for (const [forecasterId, forecaster] of forecasterRecords) {
  addDocument("public_forecasters", forecasterId, forecaster);
}

const planSummary = {
  mode: applyToCloud ? "apply" : "dry-run",
  target: projectId,
  collectionId: manifest.batchId,
  plannedDocuments: documents.length,
  entities: entityRecords.size,
  forecasters: forecasterRecords.size,
  forecasts: catalog.entries.length,
  receipts: catalog.entries.length,
  proofJobs: documents.filter((item) => item.collectionName === "proof_jobs").length,
};
console.log(JSON.stringify(planSummary, null, 2));

if (!applyToCloud) {
  console.log("Dry run complete. No Firestore connection or write was made.");
  process.exit(0);
}

assert(
  process.env.OFR_CONFIRM_FIRESTORE_PROJECT === projectId,
  "Set OFR_CONFIRM_FIRESTORE_PROJECT to the exact target project ID before a cloud import.",
);
if (getApps().length === 0) {
  initializeApp({ projectId, credential: applicationDefault() });
}
const db = getFirestore();

// The semantic entity catalog is governed separately. This collection publisher
// may reference its IDs, but must never replace the richer entity master records.
const entityReferences = [...entityRecords.keys()].map((entityId) => db.collection("public_entities").doc(entityId));
const entitySnapshots = await db.getAll(...entityReferences);
const missingEntities = entitySnapshots.filter((snapshot) => !snapshot.exists).map((snapshot) => snapshot.id);
assert(missingEntities.length === 0, `Publish the governed entity catalog first. Missing entity IDs: ${missingEntities.join(", ")}`);

assert(documents.length < 500, `The publication contains ${documents.length} writes; split it before using a Firestore batch.`);
const mutableCollections = new Set([
  "public_collections",
  "public_collection_entities",
  "public_forecasters",
  "public_forecasts",
  "proof_jobs",
]);
const references = documents.map((item) => db.collection(item.collectionName).doc(item.documentId));
const currentSnapshots = await db.getAll(...references);
const batch = db.batch();
let created = 0;
let updated = 0;
let unchanged = 0;

for (const [index, item] of documents.entries()) {
  const reference = references[index];
  const snapshot = currentSnapshots[index];
  if (!snapshot.exists) {
    batch.create(reference, item.value);
    created += 1;
    continue;
  }
  if (canonicalize(snapshot.data()) === canonicalize(item.value)) {
    unchanged += 1;
    continue;
  }
  assert(mutableCollections.has(item.collectionName), `Immutable public document differs: ${reference.path}`);
  batch.set(reference, item.value);
  updated += 1;
}
await batch.commit();

console.log(JSON.stringify({ ...planSummary, created, updated, unchanged }, null, 2));
