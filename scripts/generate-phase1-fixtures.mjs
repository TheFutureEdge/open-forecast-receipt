#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { canonicalize } from "json-canonicalize";
import { encodeAbiParameters, parseAbiParameters } from "viem";

const ROOT = resolve(import.meta.dirname, "..");
const SCHEMA_URI = "https://ipulseai.com/schemas/open-forecast-receipt/v0.1.0/schema.json";
const SPEC_VERSION = "0.1.0";
const DEFAULT_ISSUED_AT = "2026-08-06T12:00:00Z";
const EAS_CONFIG = JSON.parse(await readFile(resolve(ROOT, "src/data/eas-base-sepolia.json"), "utf8"));
const EAS_SCHEMA = EAS_CONFIG.schema;
const EAS_PARAMETERS = parseAbiParameters(EAS_SCHEMA);

const SOURCES = [
  { slug: "alphabet", file: "ofr-alphabet-publication.json" },
  { slug: "bitcoin", file: "ofr-bitcoin-publication.json" },
  { slug: "nvidia", file: "ofr-nvidia-publication.json" },
  { slug: "pepsi", file: "ofr-pepsi-publication.json" },
  { slug: "spy", file: "ofr-spy-publication.json" },
];

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=")];
  }),
);
const sourceDir = resolve(args["source-dir"] || "/private/tmp");
const issuedAt = toIso(args["issued-at"] || DEFAULT_ISSUED_AT);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function toIso(value) {
  if (!value) return undefined;
  const normalized = String(value).replace(" ", "T").replace(/\+00:00$/, "Z");
  return /Z$|[+-]\d\d:\d\d$/.test(normalized) ? normalized : `${normalized}Z`;
}

function dateOnly(value) {
  return toIso(value).slice(0, 10);
}

function asLowerStatus(value) {
  return String(value || "unknown").toLowerCase();
}

function decodeFirestore(value) {
  if (value === null || typeof value !== "object") return value;
  if ("nullValue" in value) return null;
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("arrayValue" in value) return (value.arrayValue.values || []).map(decodeFirestore);
  if ("mapValue" in value) {
    return Object.fromEntries(
      Object.entries(value.mapValue.fields || {}).map(([key, item]) => [key, decodeFirestore(item)]),
    );
  }
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, decodeFirestore(item)]));
}

function decodeDocument(document) {
  return decodeFirestore({ mapValue: { fields: document.fields || {} } });
}

function compactObject(entries) {
  return Object.fromEntries(entries.filter(([, value]) => value !== undefined && value !== null && value !== ""));
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function archivePublishedAt(fileName) {
  const match = String(fileName || "").match(/__(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})\.md$/);
  return match ? `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:00Z` : undefined;
}

function buildComponents(context, componentMeta) {
  const components = [];
  if (componentMeta?.fundamental_digest_sha256) {
    components.push(compactObject([
      ["type", "fundamental_data"],
      ["contentDigestSha256", componentMeta.fundamental_digest_sha256],
      ["coverageStart", componentMeta.fundamental_coverage_start],
      ["coverageEnd", componentMeta.fundamental_coverage_end],
      ["providerUpdatedAt", componentMeta.fundamental_provider_updated_date],
      ["lineageStatus", asLowerStatus(context.lineage_capture_status)],
    ]));
  }
  for (const global of context.global_context || []) {
    const digest = global.content_metrics?.sha256;
    if (!digest) continue;
    components.push(compactObject([
      ["type", `global_market_context_${String(global.coverage_start || "unknown").slice(0, 4)}${String(global.coverage_end || "").endsWith("05-31") ? "_ytd" : ""}`],
      ["contentDigestSha256", digest],
      ["coverageStart", global.coverage_start],
      ["coverageEnd", global.coverage_end],
      ["knowledgeCutoff", global.knowledge_cutoff],
      ["providerUpdatedAt", archivePublishedAt(global.archive_file_name)],
      ["lineageStatus", asLowerStatus(global.lineage_capture_status)],
    ]));
  }
  return components;
}

function buildEvidence(context, contextFrozenAt, componentMeta, assetName) {
  const evidence = (context.global_context || []).flatMap((global) => {
    const digest = global.content_metrics?.sha256;
    if (!digest) return [];
    return [compactObject([
      ["evidenceId", `sha256:${digest}`],
      ["title", global.display_name || global.file_name || "Global market context"],
      ["source", "iPulse AI public audit archive"],
      ["publisher", "iPulse AI"],
      ["uri", global.archive_url],
      ["publishedAt", archivePublishedAt(global.archive_file_name)],
      ["suppliedAt", contextFrozenAt],
      ["acquisitionMode", "internal_dataset"],
      ["contentDigestSha256", digest],
      ["visibility", "public"],
      ["supports", ["global_market_context"]],
    ])];
  });

  if (componentMeta?.fundamental_digest_sha256) {
    evidence.push(compactObject([
      ["evidenceId", `sha256:${componentMeta.fundamental_digest_sha256}`],
      ["title", `${assetName} fundamental input-context selection`],
      ["source", "iPulse AI fundamental-data pipeline"],
      ["suppliedAt", contextFrozenAt],
      ["acquisitionMode", "internal_dataset"],
      ["contentDigestSha256", componentMeta.fundamental_digest_sha256],
      ["visibility", "hash_only"],
      ["licenseOrAccessNote", "The public receipt exposes only compact lineage and the exact-content digest; licensed source values are not republished."],
      ["supports", ["fundamental_context"]],
    ]));
  }
  return evidence;
}

function buildReceipt({ source, prediction, generation, contextMeta, componentMeta, asset }) {
  const advisor = prediction.advisor_snapshot;
  const context = source.input_context_snapshot;
  const publication = source.publication_snapshot;
  const publicationId = publication.publication_key;
  const publicationRevision = Number(publication.publication_revision);
  const forecastId = prediction.prediction_request_task_id;
  const forecastCreatedAt = toIso(generation.prediction_response_generated_at_utc);
  const requestSubmittedAt = toIso(generation.prediction_requested_datetime_utc);
  const anchorAt = toIso(prediction.forecast_horizon_anchor_value_timestamp_utc || context.market_anchor.timestamp_utc);
  const horizonEndAt = toIso(generation.prediction_values_end_timestamp_utc || publication.final_forecast_at_utc);
  const evaluationEligibleAt = `${horizonEndAt.slice(0, 10)}T23:59:59Z`;
  const releasedAt = toIso(publication.frozen_at_utc);
  const contextFrozenAt = toIso(contextMeta.context_frozen_at_utc);
  const contextRecordedAt = toIso(contextMeta.created_at);
  const sourceForecastDigest = sha256(canonicalize(prediction));
  const receiptIdDigest = sha256(`${forecastId}\n${publicationId}\n${SPEC_VERSION}`);
  const webSearchConfigured = advisor.user_visible_configuration?.web_search === "enabled";
  const personaVersion = advisor.controls_versions?.analyst_persona;
  const outputVersion = advisor.controls_versions?.output_schema;
  const anchorValue = Number(prediction.forecast_horizon_anchor_value ?? context.market_anchor.value);
  const anchorValueScaled = Math.round(anchorValue * 1_000_000);
  const points = [...prediction.timeseries_numerical]
    .sort((a, b) => Number(a.forecast_step) - Number(b.forecast_step))
    .map((point) => ({
      step: Number(point.forecast_step),
      validAt: toIso(point.forecast_timestamp_utc),
      value: Math.round(Number(point.predicted_step_over_step_change_percent) * 100),
    }));
  const identifiers = compactObject([
    ["ticker", asset.ticker_on_exchange],
    ["marketIdentifierCode", asset.mic],
    ["operatingMarketIdentifierCode", asset.operating_mic],
    ["ipulseSymbol", asset.asset_symbol_pulse],
    ["isin", asset.isin],
    ["subjectCategory", asset.subject_category],
    ["subjectCategoryDetailed", asset.subject_category_detailed],
    ["blockchainNetwork", asset.blockchain_network],
  ]);
  const marketSession = asset.subject_category === "crypto" ? "continuous" : "regular_close";
  const frameworkVersion = personaVersion
    ? `${personaVersion.major_version}.${personaVersion.minor_version}`
    : undefined;

  const receiptPayload = {
    receipt: {
      receiptId: `https://ipulseai.com/receipts/sha256/${receiptIdDigest}`,
      status: "example",
      issuanceMode: "retrospective",
      revisionNumber: 1,
      revisionType: "original",
      issuedAt,
      sealedAt: issuedAt,
    },
    issuer: {
      id: "https://ipulseai.com",
      name: "iPulse AI",
    },
    forecast: {
      forecastId,
      run: {
        runId: publicationId,
        runNumber: Number(source.scoring_batch),
        revision: publicationRevision,
      },
      subject: {
        type: "FinancialInstrument",
        id: source.asset_id,
        name: source.asset_name,
        identifiers,
      },
      target: {
        name: "eod_close_price_step_over_step_percentage_change",
        kind: "numeric_time_series",
        quantity: "return",
        unit: "basis_point",
        transformation: "step_over_step_percentage_change",
        baseQuantity: "eod_close_price",
        baseUnit: source.asset_currency,
        observationDefinition: "The target observable is the end-of-day close price. Each prediction point is the percentage change from the preceding anchored or forecast point, and the price path is reconstructed by compounding the ordered changes.",
      },
      temporal: {
        forecastCreatedAt,
        anchorAt,
        horizonEndAt,
        evaluationEligibleAt,
        maturityRule: "Evaluate only after the final forecast horizon has closed and the corresponding end-of-day close observation is available under the stated adjustment policy.",
        cadence: {
          unit: advisor.forecast_timeseries_step_unit,
          value: Number(advisor.forecast_timeseries_step_value),
          count: points.length,
        },
      },
      anchor: {
        valueDecimal: String(anchorValue),
        valueScaled: anchorValueScaled,
        scale: 6,
        unit: source.asset_currency,
        observedAt: anchorAt,
        source: "iPulse AI production market-data pipeline",
        timezone: asset.time_zone || "UTC",
        marketSession,
        adjustmentBasis: "source publication value",
      },
      prediction: {
        representation: "ordered_regular_step_path",
        valueType: "step_over_step_percentage_change",
        unit: "basis_point",
        points,
      },
      classification: {
        scheme: "ipulse-investment-rating-v1",
        value: prediction.investment_rating_by_model,
      },
      forecaster: {
        type: "AIAdvisor",
        id: advisor.advisor_id,
        name: advisor.persona_display_name,
        role: advisor.persona_archetype_display_name,
        mode: advisor.advisor_mode,
        model: {
          provider: advisor.model_provider_organization,
          organization: advisor.model_author,
          name: advisor.model_spec_display_name,
          apiIdentifier: JSON.parse(generation.model_knowledge_info || "{}").api_model_identifier,
          specId: advisor.model_spec_id,
          versionId: advisor.model_version_id,
          versionName: advisor.model_name,
          releaseDate: toIso(advisor.model_version_release_date),
        },
      },
      methodology: {
        taskType: advisor.task_type,
        humanReviewStatus: "not_recorded",
      },
      conditions: [],
    },
    provenance: {
      sourceSystem: "iPulse AI",
      sourcePublication: compactObject([
        ["id", publicationId],
        ["revision", publicationRevision],
        ["digestSha256", source.content_digest_sha256],
        ["generatedAt", toIso(publication.generated_at_utc)],
        ["publishedAt", releasedAt],
        ["correctionReason", publication.correction_reason],
      ]),
      sourceForecastDigest,
      mapping: {
        adapter: "ipulse-to-ofr-market-ai",
        version: SPEC_VERSION,
        sourceSchema: `${publication.schema_version} / output schema ${outputVersion?.schema_version || "unknown"}`,
        sourceTargetName: "eod_close_price_pct_change",
        sourceValueField: "predictions[*].timeseries_numerical[*].predicted_step_over_step_change_percent",
        sourceValueUnit: "percent",
        outputValueEncoding: "basis_points = source_percent * 100; one basis point is 0.01 percentage point",
        sourceForecastDigestScope: "SHA-256 over RFC 8785 canonical JSON for the logically unwrapped individual predictions[*] object, preserving array order",
        receiptIdDerivation: "SHA-256 over UTF-8 forecastId + LF + sourcePublication.id + LF + specVersion; rendered under https://ipulseai.com/receipts/sha256/",
      },
      temporal: {
        baseModelKnowledge: {
          cutoffAt: toIso(advisor.model_knowledge_cutoff_timestamp_utc),
          precision: "day",
          status: "declared",
          source: {
            type: "producer_model_registry",
            recordId: advisor.model_version_id,
            metadataVersion: 2,
            declaredBy: "iPulse AI model registry",
          },
        },
        suppliedContext: {
          snapshotId: source.input_context_snapshot_id,
          digestSha256: contextMeta.content_digest_sha256,
          effectiveAt: contextFrozenAt,
          recordedAt: contextRecordedAt,
          captureStatus: asLowerStatus(contextMeta.lineage_capture_status),
          components: buildComponents(context, componentMeta),
        },
        marketState: {
          observedAt: anchorAt,
          source: "iPulse AI production market-data pipeline",
          timezone: asset.time_zone || "UTC",
          marketSession,
          tradingDate: dateOnly(anchorAt),
          currency: source.asset_currency,
          adjustmentBasis: "source publication value",
        },
        generation: {
          requestSubmittedAt,
          responseGeneratedAt: forecastCreatedAt,
        },
        acquiredEvidence: {
          webSearch: {
            configured: webSearchConfigured,
            executionStatus: webSearchConfigured ? "unknown" : "not_executed",
            evidenceManifestStatus: "not_captured",
          },
        },
        releasedAt,
        evaluationEligibleAt,
      },
      generationConfiguration: compactObject([
        ["taskType", advisor.task_type],
        ["taskConfigId", advisor.task_config_id],
        ["promptAssemblyId", advisor.prompt_assembly?.assembly_id],
        ["promptAssemblyVariantHash", advisor.prompt_assembly?.assembly_variant_hash],
        ["tools", webSearchConfigured ? [{ name: "web_search", status: "configured" }] : undefined],
        ["analyticalFrameworks", [{ id: advisor.persona_character, version: frameworkVersion }]],
        ["outputSchemaId", outputVersion?.id],
        ["outputSchemaVersion", outputVersion?.schema_version],
        ["pipelineVersion", advisor.controls_versions?.pipeline_version],
        ["humanReviewStatus", "not_recorded"],
      ]),
      evidence: buildEvidence(context, contextFrozenAt, componentMeta, source.asset_name),
    },
    disclosure: {
      visibility: "public",
      license: "MIT",
      disclaimer: "This is a forecast record, not investment advice and not proof of forecast accuracy.",
      limitations: [
        "The receipt proves payload integrity and, after attestation, publication timing; it does not prove correctness.",
        "This is a retrospective receipt created after the original forecast publication; a later blockchain timestamp must not be presented as the forecast creation time.",
        "The input-context snapshot was reconstructed as a historical backfill and is labeled accordingly.",
        webSearchConfigured
          ? "Web search was configured for this run, but execution and result-level grounding were not retained and therefore remain unknown."
          : "Web search was not configured for this run, so no search execution is claimed.",
        "Prediction values are integer basis points: -400 means -4.00 percent, not -0.40 percent.",
        "Named forecasters are software advisor personas used by iPulse AI; the receipt does not claim endorsement by or affiliation with the named person.",
      ],
    },
    extensions: {
      ipulse: {
        publicShowcaseAsset: true,
        consensusExcluded: true,
        individualForecastEntity: true,
      },
    },
  };

  const payloadDigest = sha256(canonicalize(receiptPayload));
  return {
    document: {
      $schema: SCHEMA_URI,
      specVersion: SPEC_VERSION,
      profiles: ["ofr-core-v0.1.0", "ofr-market-v0.1.0", "ofr-ai-v0.1.0"],
      receiptPayload,
      proofEnvelope: {
        canonicalization: "RFC8785",
        hashAlgorithm: "SHA-256",
        digestScope: "receiptPayload",
        payloadDigestSha256: payloadDigest,
        proofs: [],
      },
    },
    payloadDigest,
    anchorValueScaled,
    points,
  };
}

function buildProjection(document, derived) {
  const payload = document.receiptPayload;
  const forecast = payload.forecast;
  const assetIdentifiers = forecast.subject.identifiers || {};
  const subjectRef = assetIdentifiers.marketIdentifierCode
    ? `ticker:${assetIdentifiers.ticker}@${assetIdentifiers.marketIdentifierCode}`
    : `ipulse:${assetIdentifiers.ipulseSymbol}`;
  const stepReturnBps = derived.points.map((point) => point.value).join(",");
  const forecasterLabel = [
    forecast.forecaster.name,
    forecast.forecaster.role,
    forecast.forecaster.mode,
    forecast.forecaster.model?.name,
  ].filter(Boolean).join(" / ");
  const encodedFields = {
    subjectRef,
    runNumber: forecast.run.runNumber,
    runRevision: forecast.run.revision,
    forecastId: `0x${sha256(forecast.forecastId)}`,
    forecasterId: `0x${sha256(forecast.forecaster.id)}`,
    forecasterLabel,
    forecastCreatedAt: Math.floor(Date.parse(forecast.temporal.forecastCreatedAt) / 1000),
    anchorAt: Math.floor(Date.parse(forecast.temporal.anchorAt) / 1000),
    anchorValueMicros: derived.anchorValueScaled,
    target: forecast.target.name,
    anchorUnit: forecast.anchor.unit,
    classification: forecast.classification.value,
    retrospective: payload.receipt.issuanceMode === "retrospective",
    cadenceMonths: forecast.temporal.cadence.value,
    pointCount: derived.points.length,
    stepReturnBps,
    receiptDigest: `0x${document.proofEnvelope.payloadDigestSha256}`,
  };
  const encoded = encodeAbiParameters(EAS_PARAMETERS, [
    encodedFields.subjectRef,
    encodedFields.runNumber,
    encodedFields.runRevision,
    encodedFields.forecastId,
    encodedFields.forecasterId,
    encodedFields.forecasterLabel,
    BigInt(encodedFields.forecastCreatedAt),
    BigInt(encodedFields.anchorAt),
    BigInt(encodedFields.anchorValueMicros),
    encodedFields.target,
    encodedFields.anchorUnit,
    encodedFields.classification,
    encodedFields.retrospective,
    encodedFields.cadenceMonths,
    encodedFields.pointCount,
    encodedFields.stepReturnBps,
    encodedFields.receiptDigest,
  ]);
  let terminalMultiplier = 1;
  const annualCumulativeReturnBps = [];
  derived.points.forEach((point, index) => {
    terminalMultiplier *= 1 + point.value / 10_000;
    if ((index + 1) % 4 === 0) annualCumulativeReturnBps.push(Math.round((terminalMultiplier - 1) * 10_000));
  });
  const anchor = derived.anchorValueScaled / 1_000_000;

  return {
    projectionVersion: "ofr-market-ai-path-eas-v0.1.0",
    state: "planned_unissued_example",
    chain: {
      productionTarget: { name: "Base", caip2: "eip155:8453" },
      hackathonTarget: { name: "Base Sepolia", caip2: "eip155:84532" },
    },
    eas: {
      contract: EAS_CONFIG.contracts.eas,
      schema: EAS_SCHEMA,
      revocable: EAS_CONFIG.revocable,
      recipient: EAS_CONFIG.recipient,
      refUID: EAS_CONFIG.refUid,
    },
    encodedFields,
    protocolSuppliedAfterIssuance: {
      schemaUID: null,
      attestationUID: null,
      transactionHash: null,
      attester: null,
      blockTimestamp: null,
    },
    encodingSemantics: {
      subjectRef: "A compact scheme-prefixed market identifier; the full identifier bundle remains in receiptPayload bound by receiptDigest.",
      forecastId: "SHA-256 of the exact UTF-8 source forecast ID.",
      forecasterId: "SHA-256 of the exact UTF-8 stable source forecaster ID.",
      timestamps: "Unsigned Unix seconds in UTC.",
      anchorValueMicros: `Anchor observation multiplied by 1,000,000; ${derived.anchorValueScaled} means ${forecast.anchor.unit} ${anchor}.`,
      target: "The canonical predicted quantity; anchorUnit applies only to the underlying price anchor.",
      classification: "Value from the ipulse-investment-rating-v1 scheme fixed by this projection version.",
      retrospective: "True when the receipt is created for a forecast that was already published before the receipt workflow existed.",
      stepReturnBps: "Comma-separated signed base-10 integers in forecast-step order; basis_points = source_percent * 100, so -400 means -4.00 percent.",
      schedule: "Step n is anchorAt plus n times cadenceMonths; pointCount limits the path. This projection supports regular monthly cadence only.",
      receiptDigest: "SHA-256 over the RFC 8785 canonical receiptPayload only. The proofEnvelope can gain attestation metadata without changing the sealed forecast payload.",
    },
    calculatedSizes: {
      easDataBytes: (encoded.length - 2) / 2,
      forecastPoints: derived.points.length,
      note: "ABI-encoded EAS data only; transaction envelope and execution gas are excluded.",
    },
    derivationsNotStoredOnchain: {
      validTo: forecast.temporal.horizonEndAt,
      annualCumulativeReturnBps,
      terminalReturnPercent: (terminalMultiplier - 1) * 100,
      terminalImpliedPrice: anchor * terminalMultiplier,
      anchorUnit: forecast.anchor.unit,
      explanation: "These values are deterministically reconstructed from anchorAt, cadenceMonths, anchorValueMicros, and stepReturnBps.",
    },
  };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

const generationRows = await readJson(resolve(sourceDir, "ofr-batch6-generation.json"));
const contextRows = await readJson(resolve(sourceDir, "ofr-batch6-context-metadata.json"));
const componentRows = await readJson(resolve(sourceDir, "ofr-batch6-context-components.json"));
const assetRows = await readJson(resolve(sourceDir, "ofr-batch6-assets.json"));
const generationByTask = new Map(generationRows.map((row) => [row.prediction_request_task_id, row]));
const contextById = new Map(contextRows.map((row) => [row.context_snapshot_id, row]));
const componentById = new Map(componentRows.map((row) => [row.context_snapshot_id, row]));
const assetById = new Map(assetRows.map((row) => [row.asset_id, row]));
const catalog = [];

for (const sourceConfig of SOURCES) {
  const wire = await readJson(resolve(sourceDir, sourceConfig.file));
  const source = decodeDocument(wire);
  const outputDir = resolve(ROOT, "src/data/fixtures", sourceConfig.slug);
  await mkdir(outputDir, { recursive: true });
  const asset = assetById.get(source.asset_id);
  const contextMeta = contextById.get(source.input_context_snapshot_id);
  const componentMeta = componentById.get(source.input_context_snapshot_id);
  if (!asset || !contextMeta) throw new Error(`Missing compact source metadata for ${source.asset_id}`);

  const predictions = [...source.predictions].sort((a, b) => {
    const mode = String(a.advisor_snapshot.advisor_mode).localeCompare(String(b.advisor_snapshot.advisor_mode));
    return mode || String(a.advisor_snapshot.persona_display_name).localeCompare(String(b.advisor_snapshot.persona_display_name));
  });
  for (const prediction of predictions) {
    const generation = generationByTask.get(prediction.prediction_request_task_id);
    if (!generation) throw new Error(`Missing generation row for ${prediction.prediction_request_task_id}`);
    const built = buildReceipt({ source, prediction, generation, contextMeta, componentMeta, asset });
    const projection = buildProjection(built.document, built);
    const advisor = prediction.advisor_snapshot;
    const isCanonicalRay = sourceConfig.slug === "pepsi"
      && advisor.persona_character === "ray_dalio"
      && advisor.advisor_mode === "RESEARCHER";
    const baseName = isCanonicalRay
      ? "ray"
      : `${slugify(advisor.persona_display_name)}-${slugify(advisor.advisor_mode)}`;
    const documentFile = `${baseName}-ofr.json`;
    const projectionFile = `${baseName}-projection.json`;
    await writeJson(resolve(outputDir, documentFile), built.document);
    await writeJson(resolve(outputDir, projectionFile), projection);
    catalog.push({
      assetSlug: sourceConfig.slug,
      assetId: source.asset_id,
      forecasterLabel: `${advisor.persona_display_name} / ${advisor.persona_archetype_display_name} / ${advisor.advisor_mode}`,
      mode: advisor.advisor_mode,
      forecastId: prediction.prediction_request_task_id,
      receiptDigest: built.payloadDigest,
      documentPath: `./${sourceConfig.slug}/${documentFile}`,
      projectionPath: `./${sourceConfig.slug}/${projectionFile}`,
      dataStatus: "loaded",
      chainStatus: "not_issued",
    });

    if (isCanonicalRay) {
      await writeJson(resolve(ROOT, "examples/ipulse/pepsi_batch6_ray_open_forecast_receipt_v0_1.json"), built.document);
      await writeJson(resolve(ROOT, "examples/ipulse/pepsi_batch6_ray_onchain_projection_v0_1.json"), projection);
    }
  }
}

catalog.sort((a, b) => a.assetSlug.localeCompare(b.assetSlug)
  || a.mode.localeCompare(b.mode)
  || a.forecasterLabel.localeCompare(b.forecasterLabel));
await writeJson(resolve(ROOT, "src/data/fixtures/batch6-catalog.json"), {
  batchId: "batch-6",
  generatedAt: issuedAt,
  receiptCount: catalog.length,
  entries: catalog,
});

const manifestPath = resolve(ROOT, "src/data/fixtures/batch6-manifest.json");
const manifest = await readJson(manifestPath);
manifest.description = "Batch 6 of the Open Forecast Receipt system. Five public assets with 12 individual AI-advisor forecast receipts each.";
for (const manifestAsset of manifest.assets) {
  const assetSlug = manifestAsset.slug || manifestAsset.ticker;
  manifestAsset.slug = assetSlug;
  manifestAsset.aliases ||= [];
  delete manifestAsset.ticker;
  const count = catalog.filter((entry) => entry.assetSlug === assetSlug).length;
  const catalogAsset = catalog.find((entry) => entry.assetSlug === assetSlug);
  const asset = catalogAsset ? assetById.get(catalogAsset.assetId) : undefined;
  manifestAsset.coverageStatus = count === manifestAsset.advisorCount ? "complete" : count ? "partial" : "none";
  manifestAsset.loadedCount = count;
  if (asset) {
    manifestAsset.displaySymbol = asset.ticker_on_exchange;
    manifestAsset.marketIdentifier = asset.mic
      ? `${asset.ticker_on_exchange}:${asset.mic}`
      : `ipulse:${asset.asset_symbol_pulse}`;
  }
}
await writeJson(manifestPath, manifest);

console.log(JSON.stringify({ receiptCount: catalog.length, issuedAt, output: "src/data/fixtures" }, null, 2));
