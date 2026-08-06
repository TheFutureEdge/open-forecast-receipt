import type { BatchManifest } from "../../types/manifest";
import { AssetRow } from "./AssetRow";

interface BatchManifestProps {
  manifest: BatchManifest;
}

export function BatchManifestComponent({ manifest }: BatchManifestProps) {
  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {manifest.batchLabel}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {manifest.description}
        </p>
      </div>
      <div className="space-y-2">
        {manifest.assets.map((asset) => (
          <AssetRow key={asset.slug} asset={asset} />
        ))}
      </div>
    </div>
  );
}
