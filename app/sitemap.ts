import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { listPublicSitemapEntriesServer } from "../src/lib/library/server-repository";
import { getPublicSiteOrigin } from "../src/lib/siteOrigin";

// App Hosting build workers do not need Firestore data access. The sitemap is
// assembled at request time from bounded materialized catalogs instead.
export const dynamic = "force-dynamic";

const staticPaths = [
  "",
  "/about",
  "/how-it-works",
  "/standards",
  "/standards/open-forecast-receipt/v0-1",
  "/integrity-test",
  "/trust",
  "/privacy",
  "/terms",
  "/disclaimer",
  "/entities",
  "/entities/directory",
  "/entities/listed-securities",
  "/entities/funds-etfs",
  "/entities/cryptoassets",
  "/entities/commodities",
  "/entities/currency-pairs",
  "/entities/market-indices",
  "/entities/corporations",
  "/entities/investment-funds",
  "/forecasts",
  "/forecasters",
  "/targets",
  "/publishers",
  "/collections",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const origin = getPublicSiteOrigin();
  const dynamicEntries = await listPublicSitemapEntriesServer();
  return [
    ...staticPaths.map((path) => ({ url: `${origin}${path}`, changeFrequency: "weekly" as const, priority: path === "" ? 1 : 0.7 })),
    ...dynamicEntries.map((entry) => ({
      url: `${origin}${entry.path}`,
      lastModified: entry.lastModified,
      changeFrequency: "weekly" as const,
      priority: entry.path.includes("/forecasts/") ? 0.7 : 0.6,
    })),
  ];
}
