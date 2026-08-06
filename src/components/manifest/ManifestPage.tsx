import type { BatchManifest } from "../../types/manifest";
import { BatchManifestComponent } from "./BatchManifest";
import manifestData from "../../data/fixtures/batch6-manifest.json";

const manifest = manifestData as BatchManifest;

export function ManifestPage({ batchId }: { batchId: string }) {
  if (batchId !== manifest.batchId) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Batch not found</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No manifest found for batch <code className="text-xs font-mono">{batchId}</code>.
        </p>
      </div>
    );
  }

  return <BatchManifestComponent manifest={manifest} />;
}
