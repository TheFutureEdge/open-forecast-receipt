const DEFAULT_MAX_DOCUMENT_BYTES = 700 * 1024;

function documentBytes(value) {
  return Buffer.byteLength(JSON.stringify(value), "utf8");
}

function partDocument({ entityId, generatedAt, forecasts, partNumber, partCount, totalForecastCount }) {
  return {
    catalogVersion: "ofl-public-entity-forecast-ledger-part-v0.2.0",
    entityId,
    partNumber,
    partCount,
    totalForecastCount,
    isLatest: partNumber === partCount,
    generatedAt,
    firstForecastCreatedAt: forecasts[0]?.forecastCreatedAt,
    lastForecastCreatedAt: forecasts.at(-1)?.forecastCreatedAt,
    forecastCount: forecasts.length,
    forecasts,
    publicationStatus: "published",
    visibility: "public",
  };
}

/**
 * Split one entity ledger into deterministic oldest-to-newest catalog parts.
 * The newest forecasts therefore always land in the highest numbered part.
 */
export function buildForecastLedgerCatalogParts({
  entityId,
  generatedAt,
  forecasts,
  maxDocumentBytes = DEFAULT_MAX_DOCUMENT_BYTES,
}) {
  const ordered = [...forecasts].sort((left, right) => (
    left.forecastCreatedAt.localeCompare(right.forecastCreatedAt)
    || left.sortOrder - right.sortOrder
    || left.forecastId.localeCompare(right.forecastId)
  ));
  const groups = [];
  let current = [];

  for (const forecast of ordered) {
    const candidate = [...current, forecast];
    const probe = partDocument({
      entityId,
      generatedAt,
      forecasts: candidate,
      partNumber: 999999,
      partCount: 999999,
      totalForecastCount: ordered.length,
    });
    if (documentBytes(probe) > maxDocumentBytes && current.length > 0) {
      groups.push(current);
      current = [forecast];
    } else {
      current = candidate;
    }
    const singleProbe = partDocument({
      entityId,
      generatedAt,
      forecasts: current,
      partNumber: 999999,
      partCount: 999999,
      totalForecastCount: ordered.length,
    });
    if (documentBytes(singleProbe) > maxDocumentBytes) {
      throw new Error(`A single forecast summary for ${entityId} exceeds the ${maxDocumentBytes}-byte catalog-part limit`);
    }
  }
  if (current.length > 0) groups.push(current);

  return groups.map((partForecasts, index) => {
    const partNumber = index + 1;
    const value = partDocument({
      entityId,
      generatedAt,
      forecasts: partForecasts,
      partNumber,
      partCount: groups.length,
      totalForecastCount: ordered.length,
    });
    const bytes = documentBytes(value);
    if (bytes > maxDocumentBytes) {
      throw new Error(`Ledger part ${entityId}/part-${partNumber} is ${bytes} bytes and exceeds ${maxDocumentBytes}`);
    }
    return {
      partId: `part-${String(partNumber).padStart(6, "0")}`,
      partNumber,
      value,
      bytes,
    };
  });
}

export { DEFAULT_MAX_DOCUMENT_BYTES };
