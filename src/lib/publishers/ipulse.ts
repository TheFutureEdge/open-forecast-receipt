import assetPaths from "../../data/ipulse-public-asset-paths.json";
import type { PublicForecastOriginalSource } from "../library/types";

/** Publisher adapter only. These market paths are not Forecast Library taxonomy. */
export const IPULSE_PUBLISHER_ID = "publisher_future_edge_ipulse_ai";
type SourceRecord = { publisherId?: string; entityId?: string; originalSource?: PublicForecastOriginalSource };
export function isIpulseSource(record: SourceRecord): boolean {
  return record.publisherId === IPULSE_PUBLISHER_ID
    || (!record.publisherId && record.originalSource?.publisherName === "iPulse AI"
      && safeUrl(record.originalSource.url)?.origin === "https://ipulseai.com");
}
function safeUrl(value?: string): URL | undefined {
  try { const url = new URL(value || ""); return url.protocol === "https:" && !url.username && !url.password ? url : undefined; }
  catch { return undefined; }
}
export function ipulseAssetUrl(record: SourceRecord): string | undefined {
  if (!isIpulseSource(record)) return undefined;
  const path = record.entityId ? (assetPaths as Record<string, string>)[record.entityId] : undefined;
  if (path) return `https://ipulseai.com${path}`;
  const source = safeUrl(record.originalSource?.url);
  if (source?.origin !== "https://ipulseai.com") return undefined;
  const match = source.pathname.match(/^\/(stocks|crypto|forex|commodities|indices)\/([^/]+)(?:\/|$)/);
  return match ? `${source.origin}/${match[1]}/${match[2]}` : undefined;
}
export function ipulseHistoricalSource(record: SourceRecord & { collectionId?: string; forecastCreatedAt?: string }): PublicForecastOriginalSource | undefined {
  const assetUrl = ipulseAssetUrl(record);
  if (!assetUrl) return undefined;
  const batch = record.collectionId?.match(/^batch-(\d+)$/i)?.[1];
  const date = record.originalSource?.publicationDate || record.forecastCreatedAt?.slice(0, 10);
  const publicationId = record.originalSource?.publicationId
    || (batch && Number(batch) >= 6 && date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}-sb${batch}` : undefined);
  if (!publicationId) return record.originalSource;
  return { ...record.originalSource, publisherName: "iPulse AI", label: "View the original historical forecast",
    url: `${assetUrl}/forecast-history/${encodeURIComponent(publicationId)}/ai-forecasts`, publicationId, publicationDate: date };
}
