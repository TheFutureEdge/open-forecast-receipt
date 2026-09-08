"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle, LinkSimple } from "@phosphor-icons/react";
import { Link } from "../../lib/router";
import { StatusBadge } from "../common/StatusBadge";
import { AdvisorCardList } from "./AdvisorCardList";
import { LoadedReceiptDetail } from "../receipt/ReceiptDetail";
import type { CompactEasProjection, OfrDocument } from "../../types/ofr";
import {
  getLibraryReceipt,
  getLibraryEntity,
  getPublicEntity,
  getEntityProofCounts,
  listLibraryForecasts,
} from "../../lib/library/repository";
import type { PublicCollectionEntityRecord, PublicForecastRecord } from "../../lib/library/types";
import { PageSeo } from "../seo/PageSeo";
import { EntityLogo } from "../entities/EntityLogo";
import {
  publicEntityForecastLedgerPath,
  publicEntityForecastSetPath,
  publicForecastSourceTag,
} from "../../lib/library/entityRoutes";

export interface AssetPageInitialData {
  asset: PublicCollectionEntityRecord | null;
  forecasts: PublicForecastRecord[];
  selectedReceipt: { document: OfrDocument; projection: CompactEasProjection } | null;
  logo: { url?: string; alt?: string };
}

export function AssetPage({ batchId, routeSlug, setSlug, initialData }: { batchId: string; routeSlug: string; setSlug: string; initialData?: AssetPageInitialData }) {
  const securityPath = `/entities/listed-securities/${encodeURIComponent(routeSlug)}`;
  const ledgerPath = publicEntityForecastLedgerPath(routeSlug);
  const canonicalPath = publicEntityForecastSetPath(routeSlug, batchId, setSlug.slice(0, 10));
  const [asset, setAsset] = useState<PublicCollectionEntityRecord | null>(initialData?.asset || null);
  const [fixtures, setFixtures] = useState<PublicForecastRecord[]>(initialData?.forecasts || []);
  const [selected, setSelected] = useState<PublicForecastRecord | undefined>(initialData?.forecasts[0]);
  const [loaded, setLoaded] = useState<{ document: OfrDocument; projection: CompactEasProjection } | null>(initialData?.selectedReceipt || null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingAsset, setLoadingAsset] = useState(!initialData);
  const [logo, setLogo] = useState<{ url?: string; alt?: string }>(initialData?.logo || {});

  useEffect(() => {
    if (initialData) {
      setAsset(initialData.asset);
      setFixtures(initialData.forecasts);
      setSelected(initialData.forecasts[0]);
      setLoaded(initialData.selectedReceipt);
      setLogo(initialData.logo);
      setLoadingAsset(false);
      setLoadError(null);
      return undefined;
    }
    let active = true;
    setAsset(null);
    setFixtures([]);
    setSelected(undefined);
    setLogo({});
    setLoadError(null);
    setLoadingAsset(true);
    getLibraryEntity(batchId, routeSlug)
      .then(async (entity) => {
        if (!entity) return { entity: null, forecasts: [] as PublicForecastRecord[] };
        const [forecasts, publicEntity] = await Promise.all([
          listLibraryForecasts(batchId, entity.entityId),
          getPublicEntity(entity.entityId),
        ]);
        return { entity, forecasts, publicEntity };
      })
      .then(({ entity, forecasts, publicEntity }) => {
        if (!active) return;
        setAsset(entity);
        setFixtures(forecasts);
        setSelected(forecasts[0]);
        setLogo({ url: publicEntity?.logo?.url, alt: publicEntity?.logo?.alt });
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : "Unable to load entity");
      })
      .finally(() => {
        if (active) setLoadingAsset(false);
      });
    return () => { active = false; };
  }, [batchId, initialData, routeSlug]);

  useEffect(() => {
    if (initialData && selected?.receiptDigest === initialData.forecasts[0]?.receiptDigest) {
      setLoaded(initialData.selectedReceipt);
      return undefined;
    }
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
  }, [initialData, selected]);

  if (loadingAsset) {
    return <div className="py-20 text-center text-sm text-slate-500">Loading entity and forecast receipts…</div>;
  }

  if (!asset) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Entity not found</h1>
        {loadError && <p className="mt-2 text-sm text-red-600">{loadError}</p>}
        <Link to={securityPath} className="mt-4 inline-block text-sm font-semibold text-blue-600 hover:underline">Back to listed security</Link>
      </div>
    );
  }

  const showcaseCounts = getEntityProofCounts(asset);

  return (
    <>
      <PageSeo
        title={`${asset.name} Forecast Publication Set | Forecast Library`}
        description={`Inspect this date-led set of ${asset.advisorCount} independent AI forecasts for ${asset.name} (${asset.displaySymbol}), including forecast paths, receipt integrity, provenance, and optional blockchain proofs.`}
        canonicalPath={canonicalPath}
        pageType="article"
      />
      <div className="space-y-3.5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link to={ledgerPath} aria-label={`Back to ${asset.displaySymbol} forecast ledger`} className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900">
            <ArrowLeft size={17} weight="bold" />
          </Link>
          <EntityLogo src={logo.url} alt={logo.alt || `${asset.name} logo`} className="size-12" imageClassName="p-1.5" />
          <div>
            <div className="flex items-baseline gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{asset.name}</h1>
              <span className="text-sm font-bold text-slate-400">{asset.displaySymbol}</span>
            </div>
            <p className="mt-0.5 text-xs font-medium text-slate-500">{asset.marketIdentifier} · generated {setSlug.slice(0, 10)} · source tag {publicForecastSourceTag(batchId)} · {asset.advisorCount} forecasts</p>
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
        <Link to={ledgerPath} className="font-bold text-emerald-900 underline underline-offset-2 dark:text-emerald-100">View the complete {asset.displaySymbol} forecast ledger</Link>
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
    </>
  );
}
