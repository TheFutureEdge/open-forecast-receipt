const namespaces = new Set([
  "public_targets", "public_forecasters", "public_collections",
  "public_forecaster_catalogs", "public_entity_directory_catalogs",
  "public_collection_catalogs", "public_entity_forecast_catalogs",
  "public_entity_forecast_ledgers", "public_library_stats", "public_sitemap_catalogs",
]);

export function catalogCollectionPath(name: string, generationId: string | null): string {
  if (!namespaces.has(name)) throw new Error(`Not a catalog namespace: ${name}`);
  if (generationId === null) return name;
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(generationId)) throw new Error("Invalid catalog generation ID");
  return `public_catalog_generations/${generationId}/${name}`;
}
