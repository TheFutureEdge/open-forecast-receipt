import { createHash } from "node:crypto";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { canonicalize } from "json-canonicalize";

export const PUBLICATION_BUNDLE_VERSION = "ofl-publication-bundle-v0.1.0";
export const MAX_SAFE_DOCUMENT_BYTES = 900_000;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function jsonCopy(value) {
  return JSON.parse(JSON.stringify(value));
}

function sha256Canonical(value) {
  return createHash("sha256").update(canonicalize(value), "utf8").digest("hex");
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
  return new RegExp(`\\b${suffix}$`, "i").test(forecaster.name)
    ? forecaster.name
    : `${forecaster.name} ${suffix}`;
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

function stableSubjectPresentation(entry, forecast) {
  const presentation = entry.subjectPresentation;
  assert(presentation && typeof presentation === "object", `Forecast ${forecast.forecastId} is missing subjectPresentation`);
  assert(typeof presentation.routeSlug === "string" && presentation.routeSlug.length > 0, `Forecast ${forecast.forecastId} is missing subjectPresentation.routeSlug`);
  return {
    routeSlug: presentation.routeSlug,
    aliases: presentation.aliases || [],
    displaySymbol: presentation.displaySymbol || forecast.subject.name,
    marketIdentifier: presentation.marketIdentifier || Object.values(forecast.subject.identifiers || {})[0] || forecast.subject.id,
    iconKey: presentation.iconKey || presentation.routeSlug,
  };
}

function addPlannedDocument(target, collectionName, documentId, value) {
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
  target.set(key, { collectionName, documentId, value: normalized });
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
  const subjectGroups = new Map();
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

    const presentation = stableSubjectPresentation(entry, forecast);
    const subjectKey = forecast.subject.id;
    const group = subjectGroups.get(subjectKey) || { entries: [], presentation, subject: forecast.subject };
    assert(group.presentation.routeSlug === presentation.routeSlug, `Subject ${subjectKey} has conflicting route slugs`);
    group.entries.push({ entry, document, projection, forecast, digest, presentation, entryIndex });
    subjectGroups.set(subjectKey, group);

    const summary = forecasterSummary(forecast);
    const protocol = proofMetadata(projection);
    const proofRequested = Boolean(entry.requestBlockchainProof);
    if (proofRequested) selectedProofCount += 1;
    if (protocol.attestationUID) verifiedProofCount += 1;

    addPlannedDocument(planned, "public_forecasters", forecast.forecaster.id, {
      forecasterId: forecast.forecaster.id,
      type: forecast.forecaster.type,
      name: forecast.forecaster.name,
      displayName: summary.displayName,
      description: summary.description,
      typeLabel: summary.typeLabel,
      architectureAuthors: summary.architectureAuthors,
      model: forecast.forecaster.model || null,
      publicationStatus: "published",
      visibility: "public",
    });

    addPlannedDocument(planned, "public_forecasts", forecast.forecastId, {
      collectionId,
      subjectId: forecast.subject.id,
      subjectSlug: presentation.routeSlug,
      forecasterId: forecast.forecaster.id,
      forecasterLabel: projection.encodedFields?.forecasterLabel || summary.displayName,
      forecaster: summary,
      forecastId: forecast.forecastId,
      receiptDigest: digest,
      targetName: forecast.target.name,
      forecastCreatedAt: forecast.temporal.forecastCreatedAt,
      horizonEndAt: forecast.temporal.horizonEndAt,
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
    });

    addPlannedDocument(planned, "public_receipts", digest, {
      collectionId,
      subjectId: forecast.subject.id,
      subjectSlug: presentation.routeSlug,
      forecasterId: forecast.forecaster.id,
      forecastId: forecast.forecastId,
      receiptDigest: digest,
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
      });
    }
  }

  for (const [subjectIndex, [subjectId, group]] of [...subjectGroups.entries()].entries()) {
    const proofSelected = group.entries.filter(({ entry }) => entry.requestBlockchainProof).length;
    const proofVerified = group.entries.filter(({ projection }) => proofMetadata(projection).attestationUID).length;
    addPlannedDocument(planned, "public_subjects", subjectId, {
      subjectId,
      type: group.subject.type,
      name: group.subject.name,
      stableSlug: group.presentation.routeSlug,
      aliases: group.presentation.aliases,
      identifiers: group.subject.identifiers || {},
      currentDisplaySymbol: group.presentation.displaySymbol,
      currentMarketIdentifier: group.presentation.marketIdentifier,
      publicationStatus: "published",
      visibility: "public",
    });
    addPlannedDocument(planned, "public_collection_subjects", `${collectionId}__${group.presentation.routeSlug}`, {
      slug: group.presentation.routeSlug,
      aliases: group.presentation.aliases,
      name: group.subject.name,
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
      collectionId,
      subjectId,
      sortOrder: group.entries[0].entry.subjectSortOrder ?? subjectIndex,
      publicationStatus: "published",
      visibility: "public",
    });
  }

  addPlannedDocument(planned, "public_collections", collectionId, {
    collectionId,
    batchId: collectionId,
    batchLabel: bundle.collection.label,
    description: bundle.collection.description,
    subjectCount: subjectGroups.size,
    receiptCount: bundle.entries.length,
    selectedProofCount,
    verifiedProofCount,
    publishedAt: bundle.collection.publishedAt || bundle.createdAt,
    publicationStatus: "published",
    visibility: "public",
  });

  const bundleDigest = sha256Canonical(bundle);
  return {
    bundleDigest,
    collectionId,
    documents: [...planned.values()],
    counts: {
      subjects: subjectGroups.size,
      forecasts: bundle.entries.length,
      receipts: receiptDigests.size,
      selectedProofs: selectedProofCount,
      verifiedProofs: verifiedProofCount,
    },
  };
}

async function createOrVerify(reference, value) {
  const snapshot = await reference.get();
  if (snapshot.exists) {
    assert(
      canonicalize(snapshot.data()) === canonicalize(value),
      `Existing document differs: ${reference.path}`,
    );
    return "unchanged";
  }
  try {
    await reference.create(value);
    return "created";
  } catch (error) {
    if (error?.code !== 6 && error?.code !== "already-exists") throw error;
    const racedSnapshot = await reference.get();
    assert(racedSnapshot.exists && canonicalize(racedSnapshot.data()) === canonicalize(value), `Concurrent publication conflict: ${reference.path}`);
    return "unchanged";
  }
}

/** Apply a validated plan using create-or-verify semantics for safe retries. */
export async function publishPlan(plan, projectId) {
  if (getApps().length === 0) {
    initializeApp({ projectId, credential: applicationDefault() });
  }
  const db = getFirestore();
  let created = 0;
  let unchanged = 0;
  for (const item of plan.documents) {
    const result = await createOrVerify(db.collection(item.collectionName).doc(item.documentId), item.value);
    if (result === "created") created += 1;
    else unchanged += 1;
  }
  const completedAt = new Date().toISOString();
  await createOrVerify(db.collection("publisher_runs").doc(plan.bundleDigest), {
    bundleDigest: plan.bundleDigest,
    collectionId: plan.collectionId,
    created,
    unchanged,
    documentCount: plan.documents.length,
    completedAt,
    status: "complete",
  });
  return { created, unchanged, completedAt };
}
