import { useEffect, useState } from "react";
import { BatchManifestComponent } from "./BatchManifest";
import { getLibraryManifest } from "../../lib/library/repository";
import type { LibraryManifest } from "../../lib/library/types";

export function ManifestPage({ batchId }: { batchId: string }) {
  const [manifest, setManifest] = useState<LibraryManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getLibraryManifest(batchId)
      .then((result) => {
        if (active) setManifest(result);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load the public Library");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [batchId]);

  if (loading) {
    return <div className="py-20 text-center text-sm text-slate-500">Loading the public forecast Library…</div>;
  }

  if (!manifest || error) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
          {error ? "Library unavailable" : "Collection not found"}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {error || <>No public collection was found for <code className="text-xs font-mono">{batchId}</code>.</>}
        </p>
      </div>
    );
  }

  return <BatchManifestComponent manifest={manifest} />;
}
