#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { canonicalize } from "json-canonicalize";

const ROOT = resolve(import.meta.dirname, "..");
const DEFAULT_SOURCE_PROJECT = "data-platform-436809";
const DEFAULT_TARGET_PROJECT = "oflapp-staging";
const ENTITY_VERSION_NAMESPACE = "cef63097-4d84-5018-9778-d4be189e320f";
const RELATIONSHIP_NAMESPACE = "b2cc5767-24c5-5971-aa70-5b1648004cbe";
const CATALOG_POLICY_VERSION = "ofl-ipulse-import-0.3";
const MAX_BATCH_WRITES = 400;
const UNIQUE_IDENTIFIER_SCHEMES = new Set([
  "ipulse_asset_id",
  "ipulse_entity_id",
  "ipulse_exchange_id",
  "figi",
  "wikidata",
  "google_knowledge_graph_mid",
]);

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

function parseJsonObject(value) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function bqQuery(sourceProject, sql) {
  const output = execFileSync("bq", [
    "query",
    `--project_id=${sourceProject}`,
    "--use_legacy_sql=false",
    "--format=prettyjson",
    "--max_rows=100000",
    sql,
  ], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  return JSON.parse(output);
}

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function uuidv5(value, namespace) {
  const namespaceBytes = Buffer.from(namespace.replaceAll("-", ""), "hex");
  assert(namespaceBytes.length === 16, `Invalid UUID namespace: ${namespace}`);
  const bytes = createHash("sha1").update(namespaceBytes).update(value, "utf8").digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function versionId(entityId, sourceVersion) {
  return `entityv_${uuidv5(`ipulse-entity|${entityId}|source-version:${sourceVersion}|policy:${CATALOG_POLICY_VERSION}`, ENTITY_VERSION_NAMESPACE)}`;
}

function relationshipId(subjectEntityId, predicate, objectEntityId, sourceVersion) {
  return `rel_${uuidv5(`${subjectEntityId}|${predicate}|${objectEntityId}|source-version:${sourceVersion}`, RELATIONSHIP_NAMESPACE)}`;
}

function stableDocumentId(prefix, ...parts) {
  return `${prefix}_${sha256(parts.join("|")).slice(0, 40)}`;
}

function entityType(asset) {
  if (asset.contract_or_ownership_type === "etf") return "exchange_traded_fund";
  switch (asset.subject_category) {
    case "equity": return "listed_security";
    case "crypto": return "cryptoasset";
    case "forex": return "currency_pair";
    case "index": return "market_index";
    case "commodity": return "commodity_spot";
    default: return "financial_asset";
  }
}

function schemaOrgTypes(type) {
  return ["Thing"];
}

function identifierCanonicalUri(scheme, value, explicitUri) {
  if (explicitUri) return explicitUri;
  if (scheme === "wikidata") return `https://www.wikidata.org/entity/${value}`;
  if (scheme === "official_website" || scheme === "wikipedia") return value;
  return undefined;
}

function normalizeIdentifier(identifier) {
  const value = String(identifier.value).trim();
  return compact({
    ...identifier,
    value,
    canonicalUri: identifierCanonicalUri(identifier.scheme, value, identifier.canonicalUri),
    normalizedValue: identifier.normalizedValue || value.toUpperCase(),
    verificationStatus: identifier.verificationStatus || "source_asserted",
    sourceSystem: identifier.sourceSystem || "ipulse_ai",
  });
}

function dedupeIdentifiers(identifiers) {
  const seen = new Set();
  return identifiers.filter(Boolean).map(normalizeIdentifier).filter((identifier) => {
    const key = `${identifier.scheme}|${identifier.normalizedValue}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function registryIdentifierAssertions(rows) {
  return rows.map((row) => ({
    scheme: row.identifier_scheme,
    value: row.identifier_value,
    canonicalUri: row.canonical_uri,
    matchType: row.match_type,
    verificationStatus: row.verification_status,
    sourceSystem: row.source_system,
    sourceUri: row.source_uri,
  }));
}

function identifierAssertions(asset, exchange, registryRows = []) {
  const identifiers = [
    { scheme: "ipulse_asset_id", value: asset.asset_id, matchType: "primary" },
    { scheme: "ipulse_symbol", value: asset.asset_symbol_pulse, matchType: "exact" },
    asset.isin && { scheme: "isin", value: asset.isin, matchType: "exact" },
    asset.figi && { scheme: "figi", value: asset.figi, matchType: "exact" },
    asset.ticker_on_exchange && {
      scheme: "ticker_venue",
      value: `${asset.ticker_on_exchange}:${asset.exchange_code_pulse}`,
      matchType: "point_in_time",
    },
    asset.ticker_on_exchange && exchange?.mic?.trim() && {
      scheme: "ticker_mic",
      value: `${asset.ticker_on_exchange}:${exchange.mic.trim()}`,
      matchType: "point_in_time",
    },
    exchange?.mic?.trim() && { scheme: "mic", value: exchange.mic.trim(), matchType: "source_asserted" },
    exchange?.operating_mic?.trim() && { scheme: "operating_mic", value: exchange.operating_mic.trim(), matchType: "source_asserted" },
    ...registryIdentifierAssertions(registryRows).filter((identifier) => !(
      identifier.scheme === "ipulse_entity_id" && identifier.value === asset.asset_id
    )),
  ].filter(Boolean);
  return dedupeIdentifiers(identifiers);
}

function stableFundamentalSlug(entityId) {
  return `entity-${entityId.replace(/^fundsubj_/, "")}`;
}

function legacyLogoForAsset(asset) {
  const folder = asset.subject_category;
  if (!folder || !asset.asset_symbol_pulse) return undefined;
  const fileStem = folder === "crypto"
    ? String(asset.ticker_on_exchange || asset.asset_symbol_pulse).split("-")[0].toLowerCase()
    : String(asset.asset_symbol_pulse).toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replaceAll(/^_+|_+$/g, "");
  if (!fileStem) return undefined;
  return {
    mediaAssetId: `legacy-ipulse-${asset.asset_id}`,
    role: "logo",
    url: `https://ipulseai.com/static/icons/assets/${folder}/${fileStem}.png`,
    alt: `${asset.name} logo`,
    mimeType: "image/png",
    sourceSystem: "ipulse_ai_public_asset_fallback",
    governanceStatus: "legacy_public_asset",
  };
}

function profileFromSnapshot(snapshot) {
  if (!snapshot) return undefined;
  const classification = parseJsonObject(snapshot.company_classification_json);
  return compact({
    officialWebsiteUrl: snapshot.common_web_url,
    countryCode: snapshot.country_iso,
    sector: classification.Sector,
    industry: classification.Industry,
    gicsSector: classification.GicSector,
    gicsIndustry: classification.GicIndustry,
    chiefExecutiveName: snapshot.company_ceo_name,
    chiefExecutiveBirthYear: snapshot.company_ceo_year_born ? Number(snapshot.company_ceo_year_born) : undefined,
    fullTimeEmployees: snapshot.company_full_time_employees ? Number(snapshot.company_full_time_employees) : undefined,
    ipoDate: snapshot.company_ipo_date,
    sourceProvider: snapshot.source_provider,
    sourceUpdatedAt: snapshot.provider_updated_date,
    observedAt: snapshot.observed_at_utc,
  });
}

function aliases(asset, tags) {
  const seen = new Set();
  return [
    tags.common_name,
    asset.name,
    asset.ticker_on_exchange,
    asset.asset_symbol_pulse,
  ].filter((value) => {
    if (!value) return false;
    const normalized = String(value).trim().toLowerCase();
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function publicEntityProjection(entity, identifiers) {
  return compact({
    entityId: entity.entityId,
    currentVersionId: entity.currentVersionId,
    entityType: entity.entityType,
    entityClasses: entity.entityClasses,
    canonicalName: entity.canonicalName,
    description: entity.description,
    stableSlug: entity.stableSlug,
    aliases: entity.aliases,
    classifications: entity.classifications,
    schemaOrgTypes: entity.schemaOrgTypes,
    logo: entity.logo,
    profile: entity.profile,
    relatedEntities: entity.relatedEntities,
    externalIdentifiers: identifiers.map(({ scheme, value, canonicalUri, matchType, verificationStatus }) => compact({
      scheme, value, canonicalUri, matchType, verificationStatus,
    })),
    sameAs: [...new Set([
      ...(entity.sameAs || []),
      ...identifiers
        .filter((identifier) => identifier.matchType === "same_as" && identifier.canonicalUri)
        .map((identifier) => identifier.canonicalUri),
    ])],
    source: entity.source,
    publicationStatus: "published",
    visibility: "public",
  });
}

function addDocument(plan, collectionName, documentId, value, mode = "immutable") {
  const normalized = compact(value);
  const key = `${collectionName}/${documentId}`;
  const existing = plan.get(key);
  if (existing) {
    assert(canonicalize(existing.value) === canonicalize(normalized), `Conflicting planned document ${key}`);
    return;
  }
  plan.set(key, { collectionName, documentId, value: normalized, mode });
}

function humanizeMachineName(value) {
  if (!value) return undefined;
  if (!String(value).includes("_")) return value;
  return String(value).split("_").filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildPlan(assetRows, exchangeRows, scoringBatch, semanticRows, registryRows, mediaRows, profileRows) {
  const plan = new Map();
  const exchangeById = new Map(exchangeRows.map((exchange) => [exchange.exchange_id, exchange]));
  const semanticById = new Map(semanticRows.map((entity) => [entity.entity_id, entity]));
  const fundamentalRows = semanticRows.filter((entity) => entity.entity_domain === "fundamental_subject");
  const fundamentalById = new Map(fundamentalRows.map((entity) => [entity.entity_id, entity]));
  const identifiersByEntityId = new Map();
  for (const row of registryRows) {
    const existing = identifiersByEntityId.get(row.entity_id) || [];
    existing.push(row);
    identifiersByEntityId.set(row.entity_id, existing);
  }
  const mediaByEntityId = new Map(mediaRows.map((row) => [row.entity_id, compact({
    mediaAssetId: row.media_asset_id,
    role: row.media_role,
    url: row.public_url,
    alt: row.alt_text,
    mimeType: row.mime_type,
    width: row.width_px ? Number(row.width_px) : undefined,
    height: row.height_px ? Number(row.height_px) : undefined,
    contentDigestSha256: row.content_digest_sha256,
    sourceSystem: "future_edge_shared_media_registry",
    governanceStatus: "governed",
  })]));
  const profileByEntityId = new Map(profileRows.map((row) => [row.fundamental_subject_id, row]));
  const entitySummaries = [];
  const fundamentalSummaries = [];

  function addIdentifierDocuments(entity, identifiers) {
    for (const identifier of identifiers) {
      const identifierId = stableDocumentId("id", entity.entityId, identifier.scheme, identifier.normalizedValue);
      addDocument(plan, "entity_identifiers", identifierId, { identifierId, entityId: entity.entityId, ...identifier }, "immutable");
      if (UNIQUE_IDENTIFIER_SCHEMES.has(identifier.scheme)) {
        const keyId = stableDocumentId("idkey", identifier.scheme, identifier.normalizedValue);
        addDocument(plan, "entity_identifier_keys", keyId, {
          identifierKeyId: keyId,
          scheme: identifier.scheme,
          normalizedValue: identifier.normalizedValue,
          entityId: entity.entityId,
        }, "mutable_current");
      }
    }
  }

  function addAliases(entity, sourceVersion) {
    const seenAliases = new Set();
    for (const [sortOrder, alias] of (entity.aliases || []).entries()) {
      const normalizedAlias = alias.trim().toLowerCase();
      if (seenAliases.has(normalizedAlias)) continue;
      seenAliases.add(normalizedAlias);
      const aliasId = stableDocumentId("alias", entity.entityId, alias.toLowerCase());
      addDocument(plan, "entity_aliases", aliasId, {
        aliasId,
        entityId: entity.entityId,
        value: alias,
        normalizedValue: normalizedAlias,
        sortOrder,
        status: "active",
        sourceVersion,
      }, "immutable");
    }
  }

  function relatedAssetSummary(asset) {
    const assetTags = parseJsonObject(asset.tags);
    const assetSemantic = semanticById.get(asset.asset_id);
    const exchange = exchangeById.get(asset.exchange_id);
    return compact({
      predicate: "has_market_representation",
      entityId: asset.asset_id,
      canonicalName: asset.name,
      stableSlug: assetTags.url_slug,
      entityType: assetSemantic?.entity_type || entityType(asset),
      displayIdentifier: asset.ticker_on_exchange
        ? `${asset.ticker_on_exchange}:${asset.exchange_code_pulse}`
        : asset.asset_symbol_pulse,
      schemaTickerSymbol: asset.ticker_on_exchange
        ? `${exchange?.mic?.trim() || asset.exchange_code_pulse}:${asset.ticker_on_exchange}`
        : undefined,
      logoUrl: mediaByEntityId.get(assetSemantic?.parent_entity_id)?.url
        || mediaByEntityId.get(asset.asset_id)?.url
        || legacyLogoForAsset(asset)?.url,
    });
  }

  function relatedFundamentalSummary(fundamentalId) {
    const fundamental = fundamentalById.get(fundamentalId);
    if (!fundamental) return undefined;
    const profile = profileByEntityId.get(fundamentalId);
    return compact({
      predicate: "is_market_representation_of",
      entityId: fundamentalId,
      canonicalName: profile?.common_name || humanizeMachineName(fundamental.canonical_name) || fundamentalId,
      stableSlug: stableFundamentalSlug(fundamentalId),
      entityType: fundamental.entity_type || "entity",
      logoUrl: mediaByEntityId.get(fundamentalId)?.url,
    });
  }

  for (const exchange of exchangeRows) {
    const sourceVersion = Number(exchange.version || 1);
    const currentVersionId = versionId(exchange.exchange_id, sourceVersion);
    const entity = compact({
      entityId: exchange.exchange_id,
      currentVersionId,
      entityType: "market_venue",
      entityClasses: ["supporting_entity", "market_venue"],
      status: "approved",
      canonicalName: exchange.name || exchange.exchange_code_pulse,
      description: exchange.short_description,
      aliases: [...new Set([exchange.exchange_code_pulse, exchange.mic, exchange.operating_mic].filter(Boolean))],
      classifications: [{ scheme: "ofl-core", code: "market_venue" }],
      schemaOrgTypes: ["Organization"],
      source: {
        system: "ipulse_ai",
        table: "dim_fincore_market_exchanges",
        sourceId: exchange.exchange_id,
        sourceVersion,
        sourceUpdatedAt: exchange.updated_at,
      },
      editorial: {
        status: "approved_source_import",
        policyVersion: "ofl-ipulse-import-0.1",
      },
    });
    const identifiers = [
      { scheme: "ipulse_exchange_id", value: exchange.exchange_id, normalizedValue: exchange.exchange_id.toUpperCase(), matchType: "primary", verificationStatus: "source_asserted", sourceSystem: "ipulse_ai" },
      exchange.mic?.trim() && { scheme: "mic", value: exchange.mic.trim(), normalizedValue: exchange.mic.trim().toUpperCase(), matchType: "exact", verificationStatus: "source_asserted", sourceSystem: "ipulse_ai" },
      exchange.operating_mic?.trim() && { scheme: "operating_mic", value: exchange.operating_mic.trim(), normalizedValue: exchange.operating_mic.trim().toUpperCase(), matchType: "exact", verificationStatus: "source_asserted", sourceSystem: "ipulse_ai" },
    ].filter(Boolean).filter((identifier, index, all) => (
      all.findIndex((candidate) => (
        candidate.scheme === identifier.scheme
        && candidate.normalizedValue === identifier.normalizedValue
      )) === index
    ));

    addDocument(plan, "entities", entity.entityId, entity, "mutable_current");
    addDocument(plan, "entity_versions", currentVersionId, { ...entity, versionId: currentVersionId }, "immutable");
    addDocument(plan, "public_entities", entity.entityId, publicEntityProjection(entity, identifiers), "mutable_current");
    addIdentifierDocuments(entity, identifiers);
  }

  for (const asset of assetRows) {
    assert(exchangeById.has(asset.exchange_id), `Asset ${asset.asset_id} references missing exchange ${asset.exchange_id}`);
    const tags = parseJsonObject(asset.tags);
    const sourceVersion = Number(asset.version || 1);
    const currentVersionId = versionId(asset.asset_id, sourceVersion);
    const semantic = semanticById.get(asset.asset_id);
    const type = semantic?.entity_type || entityType(asset);
    const fundamentalId = semantic?.parent_entity_id;
    const relatedFundamental = fundamentalId ? relatedFundamentalSummary(fundamentalId) : undefined;
    const logo = fundamentalId
      ? mediaByEntityId.get(fundamentalId) || mediaByEntityId.get(asset.asset_id)
      : mediaByEntityId.get(asset.asset_id);
    const effectiveLogo = logo || legacyLogoForAsset(asset);
    const entity = compact({
      entityId: asset.asset_id,
      currentVersionId,
      entityType: type,
      entityClasses: ["forecastable_entity", "asset"],
      status: "approved",
      canonicalName: asset.name,
      description: asset.short_description,
      stableSlug: tags.url_slug,
      aliases: aliases(asset, tags),
      classifications: [
        { scheme: "ofl-core", code: "asset" },
        { scheme: "ipulse-subject-category", code: asset.subject_category },
        { scheme: "ipulse-subject-category-detailed", code: asset.subject_category_detailed },
        { scheme: "ipulse-contract-or-ownership", code: asset.contract_or_ownership_type },
      ],
      schemaOrgTypes: [semantic?.schema_org_primary_type || schemaOrgTypes(type)[0]],
      logo: effectiveLogo ? { ...effectiveLogo, alt: `${asset.name} logo` } : undefined,
      relatedEntities: relatedFundamental ? [relatedFundamental] : [],
      currency: asset.currency,
      originCountryCode: asset.origin_country_code,
      source: {
        system: "ipulse_ai",
        table: "dim_fincore_market_assets",
        sourceId: asset.asset_id,
        sourceVersion,
        sourceUpdatedAt: asset.updated_at,
        predictionCohort: { scoringBatch },
      },
      editorial: {
        status: "approved_source_import",
        policyVersion: CATALOG_POLICY_VERSION,
      },
    });
    const identifiers = identifierAssertions(
      asset,
      exchangeById.get(asset.exchange_id),
      identifiersByEntityId.get(asset.asset_id) || [],
    );

    addDocument(plan, "entities", entity.entityId, { ...entity, externalIdentifiers: identifiers }, "mutable_current");
    addDocument(plan, "entity_versions", currentVersionId, {
      ...entity,
      versionId: currentVersionId,
      externalIdentifiers: identifiers,
    }, "immutable");
    addDocument(plan, "public_entities", entity.entityId, publicEntityProjection(entity, identifiers), "mutable_current");

    addIdentifierDocuments(entity, identifiers);
    addAliases(entity, sourceVersion);

    const listedOnId = relationshipId(entity.entityId, "listed_or_quoted_on", asset.exchange_id, sourceVersion);
    addDocument(plan, "entity_relationships", listedOnId, {
      relationshipId: listedOnId,
      subjectEntityId: entity.entityId,
      predicate: "listed_or_quoted_on",
      objectEntityId: asset.exchange_id,
      sourceSystem: "ipulse_ai",
      sourceVersion,
      status: "approved_source_import",
    }, "immutable");

    if (fundamentalId && fundamentalById.has(fundamentalId)) {
      const semanticSourceVersion = semantic?.updated_at || sourceVersion;
      const representationId = relationshipId(entity.entityId, "is_market_representation_of", fundamentalId, semanticSourceVersion);
      addDocument(plan, "entity_relationships", representationId, {
        relationshipId: representationId,
        subjectEntityId: entity.entityId,
        predicate: "is_market_representation_of",
        objectEntityId: fundamentalId,
        relationshipSubtype: semantic?.relationship_to_parent,
        sourceSystem: "ipulse_ai_semantic_registry",
        sourceVersion: semanticSourceVersion,
        status: "approved_source_import",
      }, "immutable");
      const reverseId = relationshipId(fundamentalId, "has_market_representation", entity.entityId, semanticSourceVersion);
      addDocument(plan, "entity_relationships", reverseId, {
        relationshipId: reverseId,
        subjectEntityId: fundamentalId,
        predicate: "has_market_representation",
        objectEntityId: entity.entityId,
        relationshipSubtype: semantic?.relationship_to_parent,
        sourceSystem: "ipulse_ai_semantic_registry",
        sourceVersion: semanticSourceVersion,
        status: "approved_source_import",
      }, "immutable");
    }

    entitySummaries.push({
      entityId: entity.entityId,
      currentVersionId,
      entityType: type,
      canonicalName: entity.canonicalName,
      stableSlug: entity.stableSlug,
      classifications: entity.classifications,
      exchangeEntityId: asset.exchange_id,
      identifiers: identifiers.map(({ sourceSystem: _sourceSystem, normalizedValue: _normalizedValue, ...identifier }) => identifier),
    });
  }

  for (const semantic of fundamentalRows) {
    const snapshot = profileByEntityId.get(semantic.entity_id);
    const profile = profileFromSnapshot(snapshot);
    const canonicalName = snapshot?.common_name || humanizeMachineName(semantic.canonical_name) || semantic.entity_id;
    const aliasKeys = new Set();
    const aliasesForEntity = [
      canonicalName,
      humanizeMachineName(semantic.canonical_name),
      snapshot?.fundamental_subject_symbol_pulse,
    ].filter(Boolean).filter((alias) => {
      const normalized = alias.trim().toLowerCase();
      if (aliasKeys.has(normalized)) return false;
      aliasKeys.add(normalized);
      return true;
    });
    const relatedAssets = assetRows
      .filter((asset) => semanticById.get(asset.asset_id)?.parent_entity_id === semantic.entity_id)
      .map(relatedAssetSummary);
    const semanticTimestamp = semantic.updated_at || "1970-01-01T00:00:00Z";
    const profileTimestamp = snapshot?.observed_at_utc || "1970-01-01T00:00:00Z";
    const sourceVersion = Math.max(Date.parse(semanticTimestamp) || 1, Date.parse(profileTimestamp) || 1);
    const currentVersionId = versionId(semantic.entity_id, sourceVersion);
    const directIdentifiers = [
      semantic.wikidata_id && { scheme: "wikidata", value: semantic.wikidata_id, matchType: "same_as", verificationStatus: "verified", sourceSystem: "wikidata" },
      semantic.google_knowledge_graph_mid && { scheme: "google_knowledge_graph_mid", value: semantic.google_knowledge_graph_mid, matchType: "exact", verificationStatus: "verified", sourceSystem: "google_knowledge_graph" },
      semantic.official_website_url && { scheme: "official_website", value: semantic.official_website_url, canonicalUri: semantic.official_website_url, matchType: "same_as", verificationStatus: "source_asserted", sourceSystem: "ipulse_ai_semantic_registry" },
      semantic.wikipedia_url && { scheme: "wikipedia", value: semantic.wikipedia_url, canonicalUri: semantic.wikipedia_url, matchType: "same_as", verificationStatus: "verified", sourceSystem: "wikipedia" },
    ].filter(Boolean);
    const identifiers = dedupeIdentifiers([
      ...directIdentifiers,
      ...registryIdentifierAssertions(identifiersByEntityId.get(semantic.entity_id) || []),
    ]);
    const organizational = ["corporation", "investment_fund", "organization"].includes(semantic.entity_type);
    const representativeAsset = assetRows.find((asset) => semanticById.get(asset.asset_id)?.parent_entity_id === semantic.entity_id);
    const logo = mediaByEntityId.get(semantic.entity_id) || (representativeAsset ? legacyLogoForAsset(representativeAsset) : undefined);
    const entity = compact({
      entityId: semantic.entity_id,
      currentVersionId,
      entityType: semantic.entity_type || "entity",
      entityClasses: ["supporting_entity", "fundamental_entity", organizational ? "organization" : "underlying_entity"],
      status: "approved",
      canonicalName,
      description: snapshot?.common_description || semantic.description,
      stableSlug: stableFundamentalSlug(semantic.entity_id),
      aliases: aliasesForEntity,
      classifications: [
        { scheme: "ofl-core", code: "fundamental_entity" },
        { scheme: "ipulse-entity-domain", code: semantic.entity_domain },
        { scheme: "ipulse-entity-type", code: semantic.entity_type },
        semantic.subject_category && { scheme: "ipulse-subject-category", code: semantic.subject_category },
      ].filter(Boolean),
      schemaOrgTypes: [semantic.schema_org_primary_type || "Thing"],
      sameAs: semantic.same_as_urls || [],
      logo: logo ? { ...logo, alt: `${canonicalName} logo` } : undefined,
      profile,
      relatedEntities: relatedAssets,
      source: {
        system: "ipulse_ai_semantic_registry",
        table: "vw_fincore_semantic_entities",
        sourceId: semantic.entity_id,
        sourceVersion,
        sourceUpdatedAt: semantic.updated_at,
      },
      editorial: {
        status: "approved_source_import",
        policyVersion: CATALOG_POLICY_VERSION,
      },
    });

    addDocument(plan, "entities", entity.entityId, { ...entity, externalIdentifiers: identifiers }, "mutable_current");
    addDocument(plan, "entity_versions", currentVersionId, { ...entity, versionId: currentVersionId, externalIdentifiers: identifiers }, "immutable");
    addDocument(plan, "public_entities", entity.entityId, publicEntityProjection(entity, identifiers), "mutable_current");
    addIdentifierDocuments(entity, identifiers);
    addAliases(entity, sourceVersion);

    fundamentalSummaries.push({
      entityId: entity.entityId,
      currentVersionId,
      entityType: entity.entityType,
      canonicalName: entity.canonicalName,
      stableSlug: entity.stableSlug,
      schemaOrgTypes: entity.schemaOrgTypes,
      sameAs: entity.sameAs,
      relatedEntityIds: relatedAssets.map((related) => related.entityId),
    });
  }

  return { plan, entitySummaries, fundamentalSummaries };
}

async function applyPlan(plan, targetProject) {
  if (getApps().length === 0) initializeApp({ projectId: targetProject, credential: applicationDefault() });
  const db = getFirestore();
  const items = [...plan.values()];
  const missing = [];
  let unchanged = 0;
  let updated = 0;

  for (let offset = 0; offset < items.length; offset += MAX_BATCH_WRITES) {
    const chunk = items.slice(offset, offset + MAX_BATCH_WRITES);
    const references = chunk.map((item) => db.collection(item.collectionName).doc(item.documentId));
    const snapshots = await db.getAll(...references);
    snapshots.forEach((snapshot, index) => {
      const item = chunk[index];
      if (!snapshot.exists) {
        missing.push(item);
        return;
      }
      if (canonicalize(snapshot.data()) === canonicalize(item.value)) {
        unchanged += 1;
        return;
      }
      assert(item.mode === "mutable_current", `Immutable Firestore document differs: ${snapshot.ref.path}`);
      missing.push({ ...item, updateExisting: true });
      updated += 1;
    });
  }

  for (let offset = 0; offset < missing.length; offset += MAX_BATCH_WRITES) {
    const chunk = missing.slice(offset, offset + MAX_BATCH_WRITES);
    const batch = db.batch();
    for (const item of chunk) {
      const reference = db.collection(item.collectionName).doc(item.documentId);
      if (item.updateExisting) batch.set(reference, item.value);
      else batch.create(reference, item.value);
    }
    await batch.commit();
  }
  return { created: missing.length - updated, updated, unchanged };
}

const sourceProject = argumentValue("--source-project") || DEFAULT_SOURCE_PROJECT;
const targetProject = argumentValue("--project") || DEFAULT_TARGET_PROJECT;
const semanticEnvironment = argumentValue("--semantic-environment") || "staging";
assert(["staging", "prod"].includes(semanticEnvironment), "--semantic-environment must be staging or prod");
const apply = process.argv.includes("--apply");
const requestedBatch = argumentValue("--scoring-batch");

const latestBatchRows = requestedBatch ? [{ scoring_batch: requestedBatch }] : bqQuery(sourceProject, `
  SELECT MAX(scoring_batch) AS scoring_batch
  FROM \`${sourceProject}.prod__dp_oracle_fincore_prediction_market__datasets.prediction_status\`
  WHERE pulse_status = "ACTIVE" AND prediction_pipeline_status = "FINISHED"
`);
const scoringBatch = Number(latestBatchRows[0]?.scoring_batch);
assert(Number.isInteger(scoringBatch) && scoringBatch > 0, "Could not resolve a positive scoring batch");

const assetRows = bqQuery(sourceProject, `
  WITH cohort AS (
    SELECT DISTINCT subject_id
    FROM \`${sourceProject}.prod__dp_oracle_fincore_prediction_market__datasets.prediction_status\`
    WHERE scoring_batch = ${scoringBatch}
      AND pulse_status = "ACTIVE"
      AND prediction_pipeline_status = "FINISHED"
  ), assets AS (
    SELECT * EXCEPT(rn)
    FROM (
      SELECT a.*, ROW_NUMBER() OVER(PARTITION BY asset_id ORDER BY version DESC, updated_at DESC) AS rn
      FROM \`${sourceProject}.prod__dp_oracle_fincore__controls.dim_fincore_market_assets\` a
    )
    WHERE rn = 1
  )
  SELECT asset_id, asset_symbol_pulse, name, exchange_id, exchange_code_pulse, currency,
         ticker_on_exchange, short_description, isin, figi, subject_category,
         subject_category_detailed, contract_or_ownership_type, underlying_asset_id,
         blockchain_network, pulse_status, object_overall_status, tags, version,
         CAST(updated_at AS STRING) AS updated_at, origin_country_code
  FROM cohort c JOIN assets a ON a.asset_id = c.subject_id
  ORDER BY asset_id
`);
assert(assetRows.length > 0, `No finished entities found for scoring batch ${scoringBatch}`);

const exchangeIds = [...new Set(assetRows.map((asset) => asset.exchange_id))];
const quotedExchangeIds = exchangeIds.map((id) => `'${String(id).replaceAll("'", "\\'")}'`).join(",");
const exchangeRows = bqQuery(sourceProject, `
  SELECT * EXCEPT(rn)
  FROM (
    SELECT e.exchange_id, e.exchange_code_pulse, e.name, e.mic, e.operating_mic,
           e.country_name, e.country_code2, e.country_code3, e.time_zone,
           e.short_description, e.pulse_status, e.overall_status, e.version,
           CAST(e.updated_at AS STRING) AS updated_at,
           ROW_NUMBER() OVER(PARTITION BY e.exchange_id ORDER BY e.version DESC, e.updated_at DESC) AS rn
    FROM \`${sourceProject}.prod__dp_oracle_fincore__controls.dim_fincore_market_exchanges\` e
    WHERE e.exchange_id IN (${quotedExchangeIds})
  )
  WHERE rn = 1
  ORDER BY exchange_id
`);
assert(exchangeRows.length === exchangeIds.length, `Expected ${exchangeIds.length} exchange entities, received ${exchangeRows.length}`);

const baseRelationshipRows = bqQuery(sourceProject, `
  WITH cohort AS (
    SELECT DISTINCT subject_id AS asset_id
    FROM \`${sourceProject}.prod__dp_oracle_fincore_prediction_market__datasets.prediction_status\`
    WHERE scoring_batch = ${scoringBatch}
      AND pulse_status = "ACTIVE"
      AND prediction_pipeline_status = "FINISHED"
  ), latest_xref AS (
    SELECT * EXCEPT(rn)
    FROM (
      SELECT x.*, ROW_NUMBER() OVER (
        PARTITION BY asset_id ORDER BY version DESC, updated_at DESC
      ) AS rn
      FROM \`${sourceProject}.prod__dp_oracle_fincore__controls.xref_fincore_asset_fundamental_subjects\` x
      WHERE pulse_status = "ACTIVE"
    )
    WHERE rn = 1
  ), latest_fundamental AS (
    SELECT * EXCEPT(rn)
    FROM (
      SELECT f.*, ROW_NUMBER() OVER (
        PARTITION BY fundamental_subject_id ORDER BY version DESC, updated_at DESC
      ) AS rn
      FROM \`${sourceProject}.prod__dp_oracle_fincore__controls.dim_fincore_fundamental_subjects\` f
      WHERE pulse_status = "ACTIVE"
    )
    WHERE rn = 1
  )
  SELECT x.asset_id, x.fundamental_subject_id, x.relationship_type,
         f.fundamental_subject_symbol_pulse, f.fundamental_subject_type,
         f.subject_category,
         CAST(GREATEST(x.updated_at, f.updated_at) AS STRING) AS updated_at
  FROM cohort c
  JOIN latest_xref x USING (asset_id)
  JOIN latest_fundamental f USING (fundamental_subject_id)
  ORDER BY x.asset_id
`);

const enrichedSemanticRows = bqQuery(sourceProject, `
  SELECT entity_id, entity_domain, entity_type, canonical_name, description,
         asset_id, fundamental_subject_id, fundamental_subject_type,
         parent_entity_id, relationship_to_parent, subject_category,
         schema_org_primary_type, wikidata_id, google_knowledge_graph_mid,
         official_website_url, wikipedia_url, same_as_urls,
         CAST(updated_at AS STRING) AS updated_at
  FROM \`${sourceProject}.${semanticEnvironment}__dp_oracle_fincore__controls.vw_fincore_semantic_entities\`
  WHERE pulse_status = "ACTIVE"
    AND entity_domain IN ("market_asset", "fundamental_subject")
  ORDER BY entity_id
`);

const assetByIdForSemanticMerge = new Map(assetRows.map((asset) => [asset.asset_id, asset]));
const semanticByIdForMerge = new Map();
for (const relationship of baseRelationshipRows) {
  const asset = assetByIdForSemanticMerge.get(relationship.asset_id);
  if (!asset) continue;
  if (!semanticByIdForMerge.has(relationship.fundamental_subject_id)) {
    const fundamentalType = relationship.fundamental_subject_type === "company"
      ? "corporation"
      : relationship.fundamental_subject_type === "etf_product"
        ? "investment_fund"
        : relationship.fundamental_subject_type || "entity";
    semanticByIdForMerge.set(relationship.fundamental_subject_id, {
      entity_id: relationship.fundamental_subject_id,
      entity_domain: "fundamental_subject",
      entity_type: fundamentalType,
      canonical_name: relationship.fundamental_subject_symbol_pulse,
      fundamental_subject_id: relationship.fundamental_subject_id,
      fundamental_subject_type: relationship.fundamental_subject_type,
      subject_category: relationship.subject_category,
      schema_org_primary_type: fundamentalType === "corporation"
        ? "Corporation"
        : fundamentalType === "investment_fund" ? "InvestmentFund" : "Thing",
      same_as_urls: [],
      updated_at: relationship.updated_at,
    });
  }
  semanticByIdForMerge.set(asset.asset_id, {
    entity_id: asset.asset_id,
    entity_domain: "market_asset",
    entity_type: entityType(asset),
    canonical_name: asset.name,
    asset_id: asset.asset_id,
    fundamental_subject_id: relationship.fundamental_subject_id,
    parent_entity_id: relationship.fundamental_subject_id,
    relationship_to_parent: relationship.relationship_type,
    subject_category: asset.subject_category,
    schema_org_primary_type: "Thing",
    same_as_urls: [],
    updated_at: relationship.updated_at,
  });
}
for (const enriched of enrichedSemanticRows) {
  const current = semanticByIdForMerge.get(enriched.entity_id) || {};
  const governedValues = Object.fromEntries(Object.entries(enriched).filter(([, value]) => (
    value !== null && value !== undefined && value !== ""
  )));
  semanticByIdForMerge.set(enriched.entity_id, { ...current, ...governedValues });
}
const semanticRows = [...semanticByIdForMerge.values()].sort((left, right) => left.entity_id.localeCompare(right.entity_id));

const registryRows = bqQuery(sourceProject, `
  SELECT entity_id, entity_domain, entity_type, identifier_scheme, identifier_value,
         normalized_value, canonical_uri, match_type, verification_status,
         source_system, source_uri, CAST(updated_at AS STRING) AS updated_at
  FROM \`${sourceProject}.${semanticEnvironment}__dp_oracle_fincore__controls.xref_fincore_entity_identifiers\`
  WHERE valid_to IS NULL OR valid_to > CURRENT_TIMESTAMP()
  ORDER BY entity_id, identifier_scheme, identifier_value
`);

const mediaRows = bqQuery(sourceProject, `
  SELECT x.entity_id, x.media_role, x.media_asset_id,
         a.canonical_name AS alt_text,
         r.public_url, r.mime_type, r.width_px, r.height_px,
         r.content_digest_sha256
  FROM \`${sourceProject}.${semanticEnvironment}__dp_shared_governance__controls.xref_shared_entity_media\` x
  JOIN \`${sourceProject}.${semanticEnvironment}__dp_shared_governance__controls.dim_shared_media_assets\` a
    USING (media_asset_id)
  JOIN \`${sourceProject}.${semanticEnvironment}__dp_shared_governance__controls.dim_shared_media_renditions\` r
    USING (media_asset_id)
  WHERE x.pulse_status = "active"
    AND x.is_primary = TRUE
    AND x.media_role = "logo"
    AND a.pulse_status = "active"
    AND r.pulse_status = "active"
    AND r.rendition_role = "original"
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY x.entity_id
    ORDER BY x.priority ASC, x.updated_at DESC, r.updated_at DESC
  ) = 1
  ORDER BY x.entity_id
`);

const profileRows = bqQuery(sourceProject, `
  SELECT fundamental_subject_id, fundamental_subject_symbol_pulse,
         common_name, common_description, common_web_url, country_iso,
         company_classification_json, company_ceo_name, company_ceo_year_born,
         company_full_time_employees, CAST(company_ipo_date AS STRING) AS company_ipo_date,
         source_provider, CAST(provider_updated_date AS STRING) AS provider_updated_date,
         CAST(observed_at_utc AS STRING) AS observed_at_utc
  FROM \`${sourceProject}.prod__dp_oracle_fincore_historic_fundamental__datasets.fundamental_subject_snapshots\`
  QUALIFY ROW_NUMBER() OVER (
    PARTITION BY fundamental_subject_id
    ORDER BY observed_at_utc DESC, created_at DESC
  ) = 1
  ORDER BY fundamental_subject_id
`);

const { plan, entitySummaries, fundamentalSummaries } = buildPlan(
  assetRows,
  exchangeRows,
  scoringBatch,
  semanticRows,
  registryRows,
  mediaRows,
  profileRows,
);
const snapshotAt = assetRows.map((asset) => asset.updated_at).sort().at(-1);
const catalog = {
  catalogVersion: "ofl-ipulse-entity-catalog-0.1.0",
  generatedFrom: {
    projectId: sourceProject,
    scoringBatch,
    sourceSnapshotAt: snapshotAt,
    semanticEnvironment,
    selection: "forecastable market entities in the scoring cohort, plus governed fundamental entities from the semantic registry",
  },
  identityPolicy: {
    ipulseEntities: "Reuse the exact deterministic iPulse asset_id as OFL entityId",
    environmentPolicy: "The same reviewed catalog artifact is promoted to staging and production; environment is never part of an entity ID seed",
    versionPolicy: "UUIDv5 over immutable entityId and source version",
  },
  entityCount: entitySummaries.length + fundamentalSummaries.length,
  forecastableEntityCount: entitySummaries.length,
  fundamentalEntityCount: fundamentalSummaries.length,
  supportingVenueCount: exchangeRows.length,
  forecastableEntities: entitySummaries,
  fundamentalEntities: fundamentalSummaries,
};
const catalogJson = `${JSON.stringify(catalog, null, 2)}\n`;
const catalogDigest = sha256(canonicalize(catalog));
const outputDir = resolve(ROOT, "data/ipulse");
await mkdir(outputDir, { recursive: true });
await writeFile(resolve(outputDir, `scoring-batch-${scoringBatch}-entity-catalog.json`), catalogJson);
await writeFile(resolve(outputDir, `scoring-batch-${scoringBatch}-entity-catalog.sha256`), `${catalogDigest}\n`);

let applyResult;
if (apply) {
  assert(
    process.env.OFR_CONFIRM_FIRESTORE_PROJECT === targetProject,
    "Set OFR_CONFIRM_FIRESTORE_PROJECT to the exact target project before --apply",
  );
  applyResult = await applyPlan(plan, targetProject);
}

console.log(JSON.stringify({
  mode: apply ? "apply" : "snapshot-only",
  sourceProject,
  targetProject: apply ? targetProject : null,
  scoringBatch,
  forecastableEntities: assetRows.length,
  fundamentalEntities: fundamentalSummaries.length,
  governedMediaMappings: mediaRows.length,
  semanticEnvironment,
  supportingVenueEntities: exchangeRows.length,
  plannedDocuments: plan.size,
  catalogDigest,
  output: `data/ipulse/scoring-batch-${scoringBatch}-entity-catalog.json`,
  applyResult,
}, null, 2));
