/** Publisher-owned display metadata. Never changes collection or receipt identity. */
export function ipulseCollectionPresentation(collection, forecasts, entitiesById) {
  if (collection.publisherId !== "publisher_future_edge_ipulse_ai") return collection.presentation;
  const records = forecasts.filter(record => record.collectionId === collection.collectionId);
  if (!records.length) return collection.presentation;
  const days = [...new Set(records.map(record => String(record.forecastCreatedAt || "").slice(0, 10)))].sort();
  if (days.some(day => !/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(Date.parse(day)))) throw new Error("Invalid source forecast date");
  const formatDate = day => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(day));
  const dateLabel = days.length === 1 ? formatDate(days[0]) : `${formatDate(days[0])} – ${formatDate(days.at(-1))}`;
  const categories = new Set(records.map(record => record.subjectCategory));
  const types = new Set(records.map(record => entitiesById.get(record.entityId)?.entityType));
  const tags = ["Financial markets"];
  if (types.has("listed_security")) tags.push("Stocks");
  if (types.has("listed_fund_share")) tags.push("Funds & ETFs");
  for (const [category, label] of [["crypto", "Crypto"], ["forex", "Forex"], ["commodity", "Commodities"], ["index", "Market indices"]]) {
    if (categories.has(category)) tags.push(label);
  }
  const count = records.length.toLocaleString("en-US");
  const batch = collection.collectionId.match(/^batch-(\d+)$/)?.[1];
  return {
    title: `iPulse AI Financial Markets — ${count} Forecasts · ${dateLabel}${batch ? ` (Batch ${batch})` : ""}`,
    publisherName: "iPulse AI",
    description: `${count} individual forecasts across ${new Set(records.map(record => record.entityId)).size.toLocaleString("en-US")} financial-market instruments. Forecasts created ${dateLabel}; added to Forecast Library ${formatDate(collection.publishedAt.slice(0, 10))}. Each forecast has its own sealed receipt.`,
    tags,
    forecastDateStart: days[0],
    forecastDateEnd: days.at(-1),
  };
}
