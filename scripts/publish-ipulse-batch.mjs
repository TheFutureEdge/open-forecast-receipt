#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { GoogleAuth } from "google-auth-library";
import { buildProjection, buildReceipt } from "./generate-phase1-fixtures.mjs";
import {
  planPublicationBundle,
  PUBLICATION_BUNDLE_VERSION,
  publishPlan,
} from "./lib/library-publisher.mjs";

const ROOT = resolve(import.meta.dirname, "..");
const DEFAULT_DATA_PROJECT = "data-platform-436809";
const DEFAULT_SOURCE_FIRESTORE_PROJECT = "ipulse-401013";
const DEFAULT_TARGET_PROJECT = "oflapp-staging";
const DEFAULT_BATCH = 6;
const DEFAULT_ISSUED_AT = "2026-08-06T12:00:00Z";
const SOURCE_COLLECTION = "papp_oracle_fincore_prediction_market__datasets.eod_close_price_batch_predictions";

function argumentValue(name) {
  const prefix = `${name}=`;
  return process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function bqQuery(projectId, sql) {
  const output = execFileSync("bq", [
    "query",
    `--project_id=${projectId}`,
    "--use_legacy_sql=false",
    "--format=prettyjson",
    "--max_rows=100000",
    sql,
  ], { encoding: "utf8", maxBuffer: 160 * 1024 * 1024 });
  return JSON.parse(output);
}

function parseJsonObject(value) {
  if (!value) return {};
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function plainFirestoreValue(value) {
  if (value === null || value === undefined) return value;
  if (typeof value?.toDate === "function") return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(plainFirestoreValue);
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, plainFirestoreValue(item)]));
  }
  return value;
}

function decodeFirestoreRest(value) {
  if (value === null || value === undefined) return value;
  if ("nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decodeFirestoreRest);
  if ("mapValue" in value) {
    return Object.fromEntries(Object.entries(value.mapValue.fields || {}).map(([key, item]) => [key, decodeFirestoreRest(item)]));
  }
  return value;
}

function decodeFirestoreRestDocument(document) {
  return Object.fromEntries(Object.entries(document.fields || {}).map(([key, value]) => [key, decodeFirestoreRest(value)]));
}

function slugify(value) {
  return String(value || "entity")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function compact(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))];
}

function originalSourceForReceipt(routeSlug, scoringBatch, receipt) {
  const forecastCreatedAt = receipt.receiptPayload.forecast.temporal.forecastCreatedAt;
  const publicationDate = String(forecastCreatedAt).slice(0, 10);
  assert(/^\d{4}-\d{2}-\d{2}$/.test(publicationDate), `Forecast ${receipt.receiptPayload.forecast.forecastId} has no public generation date`);
  const publicationId = `${publicationDate}-sb${scoringBatch}`;
  return {
    publisherName: "iPulse AI",
    label: "View the original historical forecast",
    url: `https://ipulseai.com/stocks/${encodeURIComponent(routeSlug)}/forecast-history/${publicationId}/ai-forecasts`,
    publicationId,
    publicationDate,
  };
}

/**
 * Backfillable run metadata. Retrieval/search are context-acquisition channels,
 * not a separate control-flow class. Batch 6 used one model invocation per
 * task; the source receipt records whether fresh search was configured and
 * what supplied evidence was sealed.
 */
function executionProvenanceForReceipt(receipt) {
  const provenance = receipt.receiptPayload?.provenance || {};
  const channels = new Set();
  if (provenance.temporal?.suppliedContext || provenance.evidence?.length) channels.add("provided_context");
  const webSearch = provenance.temporal?.acquiredEvidence?.webSearch;
  if (webSearch?.configured || provenance.generationConfiguration?.tools?.some((tool) => tool.name === "web_search")) {
    channels.add("web_search");
  }
  return {
    controlFlow: "single_model_invocation",
    contextAcquisition: [...channels],
    observedAt: provenance.temporal?.generation?.responseGeneratedAt,
    provenanceStatus: "reconstructed",
  };
}

function identifierValue(entity, scheme) {
  return entity?.identifiers?.find((identifier) => identifier.scheme === scheme)?.value;
}

function componentMetadata(contextDetails) {
  const fundamental = contextDetails.fundamental_context || contextDetails.public?.fundamental_context || {};
  return {
    fundamental_digest_sha256: fundamental.selected_payload_hash,
    fundamental_coverage_start: fundamental.quarterly_coverage?.start || fundamental.annual_coverage?.start,
    fundamental_coverage_end: fundamental.quarterly_coverage?.end || fundamental.annual_coverage?.end,
    fundamental_provider_updated_date: fundamental.provider_updated_date,
  };
}

function contextMetadata(row, details) {
  return {
    context_snapshot_id: row.context_snapshot_id,
    context_frozen_at_utc: row.context_frozen_at_utc,
    content_digest_sha256: row.content_digest_sha256,
    lineage_capture_status: row.lineage_capture_status || details.lineage_capture_status,
    created_at: row.created_at,
  };
}

function enrichSourceContext(source, details) {
  const publicContext = details.public;
  if (!publicContext || typeof publicContext !== "object") return source;
  return {
    ...source,
    input_context_snapshot: {
      ...(source.input_context_snapshot || {}),
      ...publicContext,
    },
  };
}

async function sourceDocuments(projectId, scoringBatch, assetIds) {
  const documents = [];
  const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/datastore"] });
  const token = await auth.getAccessToken();
  const names = assetIds.map((assetId) => `projects/${projectId}/databases/(default)/documents/${SOURCE_COLLECTION}/${assetId}__sb${scoringBatch}__r1`);
  for (let offset = 0; offset < names.length; offset += 50) {
    const chunk = names.slice(offset, offset + 50);
    const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:batchGet`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ documents: chunk }),
    });
    const responseText = await response.text();
    assert(response.ok, `Firestore batchGet failed (${response.status}): ${responseText.slice(0, 1000)}`);
    const parsedResponse = JSON.parse(responseText);
    const rows = Array.isArray(parsedResponse) ? parsedResponse : [parsedResponse];
    for (const row of rows) {
      if (!row.found) continue;
      const documentId = row.found.name.slice(row.found.name.lastIndexOf("/") + 1);
      documents.push({ documentId, ...plainFirestoreValue(decodeFirestoreRestDocument(row.found)) });
    }
    console.log(`Read ${Math.min(offset + chunk.length, names.length)} of ${names.length} source publication documents...`);
  }
  const foundIds = new Set(documents.map((document) => document.documentId));
  const missing = names.filter((name) => !foundIds.has(name.slice(name.lastIndexOf("/") + 1)));
  for (const missingName of missing) {
    const assetId = missingName.slice(missingName.lastIndexOf("/") + 1).replace(new RegExp(`__sb${scoringBatch}__r1$`), "");
    const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: SOURCE_COLLECTION }],
          where: {
            compositeFilter: {
              op: "AND",
              filters: [
                { fieldFilter: { field: { fieldPath: "asset_id" }, op: "EQUAL", value: { stringValue: assetId } } },
                { fieldFilter: { field: { fieldPath: "scoring_batch" }, op: "EQUAL", value: { integerValue: String(scoringBatch) } } },
              ],
            },
          },
          limit: 1,
        },
      }),
    });
    const responseText = await response.text();
    assert(response.ok, `Firestore fallback query failed (${response.status}): ${responseText.slice(0, 1000)}`);
    const row = JSON.parse(responseText).find((item) => item.document)?.document;
    if (!row) {
      console.warn(`Excluded internal-only Batch ${scoringBatch} subject without an immutable public publication: ${assetId}`);
      continue;
    }
    const documentId = row.name.slice(row.name.lastIndexOf("/") + 1);
    documents.push({ documentId, ...plainFirestoreValue(decodeFirestoreRestDocument(row)) });
    console.log(`Resolved non-r1 source document ${documentId}.`);
  }
  return documents;
}

const dataProject = argumentValue("--data-project") || DEFAULT_DATA_PROJECT;
const sourceFirestoreProject = argumentValue("--source-firestore-project") || DEFAULT_SOURCE_FIRESTORE_PROJECT;
const targetProject = argumentValue("--project") || DEFAULT_TARGET_PROJECT;
const scoringBatch = Number(argumentValue("--scoring-batch") || DEFAULT_BATCH);
const issuedAt = argumentValue("--issued-at") || DEFAULT_ISSUED_AT;
const resumeFrom = Number(argumentValue("--resume-from") || 0);
const apply = process.argv.includes("--apply");
assert(Number.isInteger(scoringBatch) && scoringBatch >= 6, "OFL iPulse AI publication starts at scoring Batch 6; earlier batches are intentionally excluded");
assert(Number.isInteger(resumeFrom) && resumeFrom >= 0, "--resume-from must be a non-negative integer");

const [schema, entityCatalog, showcaseSelection, manifest, fixtureCatalog] = await Promise.all([
  readFile(resolve(ROOT, "schema/open_forecast_receipt_v0_1.schema.json"), "utf8").then(JSON.parse),
  readFile(resolve(ROOT, `data/ipulse/scoring-batch-${scoringBatch}-entity-catalog.json`), "utf8").then(JSON.parse),
  readFile(resolve(ROOT, "src/data/fixtures/batch6-showcase-selection.json"), "utf8").then(JSON.parse),
  readFile(resolve(ROOT, "src/data/fixtures/batch6-manifest.json"), "utf8").then(JSON.parse),
  readFile(resolve(ROOT, "src/data/fixtures/batch6-catalog.json"), "utf8").then(JSON.parse),
]);

console.log(`Reading compact generation metadata for Batch ${scoringBatch}...`);
const generationRows = bqQuery(dataProject, `
  SELECT * EXCEPT(rn)
  FROM (
    SELECT prediction_request_task_id,
           subject_id,
           input_context_snapshot_id,
           CAST(prediction_requested_datetime_utc AS STRING) AS prediction_requested_datetime_utc,
           CAST(prediction_response_generated_at_utc AS STRING) AS prediction_response_generated_at_utc,
           CAST(prediction_values_end_timestamp_utc AS STRING) AS prediction_values_end_timestamp_utc,
           model_knowledge_info,
           ROW_NUMBER() OVER (
             PARTITION BY prediction_request_task_id
             ORDER BY updated_at DESC, created_at DESC
           ) AS rn
    FROM \`${dataProject}.prod__dp_oracle_fincore_prediction_market__datasets.prediction_status\`
    WHERE scoring_batch = ${scoringBatch}
      AND pulse_status = "ACTIVE"
      AND prediction_pipeline_status = "FINISHED"
  )
  WHERE rn = 1
`);

console.log(`Read ${generationRows.length} compact generation rows. Reading governed context metadata...`);
const contextRows = bqQuery(dataProject, `
  SELECT * EXCEPT(rn)
  FROM (
    SELECT context_snapshot_id,
           CAST(context_frozen_at_utc AS STRING) AS context_frozen_at_utc,
           content_digest_sha256,
           lineage_capture_status,
           CAST(created_at AS STRING) AS created_at,
           context_details,
           ROW_NUMBER() OVER (PARTITION BY context_snapshot_id ORDER BY updated_at DESC, created_at DESC) AS rn
    FROM \`${dataProject}.prod__dp_oracle_fincore_prediction_market__datasets.prediction_input_context_snapshots\`
    WHERE scoring_batch = ${scoringBatch}
      AND pulse_status = "ACTIVE"
  )
  WHERE rn = 1
`);

console.log(`Read ${contextRows.length} context rows. Reading governed asset and market identifiers...`);
const assetRows = bqQuery(dataProject, `
  WITH cohort AS (
    SELECT DISTINCT subject_id
    FROM \`${dataProject}.prod__dp_oracle_fincore_prediction_market__datasets.prediction_status\`
    WHERE scoring_batch = ${scoringBatch}
      AND pulse_status = "ACTIVE"
      AND prediction_pipeline_status = "FINISHED"
  ), assets AS (
    SELECT * EXCEPT(rn)
    FROM (
      SELECT a.*, ROW_NUMBER() OVER (PARTITION BY asset_id ORDER BY version DESC, updated_at DESC) AS rn
      FROM \`${dataProject}.prod__dp_oracle_fincore__controls.dim_fincore_market_assets\` a
    )
    WHERE rn = 1
  ), exchanges AS (
    SELECT * EXCEPT(rn)
    FROM (
      SELECT e.exchange_id, e.mic, e.operating_mic, e.time_zone,
             ROW_NUMBER() OVER (PARTITION BY exchange_id ORDER BY version DESC, updated_at DESC) AS rn
      FROM \`${dataProject}.prod__dp_oracle_fincore__controls.dim_fincore_market_exchanges\` e
    )
    WHERE rn = 1
  )
  SELECT a.asset_id, a.asset_symbol_pulse, a.name, a.currency,
         a.ticker_on_exchange, a.isin, a.subject_category,
         a.subject_category_detailed, a.blockchain_network,
         e.mic, e.operating_mic, e.time_zone
  FROM cohort c
  JOIN assets a ON a.asset_id = c.subject_id
  LEFT JOIN exchanges e ON e.exchange_id = a.exchange_id
`);

console.log(`Read ${assetRows.length} asset rows. Streaming public prediction publications from ${sourceFirestoreProject}...`);
const sources = await sourceDocuments(sourceFirestoreProject, scoringBatch, assetRows.map((row) => row.asset_id));
console.log(`Read ${sources.length} source publication documents. Building and validating receipts...`);
const generationByTask = new Map(generationRows.map((row) => [row.prediction_request_task_id, row]));
const contextById = new Map(contextRows.map((row) => [row.context_snapshot_id, row]));
const assetById = new Map(assetRows.map((row) => [row.asset_id, row]));
const catalogById = new Map(entityCatalog.forecastableEntities.map((entity) => [entity.entityId, entity]));
const legacySlugBySymbol = new Map(manifest.entities.map((entity) => [entity.displaySymbol, entity.slug]));
const fixturesByAssetSlug = new Map();
for (const fixture of fixtureCatalog.entries) {
  const fixtures = fixturesByAssetSlug.get(fixture.assetSlug) || [];
  fixtures.push(fixture);
  fixturesByAssetSlug.set(fixture.assetSlug, fixtures);
}
const selectedDigests = new Set(showcaseSelection.receipts.map((entry) => entry.receiptDigest));

assert(sources.length > 0, `No source Firestore publications found for scoring batch ${scoringBatch}`);
sources.sort((left, right) => String(left.asset_name).localeCompare(String(right.asset_name)) || String(left.asset_id).localeCompare(String(right.asset_id)));

const entries = [];
const usedSlugs = new Map();
for (const [entitySortOrder, rawSource] of sources.entries()) {
  const contextRow = contextById.get(rawSource.input_context_snapshot_id);
  const asset = assetById.get(rawSource.asset_id);
  assert(contextRow, `Missing governed context metadata for ${rawSource.input_context_snapshot_id}`);
  assert(asset, `Missing governed asset metadata for ${rawSource.asset_id}`);
  const details = parseJsonObject(contextRow.context_details);
  const source = enrichSourceContext(rawSource, details);
  const catalogEntity = catalogById.get(source.asset_id);
  const legacySlug = legacySlugBySymbol.get(asset.ticker_on_exchange);
  const routeSlug = legacySlug || catalogEntity?.stableSlug || slugify(`${source.asset_name}-${asset.ticker_on_exchange || source.asset_id}`);
  const previousEntityId = usedSlugs.get(routeSlug);
  assert(!previousEntityId || previousEntityId === source.asset_id, `Route slug collision ${routeSlug}: ${previousEntityId} and ${source.asset_id}`);
  usedSlugs.set(routeSlug, source.asset_id);
  const displaySymbol = asset.ticker_on_exchange || identifierValue(catalogEntity, "ipulse_symbol") || source.asset_name;
  const marketIdentifier = identifierValue(catalogEntity, "ticker_mic")
    || identifierValue(catalogEntity, "ticker_venue")
    || (asset.mic && asset.ticker_on_exchange ? `${asset.ticker_on_exchange}:${asset.mic}` : `ipulse:${asset.asset_symbol_pulse}`);
  const aliases = compact([
    catalogEntity?.stableSlug !== routeSlug ? catalogEntity?.stableSlug : undefined,
    asset.ticker_on_exchange?.toLowerCase(),
    asset.asset_symbol_pulse?.toLowerCase(),
  ]);
  if (legacySlug) {
    const fixtures = fixturesByAssetSlug.get(legacySlug) || [];
    assert(fixtures.length === 12, `Expected 12 sealed showcase fixtures for ${legacySlug}, found ${fixtures.length}`);
    for (const fixture of fixtures) {
      const [receipt, projection] = await Promise.all([
        readFile(resolve(ROOT, "src/data/fixtures", fixture.documentPath.replace(/^\.\//, "")), "utf8").then(JSON.parse),
        readFile(resolve(ROOT, "src/data/fixtures", fixture.projectionPath.replace(/^\.\//, "")), "utf8").then(JSON.parse),
      ]);
      entries.push({
        sortOrder: entries.length,
        entitySortOrder,
        requestBlockchainProof: selectedDigests.has(fixture.receiptDigest),
        forecasterLabel: fixture.forecasterLabel,
        originalSource: originalSourceForReceipt(routeSlug, scoringBatch, receipt),
        executionProvenance: executionProvenanceForReceipt(receipt),
        entityPresentation: {
          routeSlug,
          aliases,
          displaySymbol,
          marketIdentifier,
          iconKey: catalogEntity?.logo?.mediaAssetId || catalogEntity?.stableSlug || routeSlug,
          logoUrl: catalogEntity?.logo?.url,
          logoAlt: catalogEntity?.logo?.alt,
        },
        receipt,
        projection,
      });
    }
    continue;
  }
  const predictions = [...(source.predictions || [])].sort((left, right) => {
    const mode = String(left.advisor_snapshot?.advisor_mode).localeCompare(String(right.advisor_snapshot?.advisor_mode));
    return mode || String(left.advisor_snapshot?.persona_display_name).localeCompare(String(right.advisor_snapshot?.persona_display_name));
  });
  assert(predictions.length > 0, `Source publication ${source.documentId} has no predictions`);
  for (const prediction of predictions) {
    const generation = generationByTask.get(prediction.prediction_request_task_id);
    assert(generation, `Missing compact generation metadata for ${prediction.prediction_request_task_id}`);
    const built = buildReceipt({
      source,
      prediction,
      generation,
      contextMeta: contextMetadata(contextRow, details),
      componentMeta: componentMetadata(details),
      asset,
      receiptIssuedAt: issuedAt,
      publicShowcaseAsset: Boolean(legacySlug),
    });
    const projection = buildProjection(built.document, built);
    const advisor = prediction.advisor_snapshot;
    entries.push({
      sortOrder: entries.length,
      entitySortOrder,
      requestBlockchainProof: selectedDigests.has(built.payloadDigest),
      forecasterLabel: `${advisor.persona_display_name} / ${advisor.persona_archetype_display_name} / ${advisor.advisor_mode}`,
      originalSource: originalSourceForReceipt(routeSlug, scoringBatch, built.document),
      executionProvenance: executionProvenanceForReceipt(built.document),
      entityPresentation: {
        routeSlug,
        aliases,
        displaySymbol,
        marketIdentifier,
        iconKey: catalogEntity?.logo?.mediaAssetId || catalogEntity?.stableSlug || routeSlug,
        logoUrl: catalogEntity?.logo?.url,
        logoAlt: catalogEntity?.logo?.alt,
      },
      receipt: built.document,
      projection,
    });
  }
}

const usedForecastIds = new Set(entries.map((entry) => entry.receipt.receiptPayload.forecast.forecastId));
const unusedGenerationRows = generationRows.filter((row) => !usedForecastIds.has(row.prediction_request_task_id));
const bundle = {
  bundleVersion: PUBLICATION_BUNDLE_VERSION,
  createdAt: issuedAt,
  proofNetwork: "base-sepolia",
  collection: {
    collectionId: `batch-${scoringBatch}`,
    label: `iPulse AI Batch ${scoringBatch} Forecast Library`,
    description: `The complete public iPulse AI Batch ${scoringBatch}: ${sources.length} governed forecast subjects and ${entries.length} individual AI-forecaster receipts. Blockchain proof is selected and issued independently per receipt.`,
    publishedAt: issuedAt,
  },
  entries,
};

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validate = ajv.compile(schema);
const plan = planPublicationBundle(bundle, (document) => {
  const valid = validate(document);
  return {
    valid,
    errors: valid ? [] : (validate.errors || []).map((error) => `${error.instancePath || "/"} ${error.message}`),
  };
});

console.log(JSON.stringify({
  mode: apply ? "apply" : "dry-run",
  sourceFirestoreProject,
  dataProject,
  targetProject,
  scoringBatch,
  sourcePublicationCount: sources.length,
  generationMetadataCount: generationRows.length,
  unusedInternalGenerationRows: unusedGenerationRows.length,
  contextSnapshotCount: contextRows.length,
  collectionId: plan.collectionId,
  bundleDigest: plan.bundleDigest,
  documentCount: plan.documents.length,
  counts: plan.counts,
  resumeFrom,
}, null, 2));

const planOutput = argumentValue("--plan-output");
if (planOutput) await writeFile(resolve(planOutput), `${JSON.stringify(plan)}\n`);
if (!apply) {
  console.log("Dry run complete. Source systems were read, but no target Firestore write was made.");
  process.exit(0);
}

assert(
  process.env.OFR_CONFIRM_FIRESTORE_PROJECT === targetProject,
  "Set OFR_CONFIRM_FIRESTORE_PROJECT to the exact target project ID before applying.",
);
const result = await publishPlan(plan, targetProject, { startIndex: resumeFrom });
console.log(JSON.stringify({ targetProject, ...result }, null, 2));
