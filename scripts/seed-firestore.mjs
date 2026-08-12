import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const ROOT = resolve(import.meta.dirname, "..");
const MAX_SAFE_DOCUMENT_BYTES = 900_000;

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

function forecasterDisplayName(forecaster) {
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

const projectId = argumentValue("--project")
  || process.env.GCLOUD_PROJECT
  || process.env.GOOGLE_CLOUD_PROJECT;
const applyToCloud = process.argv.includes("--apply");

assert(projectId, "Pass --project=<project-id>.");
assert(applyToCloud, "Cloud writes require --apply.");
assert(
  process.env.OFR_CONFIRM_FIRESTORE_PROJECT === projectId,
  "Set OFR_CONFIRM_FIRESTORE_PROJECT to the exact target project ID before a cloud import.",
);

if (getApps().length === 0) {
  initializeApp({ projectId, credential: applicationDefault() });
}

const db = getFirestore();
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
  subjectCount: manifest.assets.length,
  receiptCount: catalog.entries.length,
  selectedProofCount: selectedDigests.size,
  verifiedProofCount,
  publishedAt: catalog.generatedAt,
  publicationStatus: "published",
  visibility: "public",
});

const subjectRecords = new Map();
const forecasterRecords = new Map();

for (const [sortOrder, asset] of manifest.assets.entries()) {
  const assetEntries = entriesByAsset.get(asset.slug) || [];
  assert(assetEntries.length > 0, `No catalog entries found for ${asset.slug}`);
  const firstDocument = await readJson(documentPathFromCatalog(assetEntries[0].documentPath));
  const subject = firstDocument.receiptPayload.forecast.subject;
  const selectedCount = assetEntries.filter((entry) => selectedDigests.has(entry.receiptDigest)).length;
  const proofCount = assetEntries.filter((entry) => entry.chainStatus === "verified").length;

  const publicSubject = {
    subjectId: subject.id,
    type: subject.type,
    name: subject.name,
    stableSlug: asset.slug,
    aliases: asset.aliases || [],
    identifiers: subject.identifiers || {},
    currentDisplaySymbol: asset.displaySymbol,
    currentMarketIdentifier: asset.marketIdentifier,
    publicationStatus: "published",
    visibility: "public",
  };
  subjectRecords.set(subject.id, publicSubject);

  addDocument("public_collection_subjects", `${manifest.batchId}__${asset.slug}`, {
    ...asset,
    collectionId: manifest.batchId,
    subjectId: subject.id,
    showcaseSelectionCount: selectedCount,
    proofCount,
    sortOrder,
    publicationStatus: "published",
    visibility: "public",
  });
}

for (const [subjectId, subject] of subjectRecords) {
  addDocument("public_subjects", subjectId, subject);
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

  if (!forecasterRecords.has(forecaster.id)) {
    forecasterRecords.set(forecaster.id, {
      forecasterId: forecaster.id,
      type: forecaster.type,
      name: forecaster.name,
      displayName: forecasterSummary.displayName,
      description: forecasterSummary.description,
      typeLabel: forecasterSummary.typeLabel,
      architectureAuthors: forecasterSummary.architectureAuthors,
      model: forecaster.model || null,
      reviewCapabilities: ["human", "ai", "algorithm", "organization"],
      publicationStatus: "published",
      visibility: "public",
    });
  }

  addDocument("public_forecasts", forecast.forecastId, {
    collectionId: manifest.batchId,
    subjectId: forecast.subject.id,
    subjectSlug: entry.assetSlug,
    forecasterId: forecaster.id,
    forecasterLabel: entry.forecasterLabel,
    forecaster: forecasterSummary,
    forecastId: forecast.forecastId,
    receiptDigest: entry.receiptDigest,
    targetName: forecast.target.name,
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
    subjectId: forecast.subject.id,
    subjectSlug: entry.assetSlug,
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

assert(documents.length < 500, `The seed contains ${documents.length} writes; split it before using a Firestore batch.`);
const batch = db.batch();
for (const item of documents) {
  const reference = db.collection(item.collectionName).doc(item.documentId);
  batch.create(reference, item.value);
}
await batch.commit();

console.log(JSON.stringify({
  target: projectId,
  collectionId: manifest.batchId,
  writes: documents.length,
  subjects: subjectRecords.size,
  forecasters: forecasterRecords.size,
  forecasts: catalog.entries.length,
  receipts: catalog.entries.length,
  proofJobs: documents.filter((item) => item.collectionName === "proof_jobs").length,
}, null, 2));
