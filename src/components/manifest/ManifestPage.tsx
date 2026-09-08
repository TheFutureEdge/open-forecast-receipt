"use client";

import { useEffect, useState } from "react";
import { BatchManifestComponent } from "./BatchManifest";
import { getLibraryManifest } from "../../lib/library/repository";
import type { LibraryManifest } from "../../lib/library/types";
import { PageSeo } from "../seo/PageSeo";

export function ManifestPage({ batchId, initialManifest, canonicalPath = "/forecasts" }: { batchId: string; initialManifest?: LibraryManifest | null; canonicalPath?: string }) {
  const [manifest, setManifest] = useState<LibraryManifest | null>(initialManifest || null);
  const [loading, setLoading] = useState(initialManifest === undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialManifest !== undefined) {
      setManifest(initialManifest);
      setLoading(false);
      setError(null);
      return undefined;
    }
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
  }, [batchId, initialManifest]);

  if (loading) {
    return <div className="py-20 text-center text-sm text-slate-500">Loading the public forecast Library…</div>;
  }

  if (!manifest || error) {
    return (
      <div className="text-center py-20">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
          {error ? "Library unavailable" : "Collection not found"}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {error || <>No public collection was found for <code className="text-xs font-mono">{batchId}</code>.</>}
        </p>
      </div>
    );
  }

  return (
    <>
      <PageSeo
        title="iPulse AI Public Market Forecasts | Forecast Library"
        description="Browse individual iPulse AI market forecasts, inspect their Open Forecast Receipts, and check optional per-receipt blockchain proof status."
        canonicalPath={canonicalPath}
      />
      <BatchManifestComponent manifest={manifest} />
    </>
  );
}
