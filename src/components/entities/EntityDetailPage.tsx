"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Buildings,
  ChartLineUp,
  CheckCircle,
  Database,
  Globe,
  LinkSimple,
  SealCheck,
  UserCircle,
  UsersThree,
} from "@phosphor-icons/react";
import { getPublicEntity, listEntityCollections } from "../../lib/library/repository";
import type { PublicCollectionEntityRecord, PublicEntityRecord } from "../../lib/library/types";
import { Link, navigate } from "../../lib/router";
import { publicEntityForecastLedgerPath, publicEntityPath, publicEntitySlug, publicRelatedEntityPath, type PublicEntityRouteKind } from "../../lib/library/entityRoutes";
import { SchemaOrgTypeTag } from "../knowledge/SchemaOrgTypeTag";
import { PageSeo } from "../seo/PageSeo";
import { getPublicSiteOrigin } from "../../lib/siteOrigin";
import { EntityLogo } from "./EntityLogo";
import { EntityRelationshipGraph } from "./EntityRelationshipGraph";

function humanize(value: string): string {
  return value.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

const IDENTIFIER_LABELS: Record<string, string> = {
  ipulse_asset_id: "iPulse asset ID",
  ipulse_entity_id: "iPulse entity ID",
  ipulse_symbol: "iPulse symbol",
  ticker_symbol: "Ticker symbol",
  ticker_venue: "Ticker and venue",
  ticker_mic: "Ticker and MIC",
  isin: "ISIN",
  figi: "FIGI",
  cusip: "CUSIP",
  mic: "MIC (ISO 10383)",
  operating_mic: "Operating MIC",
  wikidata: "Wikidata ID",
  google_knowledge_graph_mid: "Google Knowledge Graph MID",
  official_website: "Official website",
};

function identifierLabel(value: string): string {
  return IDENTIFIER_LABELS[value] || humanize(value);
}

function formatCount(value?: number): string | null {
  return typeof value === "number" && Number.isFinite(value) ? new Intl.NumberFormat("en").format(value) : null;
}

function identifierValue(entity: PublicEntityRecord, schemes: string[]): string | undefined {
  return entity.externalIdentifiers?.find((identifier) => schemes.includes(identifier.scheme))?.value;
}

function tickerFromEntity(entity: PublicEntityRecord): string | undefined {
  return identifierValue(entity, ["ticker_symbol", "ticker_mic", "ticker_venue", "ipulse_symbol"])?.split(/[:.]/, 1)[0]?.toUpperCase();
}

function venueFromEntity(entity: PublicEntityRecord): { label?: string; mic?: string } {
  const tickerVenue = identifierValue(entity, ["ticker_venue"]);
  const venue = tickerVenue?.includes(":") ? tickerVenue.split(":").at(-1) : undefined;
  return { label: venue, mic: identifierValue(entity, ["mic", "operating_mic"]) };
}

export interface EntityDetailInitialData {
  entity: PublicEntityRecord | null;
  collections: PublicCollectionEntityRecord[];
  relatedForecastCounts: Array<[string, number]>;
}

export function EntityDetailPage({ routeKey, routeKind, initialData }: { routeKey: string; routeKind?: PublicEntityRouteKind; initialData?: EntityDetailInitialData }) {
  const [entity, setEntity] = useState<PublicEntityRecord | null>(initialData?.entity || null);
  const [collections, setCollections] = useState<PublicCollectionEntityRecord[]>(initialData?.collections || []);
  const [forecastCounts, setForecastCounts] = useState<Map<string, number>>(new Map(initialData?.relatedForecastCounts || []));
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  useEffect(() => {
    if (initialData) {
      setEntity(initialData.entity);
      setCollections(initialData.collections);
      setForecastCounts(new Map(initialData.relatedForecastCounts));
      setDescriptionExpanded(false);
      setLoading(false);
      setError(null);
      return undefined;
    }
    let active = true;
    setLoading(true);
    setError(null);
    setEntity(null);
    setCollections([]);
    setForecastCounts(new Map());
    setDescriptionExpanded(false);
    getPublicEntity(routeKey, routeKind)
      .then(async (record) => {
        if (!active) return;
        setEntity(record);
        setLoading(false);
        if (record) {
          const relatedForecastableEntities = (record.relatedEntities || []).filter((related) => related.predicate === "has_market_representation");
          const [entityCollections, relatedCollections] = await Promise.all([
            listEntityCollections(record.entityId),
            Promise.all(relatedForecastableEntities.map(async (related) => ({
              entityId: related.entityId,
              collections: await listEntityCollections(related.entityId),
            }))),
          ]);
          if (!active) return;
          setCollections(entityCollections);
          setForecastCounts(new Map(relatedCollections.map(({ entityId, collections: records }) => [
            entityId,
            records.reduce((total, collectionRecord) => total + (collectionRecord.loadedCount ?? collectionRecord.advisorCount ?? 0), 0),
          ])));
        }
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "Unable to load this entity");
          setLoading(false);
        }
      });
    return () => { active = false; };
  }, [initialData, routeKey, routeKind]);

  useEffect(() => {
    if (!entity) return;
    if (![entity.stableSlug, entity.publicSlug, publicEntitySlug(entity), entity.entityId].includes(routeKey)) return;
    const canonicalPath = publicEntityPath(entity);
    if (!routeKind || !window.location.pathname.endsWith(canonicalPath)) navigate(canonicalPath, { replace: true });
  }, [entity, routeKey, routeKind]);

  const jsonLd = useMemo(() => {
    if (!entity) return null;
    const tickerSymbols = (entity.relatedEntities || [])
      .filter((related) => related.predicate === "has_market_representation" && related.schemaTickerSymbol)
      .map((related) => related.schemaTickerSymbol);
    return {
      "@context": "https://schema.org",
      "@id": `${getPublicSiteOrigin()}${publicEntityPath(entity)}`,
      "@type": entity.schemaOrgTypes[0] || "Thing",
      additionalType: entity.entityClasses?.includes("forecastable_entity")
        ? `https://ipulseai.com/standards/semantic-entities/v0.1#${humanize(entity.entityType).replaceAll(" ", "")}`
        : undefined,
      name: entity.canonicalName,
      description: entity.description,
      url: entity.profile?.officialWebsiteUrl,
      logo: entity.logo?.url,
      sameAs: entity.sameAs || [],
      tickerSymbol: tickerSymbols.length === 1 ? tickerSymbols[0] : tickerSymbols,
      numberOfEmployees: entity.profile?.fullTimeEmployees
        ? { "@type": "QuantitativeValue", value: entity.profile.fullTimeEmployees }
        : undefined,
      employee: entity.profile?.chiefExecutiveName
        ? { "@type": "Person", name: entity.profile.chiefExecutiveName, jobTitle: "Chief Executive Officer" }
        : undefined,
      identifier: (entity.externalIdentifiers || []).map((identifier) => ({
        "@type": "PropertyValue",
        propertyID: identifier.scheme,
        value: identifier.value,
      })),
    };
  }, [entity]);

  if (loading) return <div className="py-20 text-center text-sm text-slate-500">Loading entity…</div>;
  if (!entity || error) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-xl font-semibold">Entity not found</h1>
        <p className="mt-2 text-sm text-slate-500">{error || "This entity is not available in the public catalog."}</p>
        <Link to="/entities" className="mt-5 inline-block text-sm font-semibold text-blue-600">Back to entities</Link>
      </div>
    );
  }

  const category = entity.classifications.find((item) => item.scheme === "ipulse-subject-category")?.code;
  const identifiers = entity.externalIdentifiers || [];
  const isListedSecurity = entity.entityType === "listed_security" || entity.entityClasses?.includes("forecastable_entity");
  const ticker = tickerFromEntity(entity);
  const venue = venueFromEntity(entity);
  const underlyingOrganization = (entity.relatedEntities || []).find((related) => related.predicate === "is_market_representation_of");
  const relatedForecastEntities = (entity.relatedEntities || [])
    .filter((related) => related.predicate === "has_market_representation" && (forecastCounts.get(related.entityId) || 0) > 0)
    .map((related) => ({ related, forecastCount: forecastCounts.get(related.entityId) || 0 }));
  const publishedForecastCount = collections.reduce((total, record) => total + record.loadedCount, 0);
  const missingSemanticIdentifiers = entity.entityClasses?.includes("fundamental_entity")
    ? ["wikidata", "google_knowledge_graph_mid"].filter((scheme) => !identifiers.some((identifier) => identifier.scheme === scheme))
    : [];

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          data-ofl-entity={entity.entityId}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <PageSeo
        title={isListedSecurity && ticker
          ? `${ticker} — ${entity.canonicalName} Listed Security Forecasts | Forecast Library`
          : `${entity.canonicalName} Organization Profile | Forecast Library`}
        description={entity.description || `Inspect ${entity.canonicalName}, its stable identifiers, semantic type, relationships, and linked public forecast collections.`}
        canonicalPath={publicEntityPath(entity)}
        pageType="profile"
      />
      <div className="space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
          <Link to="/entities" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-700">
            <ArrowLeft size={14} /> Entity catalog
          </Link>
          <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 flex-1 gap-4">
              <EntityLogo src={entity.logo?.url} alt={entity.logo?.alt || `${entity.canonicalName} logo`} className="size-16 rounded-2xl" imageClassName="p-2" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-600">
                  {isListedSecurity ? <ChartLineUp size={15} weight="fill" /> : <Database size={15} weight="fill" />}
                  {isListedSecurity ? "Listed security · Forecastable entity" : `${humanize(entity.entityType)} · Context entity`}
                  <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Published</span>
                </div>
                <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">
                  {isListedSecurity && ticker ? `${ticker} — ${entity.canonicalName} listed security` : entity.canonicalName}
                </h1>
                {isListedSecurity && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
                    {ticker && <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-mono dark:bg-slate-800">Ticker: {ticker}</span>}
                    {venue.label && <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 dark:bg-slate-800">Exchange: {venue.label}</span>}
                    {venue.mic && <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-mono dark:bg-slate-800">MIC: {venue.mic}</span>}
                  </div>
                )}
                <p className={`mt-2 max-w-4xl text-sm leading-6 text-slate-600 dark:text-slate-300 ${descriptionExpanded ? "" : "line-clamp-3"}`}>
                  {entity.description || "A forecastable entity from the governed iPulse AI catalog."}
                </p>
                {(entity.description?.length || 0) > 260 && (
                  <button type="button" onClick={() => setDescriptionExpanded((expanded) => !expanded)} className="mt-1 text-xs font-semibold text-blue-600 hover:underline">
                    {descriptionExpanded ? "Show less" : "… Read more"}
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge>{humanize(entity.entityType)}</Badge>
              {category && isListedSecurity && <Badge>{humanize(category)}</Badge>}
            </div>
          </div>

          {isListedSecurity && underlyingOrganization && (
            <div className="mt-5 flex flex-col gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-950 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100 sm:flex-row sm:items-center sm:justify-between">
              <p><strong>This page is the listed security, not the company.</strong> Forecasts here apply to this specific market instrument.</p>
              <Link to={publicRelatedEntityPath(underlyingOrganization)} className="inline-flex shrink-0 items-center gap-1.5 font-bold text-blue-700 hover:underline dark:text-blue-300">
                View {underlyingOrganization.canonicalName} <ArrowRight size={14} weight="bold" />
              </Link>
            </div>
          )}

          {entity.profile && (
            <div className="mt-6 border-t border-slate-200 pt-5 dark:border-slate-800">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400"><Buildings size={15} weight="duotone" /> Organization profile</div>
              <dl className="mt-3 grid gap-x-6 gap-y-3 text-xs sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
                {entity.profile.chiefExecutiveName && <KeyValue label="Chief executive" value={entity.profile.chiefExecutiveName} icon={<UserCircle size={14} />} />}
                {formatCount(entity.profile.fullTimeEmployees) && <KeyValue label="Employees" value={formatCount(entity.profile.fullTimeEmployees) || ""} icon={<UsersThree size={14} />} />}
                {entity.profile.sector && <KeyValue label="Sector" value={entity.profile.sector} />}
                {entity.profile.industry && <KeyValue label="Industry" value={entity.profile.industry} />}
                {entity.profile.countryCode && <KeyValue label="Country" value={entity.profile.countryCode} />}
                {entity.profile.ipoDate && <KeyValue label="IPO date" value={entity.profile.ipoDate} />}
              </dl>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                {entity.profile.officialWebsiteUrl && (
                  <a href={entity.profile.officialWebsiteUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline">
                    <Globe size={15} /> Official website <LinkSimple size={12} />
                  </a>
                )}
                {(entity.profile.observedAt || entity.profile.sourceUpdatedAt) && (
                  <p className="text-[10px] leading-4 text-slate-400">Profile observed {entity.profile.observedAt || entity.profile.sourceUpdatedAt} via {entity.profile.sourceProvider || "the governed source pipeline"}.</p>
                )}
              </div>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm dark:border-blue-900 dark:bg-slate-900">
          <div className="grid gap-5 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-5 dark:from-blue-950/40 dark:via-slate-900 dark:to-indigo-950/30 sm:p-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="flex min-w-0 items-start gap-4">
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-200 dark:shadow-none">
                <ChartLineUp size={25} weight="duotone" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-700 dark:text-blue-300">
                  <SealCheck size={15} weight="duotone" /> Published forecasts
                  {publishedForecastCount > 0 && <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">Available now</span>}
                </div>
                <h2 className="mt-2 text-xl font-black tracking-tight text-slate-950 dark:text-white sm:text-2xl">
                  {publishedForecastCount > 0
                    ? `${publishedForecastCount} public forecasts for ${isListedSecurity && ticker ? `${ticker} listed security` : entity.canonicalName}`
                    : relatedForecastEntities.length > 0
                      ? `Forecasts are available for ${entity.canonicalName}'s listed securities`
                    : `Forecasts for ${entity.canonicalName}`}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {publishedForecastCount > 0
                    ? "Compare every forecaster, inspect each forecast path, open its receipt, and check whether an independent blockchain proof is available."
                    : relatedForecastEntities.length > 0
                      ? "A corporation provides context; forecasts attach to the exact market security and forecast target. Choose a related security below."
                    : "This governed entity is ready for forecast-target bindings, but no public forecast collection is linked yet."}
                </p>
              </div>
            </div>
            {publishedForecastCount > 0 && (
              <div className="rounded-2xl border border-blue-100 bg-white px-5 py-4 text-center shadow-sm dark:border-blue-900 dark:bg-slate-950/60">
                <div className="text-3xl font-black tracking-tight text-blue-700 dark:text-blue-300">{publishedForecastCount}</div>
                <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">Forecast receipts</div>
              </div>
            )}
          </div>
          {(collections.length > 0 || relatedForecastEntities.length > 0) && (
            <div className="grid gap-3 border-t border-blue-100 bg-blue-50/60 p-4 dark:border-blue-900 dark:bg-blue-950/20 sm:p-5">
              {collections.length > 0 && (
                <Link
                  to={publicEntityForecastLedgerPath(publicEntitySlug(entity))}
                  className="group flex flex-col gap-4 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-blue-900 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-950 dark:text-white">{ticker || entity.canonicalName} forecast ledger</div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>{publishedForecastCount} individual forecast receipts</span>
                      <span>{collections.length} optional publication {collections.length === 1 ? "set" : "sets"}</span>
                      <span>Generation time and forecaster shown per forecast</span>
                    </div>
                  </div>
                  <span className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition group-hover:bg-blue-700">
                    Open all {publishedForecastCount} forecasts <ArrowRight size={15} weight="bold" />
                  </span>
                </Link>
              )}
              {collections.length === 0 && relatedForecastEntities.map(({ related, forecastCount }) => (
                <Link
                  key={related.entityId}
                  to={publicRelatedEntityPath(related)}
                  className="group flex flex-col gap-4 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:border-blue-900 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <EntityLogo src={related.logoUrl} alt={`${related.canonicalName} logo`} className="size-11" imageClassName="p-1.5" />
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-950 dark:text-white">{related.displayIdentifier || related.canonicalName}</div>
                      <div className="mt-1 text-xs text-slate-500">{related.canonicalName} · listed security · {forecastCount} forecast receipts</div>
                    </div>
                  </div>
                  <span className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white transition group-hover:bg-blue-700">
                    View security and forecasts <ArrowRight size={15} weight="bold" />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
            <h2 className="text-sm font-semibold text-slate-950 dark:text-white">Identifiers &amp; semantic identity</h2>
            <p className="mt-1 text-xs text-slate-500">External identifiers, stable Library identity, and semantic-web assertions describe the same governed entity.</p>
          </div>
          <div className="grid lg:grid-cols-[1.15fr_0.85fr]">
            <div className="min-w-0 lg:border-r lg:border-slate-200 dark:lg:border-slate-800">
              <div className="px-5 pt-4 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">External and market identifiers</div>
              <dl className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
                {identifiers.map((identifier) => (
                  <div key={`${identifier.scheme}-${identifier.value}`} className="grid gap-1 px-5 py-3 sm:grid-cols-[180px_1fr]">
                    <dt className="text-xs font-semibold text-slate-500">{identifierLabel(identifier.scheme)}</dt>
                    <dd className="min-w-0 break-all font-mono text-xs text-slate-800 dark:text-slate-200">
                      {identifier.canonicalUri ? (
                        <a href={identifier.canonicalUri} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                          {identifier.value} <LinkSimple size={12} />
                        </a>
                      ) : identifier.value}
                    </dd>
                  </div>
                ))}
                {missingSemanticIdentifiers.map((scheme) => (
                  <div key={`missing-${scheme}`} className="grid gap-1 px-5 py-3 sm:grid-cols-[180px_1fr]">
                    <dt className="text-xs font-semibold text-slate-500">{identifierLabel(scheme)}</dt>
                    <dd className="text-xs font-medium text-amber-700 dark:text-amber-300">No verified external match</dd>
                  </div>
                ))}
              </dl>
            </div>
            <aside className="p-5 sm:p-6">
              <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Stable semantic identity</div>
              <dl className="mt-4 space-y-3 text-xs">
                <KeyValue label="Entity ID" value={entity.entityId} mono />
                <KeyValue label="Version ID" value={entity.currentVersionId} mono />
                <div>
                  <dt className="text-slate-400">Semantic web type</dt>
                  <dd className="mt-1.5 flex flex-wrap gap-1.5">
                    {(entity.schemaOrgTypes.length > 0 ? entity.schemaOrgTypes : ["Thing"]).map((schemaOrgType) => (
                      <SchemaOrgTypeTag key={schemaOrgType} value={schemaOrgType} />
                    ))}
                  </dd>
                </div>
                <KeyValue label="Source" value={entity.source?.system || "Forecast Library"} />
              </dl>
              {(entity.sameAs || []).length > 0 && (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                  <div className="flex items-center gap-2 font-semibold"><CheckCircle size={16} weight="fill" /> Verified exact identity</div>
                  {(entity.sameAs || []).map((uri) => <a key={uri} href={uri} target="_blank" rel="noreferrer" className="mt-1 block break-all underline">{uri}</a>)}
                </div>
              )}
            </aside>
          </div>
          {missingSemanticIdentifiers.length > 0 && (
            <div className="border-t border-amber-200 bg-amber-50 px-5 py-3 text-xs leading-5 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              The latest governed identity review did not find an exact external match that met the evidence threshold. Forecast Library does not guess identity links.
            </div>
          )}
        </section>

        {(entity.relatedEntities || []).length > 0 && <EntityRelationshipGraph entity={entity} />}

        {entity.entityClasses?.includes("forecastable_entity") && !(entity.relatedEntities || []).some((related) => related.predicate === "is_market_representation_of") && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            The listing is forecastable, but its separate organization identity has not yet passed the governed mapping review. Wikidata and Google Knowledge Graph identifiers belong on that organization record rather than being copied onto the security.
          </section>
        )}

      </div>
    </>
  );
}

function Badge({ children }: { children: string }) {
  return <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{children}</span>;
}

function KeyValue({ label, value, mono = false, icon }: { label: string; value: string; mono?: boolean; icon?: ReactNode }) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-slate-400">{icon}{label}</dt>
      <dd className={`mt-0.5 break-all text-slate-800 dark:text-slate-200 ${mono ? "font-mono text-[10px]" : "font-medium"}`}>{value}</dd>
    </div>
  );
}
