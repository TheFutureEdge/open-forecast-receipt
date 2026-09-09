"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowSquareOut, CalendarBlank, FileText, LinkSimple } from "@phosphor-icons/react";
import { Link, navigate } from "../../lib/router";
import {
  getLibraryReceipt,
  getLoadedLibraryForecastLedger,
  getPublicEntity,
  listLibraryForecastLedgerPage,
} from "../../lib/library/repository";
import type { PublicEntityRecord, PublicForecastRecord } from "../../lib/library/types";
import type { CompactEasProjection, OfrDocument } from "../../types/ofr";
import {
  publicEntityForecastLedgerPath,
  publicEntitySlug,
  publicForecastPublicId,
  publicForecastOriginalSource,
  publicForecastSubjectSource,
  publicForecastPath,
  publicForecastSourceTag,
} from "../../lib/library/entityRoutes";
import { LoadedReceiptDetail } from "../receipt/ReceiptDetail";
import { PageSeo } from "../seo/PageSeo";
import { EntityLogo } from "../entities/EntityLogo";
import { AdvisorCardList } from "../asset/AdvisorCardList";

export interface LoadedForecast {
  entity: PublicEntityRecord;
  forecasts: PublicForecastRecord[];
  totalForecastCount: number;
  forecast: PublicForecastRecord;
  receipt: { document: OfrDocument; projection: CompactEasProjection };
}

function tickerFromEntity(entity: PublicEntityRecord): string {
  return entity.externalIdentifiers
    ?.find((identifier) => ["ticker_symbol", "ticker_mic", "ticker_venue", "ipulse_symbol"].includes(identifier.scheme))
    ?.value.split(/[:.]/, 1)[0]
    ?.toUpperCase() || entity.canonicalName;
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(date);
}

export function IndividualForecastPage({
  routeSlug,
  forecastPublicId,
  initialData,
}: {
  routeSlug: string;
  generatedDate: string;
  targetSlug: string;
  forecasterSlug: string;
  forecastPublicId: string;
  initialData?: LoadedForecast | null;
}) {
  const [loaded, setLoaded] = useState<LoadedForecast | null>(initialData || null);
  const [loading, setLoading] = useState(initialData === undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData !== undefined) {
      setLoaded(initialData);
      setLoading(false);
      setError(null);
      return undefined;
    }
    let active = true;
    setLoaded(null);
    setLoading(true);
    setError(null);

    getPublicEntity(routeSlug, "listed-securities")
      .then(async (entity) => {
        if (!entity) return null;
        const ledgerPage = await listLibraryForecastLedgerPage(entity.entityId);
        const forecasts = getLoadedLibraryForecastLedger(entity.entityId);
        const forecast = forecasts.find((candidate) => publicForecastPublicId(candidate) === forecastPublicId.toLowerCase());
        if (!forecast) return null;
        const receipt = await getLibraryReceipt(forecast.receiptDigest);
        return receipt ? { entity, forecasts, totalForecastCount: ledgerPage.totalForecastCount, forecast, receipt } : null;
      })
      .then((result) => {
        if (active) setLoaded(result);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load this forecast");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [forecastPublicId, initialData, routeSlug]);

  if (loading) return <div className="py-20 text-center text-sm text-slate-500">Loading individual forecast…</div>;
  if (!loaded || error) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Forecast not found</h1>
        <p className="mt-2 text-sm text-slate-500">{error || "No public forecast matches this stable forecast ID."}</p>
        <Link to={publicEntityForecastLedgerPath(routeSlug)} className="mt-4 inline-flex text-sm font-semibold text-blue-600 hover:underline">Back to forecast ledger</Link>
      </div>
    );
  }

  const { entity, forecasts, totalForecastCount, forecast, receipt } = loaded;
  const ticker = tickerFromEntity(entity);
  const ledgerPath = publicEntityForecastLedgerPath(publicEntitySlug(entity));
  const canonicalPath = publicForecastPath(publicEntitySlug(entity), forecast);
  const originalSource = publicForecastOriginalSource(publicEntitySlug(entity), forecast);
  const assetSource = publicForecastSubjectSource(forecast);

  return (
    <>
      <PageSeo
        title={`${forecast.forecaster?.displayName || forecast.forecasterLabel} ${ticker} Forecast | Forecast Library`}
        description={`Inspect this individual ${ticker} forecast generated ${formatDateTime(forecast.forecastCreatedAt)}, its sealed receipt, provenance, integrity, and optional blockchain proof.`}
        canonicalPath={canonicalPath}
        pageType="article"
      />
      <div className="space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <Link to={ledgerPath} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-700"><ArrowLeft size={14} /> {ticker} forecast ledger</Link>
          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <EntityLogo src={entity.logo?.url} alt={entity.logo?.alt || `${entity.canonicalName} logo`} className="size-14 rounded-2xl" imageClassName="p-2" />
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600">Individual public forecast</div>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white">{ticker} · {forecast.forecaster?.displayName || forecast.forecasterLabel}</h1>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1.5"><CalendarBlank size={14} /> Generated {formatDateTime(forecast.forecastCreatedAt)}</span>
                  <span className="inline-flex items-center gap-1.5"><FileText size={14} /> Forecast {publicForecastPublicId(forecast)}</span>
                  <span className="inline-flex items-center gap-1.5"><LinkSimple size={14} /> Source tag {publicForecastSourceTag(forecast.collectionId)}</span>
                </div>
              </div>
            </div>
            {originalSource && (
              <div className="flex flex-wrap items-center gap-3">
              {assetSource && <a href={assetSource.url} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700">{assetSource.label} <span aria-hidden="true">↗</span></a>}
              <a
                href={originalSource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex shrink-0 items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-left transition hover:border-blue-300 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:hover:border-blue-700"
                aria-label={`${originalSource.label} on ${originalSource.publisherName}`}
              >
                <span>
                  <span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-blue-500">Original forecast source</span>
                  <span className="mt-0.5 block text-xs font-bold text-blue-800 dark:text-blue-200">{originalSource.publisherName} historical forecast</span>
                </span>
                <ArrowSquareOut size={17} weight="bold" className="text-blue-600 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </a>
              </div>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid lg:grid-cols-[300px_minmax(0,1fr)]">
            <aside className="border-b border-slate-200 dark:border-slate-800 lg:border-b-0 lg:border-r">
              <AdvisorCardList
                fixtures={forecasts}
                advisorCount={totalForecastCount}
                selectedDigest={forecast.receiptDigest}
                isComplete={forecasts.length >= totalForecastCount}
                onSelect={(nextForecast) => navigate(publicForecastPath(publicEntitySlug(entity), nextForecast))}
              />
            </aside>
            <div className="min-w-0 bg-[#f8fafc] p-4 dark:bg-slate-950/50 sm:p-6">
              <LoadedReceiptDetail document={receipt.document} projection={receipt.projection} embedded />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
