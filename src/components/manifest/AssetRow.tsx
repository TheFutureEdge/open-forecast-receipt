import { Link } from "../../lib/router";
import type { BatchManifestAsset } from "../../types/manifest";
import { getShowcaseCounts } from "../../data/fixtures/catalog";
import { StatusBadge } from "../common/StatusBadge";

interface AssetRowProps {
  asset: BatchManifestAsset;
  batchId: string;
}

export function AssetRow({ asset, batchId }: AssetRowProps) {
  const proofCounts = getShowcaseCounts(asset.slug);
  return (
    <Link
      to={`/manifest/${encodeURIComponent(batchId)}/assets/${encodeURIComponent(asset.slug)}`}
      className="block p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors cursor-pointer active:scale-[0.99]"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-gray-900 dark:text-gray-100 uppercase">
            {asset.displaySymbol}
          </span>
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {asset.name}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {asset.marketIdentifier}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge
            type="coverageStatus"
            value={asset.coverageStatus}
            label={asset.coverageStatus === "partial" ? `Partial (${asset.loadedCount}/${asset.advisorCount})` : undefined}
          />
          <StatusBadge
            type="chainStatus"
            value={proofCounts.verified > 0 ? "verified" : asset.chainStatus}
            label={`${proofCounts.verified}/${proofCounts.selected} showcase proofs`}
          />
        </div>
      </div>
    </Link>
  );
}
