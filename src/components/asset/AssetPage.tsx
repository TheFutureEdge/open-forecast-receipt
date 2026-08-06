import { Link } from "../../lib/router";
import { StatusBadge } from "../common/StatusBadge";
import { AdvisorCardList } from "./AdvisorCardList";
import type { BatchManifest } from "../../types/manifest";
import manifestData from "../../data/fixtures/batch6-manifest.json";
import { getAssetFixtureEntries } from "../../data/fixtures/catalog";

const manifest = manifestData as BatchManifest;

export function AssetPage({ routeSlug }: { routeSlug: string }) {
  const asset = manifest.assets.find(
    (candidate) => candidate.slug === routeSlug || candidate.aliases?.includes(routeSlug)
  );
  const fixtures = asset ? getAssetFixtureEntries(asset.slug) : [];

  if (!asset) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Asset not found</h2>
        <Link to="/manifest/batch-6" className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
          Back to Manifest
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            <span className="uppercase">{asset.displaySymbol}</span> — {asset.name}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {asset.marketIdentifier}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge
            type="coverageStatus"
            value={asset.coverageStatus}
            label={asset.coverageStatus === "partial" ? `Partial (${asset.loadedCount}/${asset.advisorCount})` : undefined}
          />
          <StatusBadge type="chainStatus" value={asset.chainStatus} />
        </div>
      </div>

      {asset.coverageStatus === "none" && (
        <div className="p-6 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            No forecast data has been loaded yet. Real data will appear here when available.
          </p>
        </div>
      )}

      {asset.coverageStatus === "partial" && (
        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            {fixtures.length} of {asset.advisorCount} advisor forecasts loaded. {asset.advisorCount - fixtures.length} more pending.
          </p>
        </div>
      )}

      {asset.coverageStatus === "complete" && (
        <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900">
          <p className="text-sm text-emerald-700 dark:text-emerald-400">
            All {asset.advisorCount} individual advisor forecast receipts are loaded for this asset.
          </p>
        </div>
      )}

      {fixtures.length > 0 && (
        <AdvisorCardList fixtures={fixtures} advisorCount={asset.advisorCount} />
      )}
    </div>
  );
}
