import type {
  PublicEntityRecord,
  PublicForecastOriginalSource,
  PublicForecastRecord,
  PublicRelatedEntity,
} from "./types";

export type PublicEntityRouteKind = "listed-securities" | "corporations" | "investment-funds" | "organizations" | "entities";

type RoutableEntity = Pick<PublicEntityRecord, "canonicalName" | "stableSlug" | "publicSlug" | "entityType" | "entityClasses">;

/** Build a readable URL segment. The governed entity ID remains the immutable identity. */
export function slugifyEntityName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

export function publicEntityRouteKind(entity: Pick<PublicEntityRecord, "entityType" | "entityClasses">): PublicEntityRouteKind {
  if (entity.entityType === "listed_security" || entity.entityClasses?.includes("forecastable_entity")) return "listed-securities";
  if (entity.entityType === "corporation") return "corporations";
  if (entity.entityType === "investment_fund") return "investment-funds";
  if (entity.entityClasses?.includes("organization") || entity.entityType === "organization") return "organizations";
  return "entities";
}

/** Return the governed public locator, separate from the machine identity and mutable ticker. */
export function publicEntitySlug(entity: RoutableEntity): string {
  if (entity.publicSlug) return entity.publicSlug;
  if (publicEntityRouteKind(entity) === "listed-securities") return entity.stableSlug;
  return slugifyEntityName(entity.canonicalName) || entity.stableSlug;
}

export function publicEntityPath(entity: RoutableEntity): string {
  const kind = publicEntityRouteKind(entity);
  const slug = publicEntitySlug(entity);
  return kind === "entities"
    ? `/entities/${encodeURIComponent(slug)}`
    : `/entities/${kind}/${encodeURIComponent(slug)}`;
}

const LEGACY_COLLECTION_GENERATION_DATES: Record<string, string> = {
  "batch-6": "2026-07-05",
};

/** Every public forecast for one governed listed security, independent of how it was submitted. */
export function publicEntityForecastLedgerPath(entitySlug: string): string {
  return `/entities/listed-securities/${encodeURIComponent(entitySlug)}/forecasts`;
}

export function publicForecasterAnchorId(forecasterId: string): string {
  return `forecaster-${forecasterId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

/** Stable, readable forecaster profile route. */
export function publicForecasterPath(forecaster: string | Pick<PublicForecastRecord, "forecasterId" | "forecasterPublicSlug" | "forecasterLabel" | "forecaster">): string {
  const slug = typeof forecaster === "string"
    ? slugifyEntityName(forecaster)
    : forecaster.forecasterPublicSlug
      || slugifyEntityName(forecaster.forecaster?.displayName || forecaster.forecasterLabel || forecaster.forecasterId);
  return `/forecasters/${encodeURIComponent(slug)}`;
}

export function parseEntityForecastLedgerPath(pathname: string): { routeSlug: string } | null {
  const match = pathname.match(/^\/entities\/listed-securities\/([^/]+)\/forecasts\/?$/);
  return match ? { routeSlug: decodeURIComponent(match[1]) } : null;
}

/** Convert optional publisher batching metadata into a short, secondary source tag. */
export function publicForecastSourceTag(collectionId?: string): string {
  if (!collectionId) return "INDIVIDUAL";
  const ipulseBatch = collectionId.match(/^batch-(\d+)$/i);
  if (ipulseBatch) return `SB${ipulseBatch[1]}`;
  return slugifyEntityName(collectionId).toUpperCase() || "SET";
}

/**
 * Return the governed original-publication link. The Batch 6+ fallback keeps
 * existing iPulse AI records useful while the explicit index field rolls out.
 */
export function publicForecastOriginalSource(
  entitySlug: string,
  forecast: Pick<PublicForecastRecord, "collectionId" | "forecastCreatedAt" | "originalSource">,
): PublicForecastOriginalSource | undefined {
  if (forecast.originalSource?.url) return forecast.originalSource;

  const batch = forecast.collectionId?.match(/^batch-(\d+)$/i)?.[1];
  if (!batch || Number(batch) < 6) return undefined;
  const publicationDate = forecast.forecastCreatedAt.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publicationDate)) return undefined;
  const publicationId = `${publicationDate}-sb${batch}`;
  return {
    publisherName: "iPulse AI",
    label: "View the original historical forecast",
    url: `https://ipulseai.com/stocks/${encodeURIComponent(entitySlug)}/forecast-history/${publicationId}/ai-forecasts`,
    publicationId,
    publicationDate,
  };
}

/** Build a date-led publication-set slug. Batch identity never leads the public URL. */
export function publicForecastSetSlug(collectionId: string, generatedAt?: string): string {
  const date = (generatedAt || LEGACY_COLLECTION_GENERATION_DATES[collectionId] || "undated").slice(0, 10);
  return `${date}-${publicForecastSourceTag(collectionId).toLowerCase()}`;
}

export function publicEntityForecastSetPath(entitySlug: string, collectionId: string, generatedAt?: string): string {
  return `/entities/listed-securities/${encodeURIComponent(entitySlug)}/forecast-sets/${encodeURIComponent(publicForecastSetSlug(collectionId, generatedAt))}`;
}

export function parseEntityForecastSetPath(pathname: string): { routeSlug: string; setSlug: string; collectionId: string | null } | null {
  const match = pathname.match(/^\/entities\/listed-securities\/([^/]+)\/forecast-sets\/([^/]+)\/?$/);
  if (!match) return null;
  const setSlug = decodeURIComponent(match[2]);
  const sourceBatch = setSlug.match(/-sb(\d+)$/i);
  return {
    routeSlug: decodeURIComponent(match[1]),
    setSlug,
    collectionId: sourceBatch ? `batch-${sourceBatch[1]}` : null,
  };
}

export function publicForecastTimestampSlug(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return slugifyEntityName(value) || "undated";
  return parsed.toISOString().replace(/\.\d{3}Z$/, "Z").replaceAll(":", "-").toLowerCase();
}

export function publicForecastDateSlug(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return slugifyEntityName(value) || "undated";
  return parsed.toISOString().slice(0, 10);
}

export function publicForecastTargetSlug(forecast: Pick<PublicForecastRecord, "targetSlug" | "targetName">): string {
  return forecast.targetSlug || slugifyEntityName(forecast.targetName) || "unspecified-target";
}

export function publicForecastKey(forecast: Pick<PublicForecastRecord, "receiptDigest" | "forecastId">): string {
  return (forecast.receiptDigest || forecast.forecastId).replace(/[^a-zA-Z0-9]/g, "").slice(0, 16).toLowerCase();
}

/** Transitional fallback only; production publication persists forecastPublicId. */
export function publicForecastPublicId(forecast: Pick<PublicForecastRecord, "forecastPublicId" | "receiptDigest" | "forecastId">): string {
  return forecast.forecastPublicId || `f-${publicForecastKey(forecast)}`;
}

/**
 * Match the final 16-character locator while accepting the unpublished
 * 12-character staging locator long enough to issue a permanent redirect.
 */
export function publicForecastKeyMatches(
  forecast: Pick<PublicForecastRecord, "forecastPublicId" | "receiptDigest" | "forecastId">,
  requestedKey: string,
): boolean {
  if (forecast.forecastPublicId && forecast.forecastPublicId.toLowerCase() === requestedKey.toLowerCase()) return true;
  const canonicalKey = publicForecastKey(forecast);
  const normalizedRequestedKey = requestedKey.toLowerCase();
  return canonicalKey === normalizedRequestedKey
    || (normalizedRequestedKey.length === 12 && canonicalKey.startsWith(normalizedRequestedKey));
}

export function publicForecastPath(entitySlug: string, forecast: PublicForecastRecord): string {
  const forecasterSlug = forecast.forecasterPublicSlug
    || slugifyEntityName(forecast.forecaster?.displayName || forecast.forecasterLabel || forecast.forecasterId);
  return `${publicEntityForecastLedgerPath(entitySlug)}/${encodeURIComponent(publicForecastDateSlug(forecast.forecastCreatedAt))}/${encodeURIComponent(publicForecastTargetSlug(forecast))}/${encodeURIComponent(forecasterSlug)}/${encodeURIComponent(publicForecastPublicId(forecast))}`;
}

export function parsePublicForecastPath(pathname: string): { routeSlug: string; generatedDate: string; targetSlug: string; forecasterSlug: string; forecastPublicId: string } | null {
  const match = pathname.match(/^\/entities\/listed-securities\/([^/]+)\/forecasts\/([^/]+)\/([^/]+)\/([^/]+)\/([^/]+)\/?$/);
  if (!match) return null;
  return {
    routeSlug: decodeURIComponent(match[1]),
    generatedDate: decodeURIComponent(match[2]),
    targetSlug: decodeURIComponent(match[3]),
    forecasterSlug: decodeURIComponent(match[4]),
    forecastPublicId: decodeURIComponent(match[5]),
  };
}

/** Route emitted by the pre-production build; accepted only to issue a 308. */
export function parseLegacyPublicForecastPath(pathname: string): { routeSlug: string; timestampSlug: string; forecasterSlug: string; forecastKey: string } | null {
  const match = pathname.match(/^\/entities\/listed-securities\/([^/]+)\/forecasts\/([^/]+)\/([^/]+)\/([^/]+)\/?$/);
  if (!match) return null;
  return {
    routeSlug: decodeURIComponent(match[1]),
    timestampSlug: decodeURIComponent(match[2]),
    forecasterSlug: decodeURIComponent(match[3]),
    forecastKey: decodeURIComponent(match[4]),
  };
}

export function publicTargetPath(targetSlug: string): string {
  return `/targets/${encodeURIComponent(targetSlug)}`;
}

export function publicPublisherPath(publisherSlug: string): string {
  return `/publishers/${encodeURIComponent(publisherSlug)}`;
}

export function publicCollectionPath(publisherSlug: string, collectionSlug: string): string {
  return `/collections/${encodeURIComponent(publisherSlug)}/${encodeURIComponent(collectionSlug)}`;
}

export function publicCollectionEntityPath(publisherSlug: string, collectionSlug: string, entitySlug: string): string {
  return `${publicCollectionPath(publisherSlug, collectionSlug)}/entities/${encodeURIComponent(entitySlug)}`;
}

/** Legacy route retained only for redirects from the first hackathon build. */
export function publicEntityForecastCollectionPath(entitySlug: string, collectionId: string): string {
  return `/entities/listed-securities/${encodeURIComponent(entitySlug)}/forecasts/${encodeURIComponent(collectionId)}`;
}

export function parseEntityForecastCollectionPath(pathname: string): { routeSlug: string; collectionId: string } | null {
  const match = pathname.match(/^\/entities\/listed-securities\/([^/]+)\/forecasts\/([^/]+)\/?$/);
  if (!match) return null;
  return {
    routeSlug: decodeURIComponent(match[1]),
    collectionId: decodeURIComponent(match[2]),
  };
}

export function publicRelatedEntityPath(entity: PublicRelatedEntity): string {
  const publicSlug = entity.publicSlug
    || (entity.entityType === "listed_security" ? entity.stableSlug : slugifyEntityName(entity.canonicalName))
    || entity.stableSlug;
  if (entity.predicate === "has_market_representation" || entity.entityType === "listed_security") {
    return `/entities/listed-securities/${encodeURIComponent(publicSlug)}`;
  }
  if (entity.entityType === "corporation") {
    return `/entities/corporations/${encodeURIComponent(publicSlug)}`;
  }
  if (entity.entityType === "investment_fund") {
    return `/entities/investment-funds/${encodeURIComponent(publicSlug)}`;
  }
  if (entity.predicate === "is_market_representation_of" || entity.entityType === "organization") {
    return `/entities/organizations/${encodeURIComponent(publicSlug)}`;
  }
  return `/entities/${encodeURIComponent(publicSlug)}`;
}

export function parseEntityDetailPath(pathname: string): { routeKey: string; routeKind?: PublicEntityRouteKind } | null {
  const typedMatch = pathname.match(/^\/entities\/(listed-securities|corporations|investment-funds|organizations)\/([^/]+)\/?$/);
  if (typedMatch) return { routeKind: typedMatch[1] as PublicEntityRouteKind, routeKey: decodeURIComponent(typedMatch[2]) };

  const legacyMatch = pathname.match(/^\/entities\/([^/]+)\/?$/);
  if (!legacyMatch) return null;
  const routeKey = decodeURIComponent(legacyMatch[1]);
  if (["directory", "listed-securities", "corporations", "investment-funds", "organizations", "forecasters"].includes(routeKey)) return null;
  return { routeKey };
}
