import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle, LinkSimple } from "@phosphor-icons/react";
import { Link } from "../../lib/router";
import { StatusBadge } from "../common/StatusBadge";
import { AdvisorCardList } from "./AdvisorCardList";
import { LoadedReceiptDetail } from "../receipt/ReceiptDetail";
import type { CompactEasProjection, OfrDocument } from "../../types/ofr";
import {
  getLibraryReceipt,
  getLibrarySubject,
  getSubjectProofCounts,
  listLibraryForecasts,
} from "../../lib/library/repository";
import type { PublicCollectionSubjectRecord, PublicForecastRecord } from "../../lib/library/types";

export function AssetPage({ batchId, routeSlug }: { batchId: string; routeSlug: string }) {
  const [asset, setAsset] = useState<PublicCollectionSubjectRecord | null>(null);
  const [fixtures, setFixtures] = useState<PublicForecastRecord[]>([]);
  const [selected, setSelected] = useState<PublicForecastRecord | undefined>();
  const [loaded, setLoaded] = useState<{ document: OfrDocument; projection: CompactEasProjection } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingAsset, setLoadingAsset] = useState(true);

  useEffect(() => {
    let active = true;
    setAsset(null);
    setFixtures([]);
    setSelected(undefined);
    setLoadError(null);
    setLoadingAsset(true);
    getLibrarySubject(batchId, routeSlug)
      .then(async (subject) => {
        if (!subject) return { subject: null, forecasts: [] as PublicForecastRecord[] };
        return { subject, forecasts: await listLibraryForecasts(batchId, subject.subjectId) };
      })
      .then(({ subject, forecasts }) => {
        if (!active) return;
        setAsset(subject);
        setFixtures(forecasts);
        setSelected(forecasts[0]);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : "Unable to load subject");
      })
      .finally(() => {
        if (active) setLoadingAsset(false);
      });
    return () => { active = false; };
  }, [batchId, routeSlug]);

  useEffect(() => {
    let active = true;
    setLoaded(null);
    setLoadError(null);
    if (!selected) return () => { active = false; };
    getLibraryReceipt(selected.receiptDigest)
      .then((result) => {
        if (active && result) {
          setLoaded({ document: result.document, projection: result.projection });
        }
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : "Unable to load receipt");
      });
    return () => { active = false; };
  }, [selected]);

  if (loadingAsset) {
    return <div className="py-20 text-center text-sm text-slate-500">Loading subject and forecast receipts…</div>;
  }

  if (!asset) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Subject not found</h2>
        {loadError && <p className="mt-2 text-sm text-red-600">{loadError}</p>}
        <Link to="/showcase" className="mt-4 inline-block text-sm font-semibold text-blue-600 hover:underline">Back to showcase</Link>
      </div>
    );
  }

  const showcaseCounts = getSubjectProofCounts(asset);

  return (
    <div className="space-y-3.5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link to="/showcase" aria-label="Back to showcase" className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900">
            <ArrowLeft size={17} weight="bold" />
          </Link>
          <img src={`/assets/brands/${asset.slug}.png`} alt="" className="size-12 rounded-xl border border-slate-200 bg-white object-contain p-1.5 shadow-sm" />
          <div>
            <div className="flex items-baseline gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{asset.name}</h1>
              <span className="text-sm font-bold text-slate-400">{asset.displaySymbol}</span>
            </div>
            <p className="mt-0.5 text-xs font-medium text-slate-500">{asset.marketIdentifier} · 12 independent AI forecasts</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge type="coverageStatus" value={asset.coverageStatus} />
          <StatusBadge
            type="chainStatus"
            value={showcaseCounts.verified > 0 ? "verified" : asset.chainStatus}
            label={`${showcaseCounts.verified}/${showcaseCounts.selected} public proofs`}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
        <span className="flex items-center gap-2 font-semibold"><CheckCircle size={17} weight="fill" /> All {asset.advisorCount} forecast receipts loaded</span>
        <span className="flex items-center gap-2"><LinkSimple size={16} /> Blockchain proof is optional and independent for each receipt</span>
      </div>

      <section className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40 lg:grid-cols-[310px_minmax(0,1fr)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
        <div className="border-b border-slate-200 lg:border-b-0 lg:border-r dark:border-slate-800">
          <AdvisorCardList
            fixtures={fixtures}
            advisorCount={asset.advisorCount}
            selectedDigest={selected?.receiptDigest}
            onSelect={setSelected}
          />
        </div>
        <div className="min-w-0 bg-[#f8fafc] p-4 sm:p-6 dark:bg-slate-950/50">
          {loadError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{loadError}</div>
          ) : loaded ? (
            <LoadedReceiptDetail document={loaded.document} projection={loaded.projection} embedded />
          ) : (
            <div className="grid min-h-[640px] place-items-center text-sm text-slate-400">Loading forecast receipt…</div>
          )}
        </div>
      </section>
    </div>
  );
}
