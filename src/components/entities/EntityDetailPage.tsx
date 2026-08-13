import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Buildings,
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
import { Link } from "../../lib/router";
import { SchemaOrgTypeTag } from "../knowledge/SchemaOrgTypeTag";
import { getPublicSiteOrigin, PageSeo } from "../seo/PageSeo";

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

export function EntityDetailPage({ routeKey }: { routeKey: string }) {
  const [entity, setEntity] = useState<PublicEntityRecord | null>(null);
  const [collections, setCollections] = useState<PublicCollectionEntityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getPublicEntity(routeKey)
      .then(async (record) => {
        if (!active) return;
        setEntity(record);
        if (record) setCollections(await listEntityCollections(record.entityId));
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load this entity");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [routeKey]);

  const jsonLd = useMemo(() => {
    if (!entity || typeof window === "undefined") return null;
    const tickerSymbols = (entity.relatedEntities || [])
      .filter((related) => related.predicate === "has_market_representation" && related.schemaTickerSymbol)
      .map((related) => related.schemaTickerSymbol);
    return {
      "@context": "https://schema.org",
      "@id": `${getPublicSiteOrigin()}/entities/${encodeURIComponent(entity.stableSlug)}`,
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

  useEffect(() => {
    if (!entity || !jsonLd) return;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.oflEntity = entity.entityId;
    script.text = JSON.stringify(jsonLd);
    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [entity, jsonLd]);

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
  const relatedFundamental = (entity.relatedEntities || []).find((related) => related.predicate === "is_market_representation_of");
  const missingSemanticIdentifiers = entity.entityClasses?.includes("fundamental_entity")
    ? ["wikidata", "google_knowledge_graph_mid"].filter((scheme) => !identifiers.some((identifier) => identifier.scheme === scheme))
    : [];

  return (
    <>
      <PageSeo
        title={`${entity.canonicalName} Forecast Entity Profile | Open Forecast Library`}
        description={entity.description || `Inspect ${entity.canonicalName}, its stable identifiers, semantic type, relationships, and linked public forecast collections.`}
        canonicalPath={`/entities/${encodeURIComponent(entity.stableSlug)}`}
        pageType="profile"
      />
      <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        <Link to="/entities" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-700">
          <ArrowLeft size={14} /> Entity catalog
        </Link>
        <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-4">
            <div className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-blue-50 text-blue-700 shadow-sm dark:border-slate-700 dark:bg-blue-950/40 dark:text-blue-300">
              <Buildings size={28} weight="duotone" aria-hidden="true" />
              {entity.logo?.url && (
                <img
                  src={entity.logo.url}
                  alt={entity.logo.alt || `${entity.canonicalName} logo`}
                  className="absolute inset-0 size-full bg-white object-contain p-2 dark:bg-slate-900"
                  onError={(event) => { event.currentTarget.style.display = "none"; }}
                />
              )}
            </div>
            <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.12em] text-blue-600">
              <Database size={15} weight="fill" /> Governed entity
              <span className="rounded-full bg-emerald-50 px-2 py-1 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">Published</span>
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{entity.canonicalName}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              {entity.description || "A forecastable entity from the governed iPulse AI catalog."}
            </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>{humanize(entity.entityType)}</Badge>
            {category && <Badge>{humanize(category)}</Badge>}
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-950 dark:text-white">Identifiers</h2>
            <p className="mt-1 text-xs text-slate-500">Aliases and market codes can change without changing the entity ID.</p>
          </div>
          <dl className="divide-y divide-slate-100 dark:divide-slate-800">
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
          {missingSemanticIdentifiers.length > 0 && (
            <div className="border-t border-amber-200 bg-amber-50 px-5 py-3 text-xs leading-5 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              The latest governed identity review did not find an exact external match that met the evidence threshold. Open Forecast Library does not guess identity links. A source website may still appear in the organization profile below without being treated as a verified <code>sameAs</code> assertion.
            </div>
          )}
          {relatedFundamental && (
            <div className="border-t border-blue-100 bg-blue-50 px-5 py-3 text-xs leading-5 text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-200">
              Wikidata, Google Knowledge Graph, official-site, and other organization identifiers are kept on the separate underlying entity. {" "}
              <Link to={`/entities/${encodeURIComponent(relatedFundamental.stableSlug)}`} className="font-semibold underline">
                View {relatedFundamental.canonicalName}
              </Link>
            </div>
          )}
        </section>

        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-sm font-semibold text-slate-950 dark:text-white">Semantic identity</h2>
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
              <KeyValue label="Source" value={entity.source?.system || "Open Forecast Library"} />
            </dl>
            {(entity.sameAs || []).length > 0 && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                <div className="flex items-center gap-2 font-semibold"><CheckCircle size={16} weight="fill" /> Verified exact identity</div>
                {(entity.sameAs || []).map((uri) => <a key={uri} href={uri} target="_blank" rel="noreferrer" className="mt-1 block break-all underline">{uri}</a>)}
              </div>
            )}
          </section>

          {entity.profile && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-white"><Buildings size={18} weight="duotone" /> Organization profile</div>
              <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {entity.profile.chiefExecutiveName && <KeyValue label="Chief executive" value={entity.profile.chiefExecutiveName} icon={<UserCircle size={14} />} />}
                {formatCount(entity.profile.fullTimeEmployees) && <KeyValue label="Employees" value={formatCount(entity.profile.fullTimeEmployees) || ""} icon={<UsersThree size={14} />} />}
                {entity.profile.sector && <KeyValue label="Sector" value={entity.profile.sector} />}
                {entity.profile.industry && <KeyValue label="Industry" value={entity.profile.industry} />}
                {entity.profile.countryCode && <KeyValue label="Country" value={entity.profile.countryCode} />}
                {entity.profile.ipoDate && <KeyValue label="IPO date" value={entity.profile.ipoDate} />}
              </dl>
              {entity.profile.officialWebsiteUrl && (
                <a href={entity.profile.officialWebsiteUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline">
                  <Globe size={15} /> Official website <LinkSimple size={12} />
                </a>
              )}
              {(entity.profile.observedAt || entity.profile.sourceUpdatedAt) && (
                <p className="mt-3 text-[10px] leading-4 text-slate-400">Profile observed {entity.profile.observedAt || entity.profile.sourceUpdatedAt} via {entity.profile.sourceProvider || "the governed source pipeline"}.</p>
              )}
            </section>
          )}

          {(entity.relatedEntities || []).length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <h2 className="text-sm font-semibold text-slate-950 dark:text-white">Related entities</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">Governed relationships keep organizations, listings, and venues distinct while making their connection explicit.</p>
              <div className="mt-3 space-y-2">
                {(entity.relatedEntities || []).map((related) => (
                  <Link key={`${related.predicate}-${related.entityId}`} to={`/entities/${encodeURIComponent(related.stableSlug)}`} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 hover:border-blue-300 hover:bg-blue-50/60 dark:border-slate-700 dark:hover:bg-blue-950/20">
                    <div className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800">
                      <Buildings size={18} weight="duotone" />
                      {related.logoUrl && <img src={related.logoUrl} alt="" className="absolute inset-0 size-full bg-white object-contain p-1 dark:bg-slate-900" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-semibold text-slate-900 dark:text-white">{related.canonicalName}</div>
                      <div className="mt-0.5 text-[10px] text-slate-500">{related.predicate === "is_market_representation_of" ? "Underlying organization or entity" : "Market listing or representation"}{related.displayIdentifier ? ` · ${related.displayIdentifier}` : ""}</div>
                    </div>
                    <ArrowRight size={14} className="text-slate-300" />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {entity.entityClasses?.includes("forecastable_entity") && !(entity.relatedEntities || []).some((related) => related.predicate === "is_market_representation_of") && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              The listing is forecastable, but its separate organization identity has not yet passed the governed mapping review. Wikidata and Google Knowledge Graph identifiers belong on that organization record rather than being copied onto the security.
            </section>
          )}

          <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950/30">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-950 dark:text-blue-100"><SealCheck size={18} weight="duotone" /> Published forecast collections</div>
            {collections.length > 0 ? (
              <div className="mt-3 space-y-2">
                {collections.map((record) => (
                  <Link key={`${record.collectionId}-${record.slug}`} to={`/showcase/${record.slug}`} className="flex items-center justify-between rounded-xl bg-white p-3 text-xs font-semibold text-blue-700 shadow-sm dark:bg-slate-900 dark:text-blue-300">
                    <span>iPulse AI · {record.loadedCount} receipts</span><ArrowRight size={14} />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs leading-5 text-blue-700 dark:text-blue-300">The entity is approved and ready to reference. No public forecast collection is linked yet.</p>
            )}
          </section>
        </div>
      </div>
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
