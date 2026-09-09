"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChartLineUp,
  CheckCircle,
  LinkSimple,
  Stack,
} from "@phosphor-icons/react";
import { Link, navigate } from "../../lib/router";
import {
  getPublicEntity,
  listEntityCollections,
  listLibraryForecastLedgerPage,
} from "../../lib/library/repository";
import type {
  PublicCollectionEntityRecord,
  PublicEntityRecord,
  PublicForecastRecord,
} from "../../lib/library/types";
import {
  publicEntityForecastLedgerPath,
  publicEntityForecastSetPath,
  publicEntityPath,
  publicEntitySlug,
  publicForecastPath,
  publicForecastSourceTag,
} from "../../lib/library/entityRoutes";
import { EntityLogo } from "../entities/EntityLogo";
import { PageSeo } from "../seo/PageSeo";
import { StatusBadge } from "../common/StatusBadge";
import { publicForecasterClass } from "../../lib/forecasters/presentation";

interface ForecastGroup {
  membership: PublicCollectionEntityRecord;
  forecasts: PublicForecastRecord[];
}

const TABLE_PAGE_SIZE = 25;

function identifierValue(entity: PublicEntityRecord, schemes: string[]): string | undefined {
  return entity.externalIdentifiers?.find((identifier) => schemes.includes(identifier.scheme))?.value;
}

function tickerFromEntity(entity: PublicEntityRecord): string {
  return identifierValue(entity, ["ticker_symbol", "ticker_mic", "ticker_venue", "ipulse_symbol"])
    ?.split(/[:.]/, 1)[0]
    ?.toUpperCase() || entity.canonicalName;
}

function humanize(value: string): string {
  return value.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(date);
}

function formatTableDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatTableTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(date);
}

function firstGenerationTime(forecasts: PublicForecastRecord[]): string | undefined {
  return forecasts.map((forecast) => forecast.forecastCreatedAt).filter(Boolean).sort()[0];
}

export interface EntityForecastLedgerInitialData {
  catalogGenerationId?: string | null;
  entity: PublicEntityRecord | null;
  memberships: PublicCollectionEntityRecord[];
  forecasts: PublicForecastRecord[];
  totalForecastCount: number;
  nextBeforePartNumber?: number;
  hasOlderParts: boolean;
}

export function EntityForecastLedgerPage({ routeSlug, initialData }: { routeSlug: string; initialData?: EntityForecastLedgerInitialData }) {
  const [catalogGenerationId, setCatalogGenerationId] = useState<string | null | undefined>(initialData ? initialData.catalogGenerationId ?? null : undefined);
  const [entity, setEntity] = useState<PublicEntityRecord | null>(initialData?.entity || null);
  const [memberships, setMemberships] = useState<PublicCollectionEntityRecord[]>(initialData?.memberships || []);
  const [forecastRecords, setForecastRecords] = useState<PublicForecastRecord[]>(initialData?.forecasts || []);
  const [forecastTotalCount, setForecastTotalCount] = useState(initialData?.totalForecastCount || 0);
  const [nextBeforePartNumber, setNextBeforePartNumber] = useState<number | undefined>(initialData?.nextBeforePartNumber);
  const [hasOlderCatalogParts, setHasOlderCatalogParts] = useState(initialData?.hasOlderParts || false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [tablePage, setTablePage] = useState(0);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setCatalogGenerationId(initialData.catalogGenerationId ?? null);
      setEntity(initialData.entity);
      setMemberships(initialData.memberships);
      setForecastRecords(initialData.forecasts);
      setForecastTotalCount(initialData.totalForecastCount);
      setNextBeforePartNumber(initialData.nextBeforePartNumber);
      setHasOlderCatalogParts(initialData.hasOlderParts);
      setTablePage(0);
      setLoading(false);
      setError(null);
      return undefined;
    }
    let active = true;
    setLoading(true);
    setError(null);
    setEntity(null);
    setMemberships([]);
    setForecastRecords([]);
    setForecastTotalCount(0);
    setNextBeforePartNumber(undefined);
    setHasOlderCatalogParts(false);
    setTablePage(0);

    getPublicEntity(routeSlug, "listed-securities")
      .then(async (record) => {
        if (!record) return { record: null, memberships: [] as PublicCollectionEntityRecord[], forecasts: [] as PublicForecastRecord[] };
        const [loadedMemberships, ledgerPage] = await Promise.all([
          listEntityCollections(record.entityId),
          listLibraryForecastLedgerPage(record.entityId),
        ]);
        return { record, memberships: loadedMemberships, ledgerPage };
      })
      .then((result) => {
        if (!active) return;
        const { record, memberships: loadedMemberships } = result;
        setEntity(record);
        setMemberships(loadedMemberships);
        if ("ledgerPage" in result && result.ledgerPage) {
          setForecastRecords(result.ledgerPage.forecasts);
          setForecastTotalCount(result.ledgerPage.totalForecastCount);
          setCatalogGenerationId(result.ledgerPage.catalogGenerationId);
          setNextBeforePartNumber(result.ledgerPage.nextBeforePartNumber);
          setHasOlderCatalogParts(result.ledgerPage.hasOlderParts);
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load the forecast ledger");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [initialData, routeSlug]);

  useEffect(() => {
    if (!entity) return;
    const canonicalPath = publicEntityForecastLedgerPath(publicEntitySlug(entity));
    if (window.location.pathname !== canonicalPath) navigate(canonicalPath, { replace: true });
  }, [entity]);

  const groups = useMemo<ForecastGroup[]>(() => memberships
    .map((membership) => ({
      membership,
      forecasts: forecastRecords.filter((forecast) => forecast.collectionId === membership.collectionId),
    }))
    .filter((group) => group.forecasts.length > 0), [forecastRecords, memberships]);

  const forecasts = useMemo(() => forecastRecords
    .map((forecast) => ({
      forecast,
      membership: memberships.find((membership) => membership.collectionId === forecast.collectionId),
    }))
    .sort((left, right) => right.forecast.forecastCreatedAt.localeCompare(left.forecast.forecastCreatedAt)
      || left.forecast.sortOrder - right.forecast.sortOrder), [forecastRecords, memberships]);

  const tablePageCount = Math.max(1, Math.ceil(forecasts.length / TABLE_PAGE_SIZE));
  const visibleForecasts = forecasts.slice(tablePage * TABLE_PAGE_SIZE, (tablePage + 1) * TABLE_PAGE_SIZE);

  async function loadOlderCatalogParts() {
    if (!entity || !hasOlderCatalogParts || nextBeforePartNumber === undefined || loadingOlder) return;
    setLoadingOlder(true);
    try {
      const page = await listLibraryForecastLedgerPage(entity.entityId, nextBeforePartNumber, catalogGenerationId);
      setForecastRecords((current) => {
        const records = new Map(current.map((forecast) => [forecast.receiptDigest || forecast.forecastId, forecast]));
        for (const forecast of page.forecasts) records.set(forecast.receiptDigest || forecast.forecastId, forecast);
        return [...records.values()];
      });
      setForecastTotalCount((current) => Math.max(current, page.totalForecastCount));
      setNextBeforePartNumber(page.nextBeforePartNumber);
      setHasOlderCatalogParts(page.hasOlderParts);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load older forecast catalog parts");
    } finally {
      setLoadingOlder(false);
    }
  }

  if (loading) return <div className="py-20 text-center text-sm text-slate-500">Loading forecast ledger…</div>;
  if (!entity || error) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-white">Forecast ledger not found</h1>
        <p className="mt-2 text-sm text-slate-500">{error || "This listed security is not available."}</p>
        <Link to="/entities" className="mt-4 inline-flex text-sm font-semibold text-blue-600 hover:underline">Back to forecast subjects</Link>
      </div>
    );
  }

  const entitySlug = publicEntitySlug(entity);
  const ticker = tickerFromEntity(entity);
  const verifiedCount = forecasts.filter(({ forecast }) => forecast.chainStatus === "verified").length;

  return (
    <>
      <PageSeo
        title={`${ticker} Forecast Ledger | Forecast Library`}
        description={`Browse every public forecast for the ${ticker} listed security by generation time and forecaster, then inspect its receipt and optional blockchain proof.`}
        canonicalPath={publicEntityForecastLedgerPath(entitySlug)}
        pageType="article"
      />
      <div className="space-y-5">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6 dark:from-blue-950/40 dark:via-slate-900 dark:to-indigo-950/30 sm:p-8">
            <Link to={publicEntityPath(entity)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-700">
              <ArrowLeft size={14} /> {ticker} listed security
            </Link>
            <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <EntityLogo src={entity.logo?.url} alt={entity.logo?.alt || `${entity.canonicalName} logo`} className="size-16 rounded-2xl" imageClassName="p-2" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600"><ChartLineUp size={15} weight="fill" /> Public forecast ledger</div>
                  <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{ticker} forecast ledger</h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Every forecast is a separate record. Generation time, forecaster, and receipt key identify it; publisher batches remain optional source metadata.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Metric value={forecastTotalCount || forecasts.length} label="Forecasts" />
                <Metric value={groups.length} label="Source sets" />
                <Metric value={verifiedCount} label="Onchain" />
              </div>
            </div>
          </div>
        </section>

        {groups.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400"><Stack size={15} weight="duotone" /> Optional publication sets</div>
            <div className="mt-3 grid gap-3">
              {groups.map(({ membership, forecasts: groupForecasts }) => {
                const generatedAt = firstGenerationTime(groupForecasts);
                const sourceTag = publicForecastSourceTag(membership.collectionId);
                return (
                  <Link
                    key={membership.collectionId}
                    to={publicEntityForecastSetPath(entitySlug, membership.collectionId, generatedAt)}
                    className="group flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-blue-300 hover:bg-blue-50/60 dark:border-slate-800 dark:bg-slate-950/50 dark:hover:border-blue-800 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-950 dark:text-white">Generated {generatedAt ? formatDateTime(generatedAt) : "date not supplied"}</span>
                        <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900">Source tag: {sourceTag}</span>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{groupForecasts.length} forecasts published together by iPulse AI. The set is a browsing aid, not the identity of any forecast.</p>
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-2 text-xs font-bold text-blue-600">Open set workspace <ArrowRight size={14} weight="bold" /></span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
            <h2 className="text-lg font-black tracking-tight text-slate-950 dark:text-white">All individual forecasts</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Newest first. Individual submissions and forecasts from publication sets use the same ledger.</p>
          </div>
          {forecasts.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-slate-500">No public forecasts have been published for this listed security yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] border-collapse text-left">
                <thead className="bg-slate-50 dark:bg-slate-950/50">
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    {[
                      ["#", "w-14"],
                      ["Forecaster", "w-52"],
                      ["Type", "w-28"],
                      ["Generated", "w-40"],
                      ["Forecast horizon", "w-48"],
                      ["Target", "min-w-60"],
                      ["Receipt", "w-28"],
                      ["Blockchain proof", "w-36"],
                      ["Forecast", "w-28"],
                    ].map(([label, width]) => (
                      <th key={label} scope="col" className={`${width} px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 first:pl-6 last:pr-6`}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {visibleForecasts.map(({ forecast, membership }, index) => {
                    const horizonStartAt = forecast.horizonStartAt || forecast.forecastCreatedAt;
                    const forecastPath = publicForecastPath(entitySlug, forecast);
                    return (
                      <tr
                        key={`${forecast.collectionId}-${forecast.forecastId}-${forecast.receiptDigest}`}
                        className="group cursor-pointer align-middle transition hover:bg-blue-50/50 dark:hover:bg-blue-950/20"
                        title={`Open forecast by ${forecast.forecaster?.displayName || forecast.forecasterLabel}`}
                        onClick={(event) => {
                          if ((event.target as HTMLElement).closest("a, button, input, select, textarea")) return;
                          navigate(forecastPath);
                        }}
                      >
                        <td className="py-4 pl-6 pr-3">
                          <span className="grid size-9 place-items-center rounded-lg border border-blue-100 bg-blue-50 text-xs font-black text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">{String(tablePage * TABLE_PAGE_SIZE + index + 1).padStart(2, "0")}</span>
                        </td>
                        <td className="px-4 py-4">
                          <Link
                            to={forecastPath}
                            className="block max-w-52 truncate text-sm font-bold text-slate-950 underline-offset-2 hover:text-blue-700 hover:underline dark:text-white dark:hover:text-blue-300"
                            title={`Open forecast by ${forecast.forecaster?.displayName || forecast.forecasterLabel}`}
                            aria-label={`Open forecast by ${forecast.forecaster?.displayName || forecast.forecasterLabel}`}
                          >
                            {forecast.forecaster?.displayName || forecast.forecasterLabel}
                          </Link>
                          <div className="mt-0.5 max-w-52 truncate text-[11px] text-slate-500" title={forecast.forecaster?.implementationLabel || forecast.forecasterMode || "Implementation recorded in receipt"}>{forecast.forecaster?.implementationLabel || forecast.forecasterMode || "Implementation recorded in receipt"}</div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300">
                            {publicForecasterClass(forecast.forecaster?.type || "ai_model")}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-xs text-slate-700 dark:text-slate-200">
                          <div className="font-semibold">{formatTableDate(forecast.forecastCreatedAt)}</div>
                          <div className="mt-0.5 text-[11px] text-slate-500">{formatTableTime(forecast.forecastCreatedAt)}</div>
                        </td>
                        <td className="px-4 py-4 text-[11px] text-slate-600 dark:text-slate-300">
                          <div><span className="font-semibold text-slate-800 dark:text-slate-200">Start</span> · {formatTableDate(horizonStartAt)}</div>
                          <div className="mt-1"><span className="font-semibold text-slate-800 dark:text-slate-200">End</span> · {formatTableDate(forecast.horizonEndAt)}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-xs font-semibold leading-5 text-slate-800 dark:text-slate-200">{humanize(forecast.targetName)}</div>
                          <span className="mt-1.5 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-500 dark:bg-slate-800">{publicForecastSourceTag(membership?.collectionId)}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"><CheckCircle size={11} weight="fill" className="mr-1" />Sealed</span>
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge type="chainStatus" value={forecast.chainStatus} label={forecast.chainStatus === "verified" ? "Verified" : "Not issued"} />
                        </td>
                        <td className="py-4 pl-4 pr-6">
                          <Link to={forecastPath} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1.5 text-[11px] font-bold text-blue-600 transition hover:bg-blue-100 dark:hover:bg-blue-950/60" aria-label={`Open forecast by ${forecast.forecaster?.displayName || forecast.forecasterLabel}`}>
                            Open <ArrowRight size={15} weight="bold" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-2">
              <LinkSimple size={14} /> Showing {forecasts.length === 0 ? 0 : tablePage * TABLE_PAGE_SIZE + 1}–{Math.min((tablePage + 1) * TABLE_PAGE_SIZE, forecasts.length)} of {forecastTotalCount || forecasts.length} forecasts.
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setTablePage((page) => Math.max(0, page - 1))} disabled={tablePage === 0} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">Previous</button>
              <span className="px-1 font-semibold">Page {tablePage + 1} of {tablePageCount}</span>
              <button type="button" onClick={() => setTablePage((page) => Math.min(tablePageCount - 1, page + 1))} disabled={tablePage >= tablePageCount - 1} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">Next</button>
              {hasOlderCatalogParts && (
                <button type="button" onClick={loadOlderCatalogParts} disabled={loadingOlder} className="rounded-lg bg-blue-600 px-3 py-1.5 font-bold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">
                  {loadingOlder ? "Loading…" : "Load older forecasts"}
                </button>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-20 rounded-xl border border-white/80 bg-white px-3 py-3 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
      <div className="text-xl font-black text-slate-950 dark:text-white">{value}</div>
      <div className="mt-1 text-[8px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</div>
    </div>
  );
}
