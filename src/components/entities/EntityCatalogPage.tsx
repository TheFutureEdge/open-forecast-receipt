"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Buildings,
  CaretDown,
  ChartLineUp,
  Coins,
  CurrencyDollar,
  Database,
  GitBranch,
  MagnifyingGlass,
} from "@phosphor-icons/react";
import { KnowledgeGraphExamples } from "../knowledge/KnowledgeGraphArchitecture";
import {
  listPublicForecastableEntities,
  listPublicForecastStatsByEntity,
  listPublicOrganizations,
} from "../../lib/library/repository";
import type { PublicEntityDirectoryItem } from "../../lib/library/types";
import type { PublicForecastEntityStats } from "../../lib/library/repository";
import { Link, navigate } from "../../lib/router";
import { publicEntityPath } from "../../lib/library/entityRoutes";

const PAGE_SIZE = 30;
const FORECAST_TARGET_QUESTION = "What is a forecast target?";
const FORECAST_TARGET_ANSWER = "A forecast target is the exact measurable outcome predicted for a governed entity. It defines the dimension, unit, cadence, and horizon—such as the percentage return of a listed security, a country's real GDP growth, or a central bank's policy rate.";

const SUBJECT_CATEGORY_ROUTES: Record<string, string> = {
  listed_security: "/entities/subjects/listed-securities",
  listed_fund_share: "/entities/subjects/funds-etfs",
  cryptoasset: "/entities/subjects/cryptoassets",
  commodity_spot: "/entities/subjects/commodities",
  currency_pair: "/entities/subjects/currency-pairs",
  market_index: "/entities/subjects/market-indices",
};

const SUBJECT_CATEGORY_LABELS: Record<string, string> = {
  listed_security: "Listed securities",
  listed_fund_share: "Funds & ETFs",
  cryptoasset: "Cryptoassets",
  commodity_spot: "Commodities",
  currency_pair: "Currency pairs",
  market_index: "Market indices",
};

export interface EntityCatalogPreset {
  key: string;
  view: "forecastable" | "context" | "all";
  title: string;
  description: string;
  metricLabel: string;
  categoryLabel?: string;
  entityTypes?: string[];
}

export const ENTITY_CATALOG_PRESETS: Record<string, EntityCatalogPreset> = {
  directory: {
    key: "directory",
    view: "all",
    title: "Browse the entity directory",
    description: "Explore forecast subjects and the corporations, funds, venues, countries, and other contextual entities connected to them in the Knowledge Graph.",
    metricLabel: "Graph entities",
  },
  "all-forecast-subjects": {
    key: "all-forecast-subjects",
    view: "forecastable",
    title: "Browse all forecast subjects",
    description: "Start with the exact market instruments and other governed subjects that can receive forecast-target bindings and forecast receipts.",
    metricLabel: "Forecast subjects",
  },
  "listed-securities": {
    key: "listed-securities",
    view: "forecastable",
    title: "Browse listed securities",
    description: "Explore separately identifiable listed shares and depositary receipts, each connected to its issuer, trading venue, and governed identifiers.",
    metricLabel: "Listed securities",
    categoryLabel: "Listed Securities",
    entityTypes: ["listed_security"],
  },
  "funds-etfs": {
    key: "funds-etfs",
    view: "forecastable",
    title: "Browse funds and ETFs",
    description: "Explore forecastable exchange-traded fund instruments separately from the investment-fund entities that issue or govern them.",
    metricLabel: "Funds & ETFs",
    categoryLabel: "Funds & ETFs",
    entityTypes: ["listed_fund_share"],
  },
  cryptoassets: {
    key: "cryptoassets",
    view: "forecastable",
    title: "Browse cryptoassets",
    description: "Explore governed cryptoasset subjects, their stable identifiers, and future relationships to networks and protocols.",
    metricLabel: "Cryptoassets",
    categoryLabel: "Cryptoassets",
    entityTypes: ["cryptoasset"],
  },
  commodities: {
    key: "commodities",
    view: "forecastable",
    title: "Browse commodities",
    description: "Explore governed commodity spot subjects and the measurable targets that may be forecast about them.",
    metricLabel: "Commodities",
    categoryLabel: "Commodities",
    entityTypes: ["commodity_spot"],
  },
  "currency-pairs": {
    key: "currency-pairs",
    view: "forecastable",
    title: "Browse currency pairs",
    description: "Explore governed foreign-exchange pairs as distinct forecast subjects with explicit base and quote currencies.",
    metricLabel: "Currency pairs",
    categoryLabel: "Currency Pairs",
    entityTypes: ["currency_pair"],
  },
  "market-indices": {
    key: "market-indices",
    view: "forecastable",
    title: "Browse market indices",
    description: "Explore governed index subjects separately from the funds and securities that may track them.",
    metricLabel: "Market indices",
    categoryLabel: "Market Indices",
    entityTypes: ["market_index"],
  },
  corporations: {
    key: "corporations",
    view: "context",
    title: "Browse corporations",
    description: "Explore issuer and operating-company entities separately from their listed securities. One corporation may connect to several market instruments.",
    metricLabel: "Corporations",
    categoryLabel: "Corporations",
    entityTypes: ["corporation"],
  },
  "investment-funds": {
    key: "investment-funds",
    view: "context",
    title: "Browse investment funds",
    description: "Explore governed investment-fund entities separately from their exchange-traded market representations.",
    metricLabel: "Investment funds",
    categoryLabel: "Investment Funds",
    entityTypes: ["investment_fund"],
  },
};

function displayIdentifier(entity: PublicEntityDirectoryItem): string {
  return entity.displayIdentifier || entity.entityId;
}

function entityTypeLabel(value: string): string {
  return value.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function EntityGlyph({ entity }: { entity: PublicEntityDirectoryItem }) {
  const type = entity.entityType;
  const Icon = type === "listed_security"
    ? Buildings
    : type === "cryptoasset"
      ? Coins
      : type === "currency_pair"
        ? CurrencyDollar
        : ChartLineUp;
  return (
    <div className="relative grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-blue-50 text-blue-700 dark:border-slate-700 dark:bg-blue-950/50 dark:text-blue-300">
      <Icon size={21} weight="duotone" aria-hidden="true" />
      {entity.logo?.url && (
        <img
          src={entity.logo.url}
          alt={entity.logo.alt || `${entity.canonicalName} logo`}
          className="absolute inset-0 size-full bg-white object-contain p-1.5 dark:bg-slate-900"
          loading="lazy"
          decoding="async"
          onError={(event) => { event.currentTarget.style.display = "none"; }}
        />
      )}
    </div>
  );
}

export interface EntityCatalogInitialData {
  entities: PublicEntityDirectoryItem[];
  forecastStats: Array<[string, PublicForecastEntityStats]>;
}

export function EntityCatalogPage({ preset, initialData }: { preset: EntityCatalogPreset; initialData?: EntityCatalogInitialData }) {
  const [entities, setEntities] = useState<PublicEntityDirectoryItem[]>(initialData?.entities || []);
  const [forecastStats, setForecastStats] = useState<Map<string, PublicForecastEntityStats>>(new Map(initialData?.forecastStats || []));
  const [queryText, setQueryText] = useState("");
  const [hasActiveForecastsOnly, setHasActiveForecastsOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"name_asc" | "forecasts_desc" | "activity_desc">("name_asc");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setEntities(initialData.entities);
      setForecastStats(new Map(initialData.forecastStats));
      setLoading(false);
      setError(null);
      return undefined;
    }
    let active = true;
    setLoading(true);
    setError(null);
    const load = preset.view === "forecastable"
      ? listPublicForecastableEntities()
      : preset.view === "context"
        ? listPublicOrganizations()
        : Promise.all([listPublicForecastableEntities(), listPublicOrganizations()]).then(([forecastable, context]) => [...forecastable, ...context]);
    Promise.all([load, listPublicForecastStatsByEntity()])
      .then(([records, stats]) => {
        if (active) {
          setEntities(records);
          setForecastStats(stats);
        }
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load the public entity catalog");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [initialData, preset.view]);

  useEffect(() => {
    setHasActiveForecastsOnly(false);
    setSortBy("name_asc");
    setQueryText("");
    setVisibleCount(PAGE_SIZE);
  }, [preset.key]);

  const scopedEntities = useMemo(
    () => preset.entityTypes?.length
      ? entities.filter((entity) => preset.entityTypes?.includes(entity.entityType))
      : entities,
    [entities, preset.entityTypes],
  );

  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entity of entities) {
      if (SUBJECT_CATEGORY_ROUTES[entity.entityType]) {
        counts.set(entity.entityType, (counts.get(entity.entityType) || 0) + 1);
      }
    }
    return [...counts.entries()].sort((left, right) => entityTypeLabel(left[0]).localeCompare(entityTypeLabel(right[0])));
  }, [entities]);

  function forecastCount(entityId: string): number {
    return forecastStats.get(entityId)?.forecastCount || 0;
  }

  function latestActivityAt(entity: PublicEntityDirectoryItem): string {
    return forecastStats.get(entity.entityId)?.latestActivityAt
      || entity.latestActivityAt
      || "";
  }

  const filtered = useMemo(() => {
    const normalized = queryText.trim().toLowerCase();
    return scopedEntities
      .filter((entity) => {
        if (hasActiveForecastsOnly && forecastCount(entity.entityId) === 0) return false;
        if (!normalized) return true;
        return [
          entity.canonicalName,
          entity.stableSlug,
          ...(entity.aliases || []),
          ...(entity.searchTerms || []),
        ].some((value) => value.toLowerCase().includes(normalized));
      })
      .sort((left, right) => {
        if (sortBy === "forecasts_desc") {
          return forecastCount(right.entityId) - forecastCount(left.entityId)
            || left.canonicalName.localeCompare(right.canonicalName);
        }
        if (sortBy === "activity_desc") {
          return latestActivityAt(right).localeCompare(latestActivityAt(left))
            || left.canonicalName.localeCompare(right.canonicalName);
        }
        return left.canonicalName.localeCompare(right.canonicalName);
      });
  }, [forecastStats, hasActiveForecastsOnly, queryText, scopedEntities, sortBy]);

  useEffect(() => setVisibleCount(PAGE_SIZE), [hasActiveForecastsOnly, queryText, sortBy]);

  if (loading) {
    return <div className="py-20 text-center text-sm text-slate-500">Loading the governed entity catalog…</div>;
  }

  if (error) {
    return <div className="py-20 text-center text-sm text-rose-600">{error}</div>;
  }

  const isAllForecastSubjects = preset.key === "all-forecast-subjects";
  const heroTitle = isAllForecastSubjects
    ? "Semantic Entity Catalog for Verifiable Forecasts"
    : preset.title;
  const activeCategory = preset.entityTypes?.length === 1 ? preset.entityTypes[0] : "all";

  return (
    <div className="space-y-5">
      {preset.view === "forecastable" && (
        <script
          type="application/ld+json"
          data-ofl-faq="forecast-target"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [{
              "@type": "Question",
              name: FORECAST_TARGET_QUESTION,
              acceptedAnswer: { "@type": "Answer", text: FORECAST_TARGET_ANSWER },
            }],
          }) }}
        />
      )}
      <section className="overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-white via-white to-blue-50 px-6 py-8 shadow-sm dark:border-blue-950 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/40 sm:px-9">
        <div className="flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 max-w-3xl xl:flex-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-blue-700 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300">
              <Database size={15} weight="fill" /> Semantic entity catalog
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">
              {heroTitle}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {preset.description}
            </p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 xl:w-[28rem] xl:shrink-0">
            <CatalogMetric value={scopedEntities.length} label={preset.metricLabel} />
            <CatalogMetric value={scopedEntities.filter((entity) => entity.relatedEntityCount > 0).length} label={preset.view === "forecastable" ? "Linked to context" : "With relationships"} />
            <CatalogMetric value={scopedEntities.filter((entity) => Boolean(entity.logo?.url)).length} label="With logos" />
            <CatalogMetric value={scopedEntities.filter((entity) => entity.sameAsCount > 0).length} label="Verified sameAs" />
          </div>
        </div>
      </section>

      {isAllForecastSubjects && <ForecastableEntityExplainer />}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {preset.view === "forecastable" && (
          <div className="border-b border-slate-200 px-5 py-5 dark:border-slate-800 sm:px-6">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600">Forecast subjects</div>
            <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950 dark:text-white">Browse {preset.categoryLabel?.toLowerCase() || "all forecast subjects"}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">The same directory, search, and filters power every forecast-subject category.</p>
          </div>
        )}
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:flex-wrap dark:border-slate-800">
          <label className="relative block flex-none" style={{ minWidth: "24rem", flexBasis: "24rem" }}>
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} aria-hidden="true" />
            <input
              value={queryText}
              onChange={(event) => setQueryText(event.target.value)}
              placeholder="Search by entity, ticker, ISIN, FIGI, or alias"
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-blue-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800"
            />
          </label>
          {preset.view === "forecastable" ? (
            <>
              <label className="relative min-w-48">
                <span className="sr-only">Filter by entity category</span>
                <select
                  value={activeCategory}
                  onChange={(event) => navigate(event.target.value === "all" ? "/entities" : SUBJECT_CATEGORY_ROUTES[event.target.value])}
                  className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 pl-3 pr-9 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="all">All categories ({entities.length})</option>
                  {categoryOptions.map(([entityType, count]) => (
                    <option key={entityType} value={entityType}>{SUBJECT_CATEGORY_LABELS[entityType] || entityTypeLabel(entityType)} ({count})</option>
                  ))}
                </select>
                <CaretDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} aria-hidden="true" />
              </label>
              <label className="relative min-w-48">
                <span className="sr-only">Sort entities</span>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
                  className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 pl-3 pr-9 text-xs font-semibold text-slate-700 outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <option value="name_asc">Name: A to Z</option>
                  <option value="forecasts_desc">Most forecasts</option>
                  <option value="activity_desc">Latest forecast activity</option>
                </select>
                <CaretDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} aria-hidden="true" />
              </label>
              <label className={`inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition-colors ${hasActiveForecastsOnly
                ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:border-blue-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}>
                <input
                  type="checkbox"
                  checked={hasActiveForecastsOnly}
                  onChange={(event) => setHasActiveForecastsOnly(event.target.checked)}
                  className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                Has Active Forecasts
              </label>
            </>
          ) : preset.categoryLabel ? (
            <div className="inline-flex h-10 items-center rounded-lg border border-blue-100 bg-blue-50 px-3 text-xs font-semibold text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
              Viewing: {preset.categoryLabel} ({scopedEntities.length})
            </div>
          ) : null}
        </div>

        <div className="border-b border-slate-100 px-5 py-2.5 text-xs text-slate-500 dark:border-slate-800">
          Showing {Math.min(filtered.length, visibleCount)} of {filtered.length} matching entities
        </div>

        <div className="grid divide-y divide-slate-100 dark:divide-slate-800 lg:grid-cols-2 lg:divide-y-0">
          {filtered.slice(0, visibleCount).map((entity, index) => (
            <Link
              key={entity.entityId}
              to={publicEntityPath(entity)}
              className={`flex min-w-0 items-center gap-3 px-5 py-4 hover:bg-blue-50/60 dark:hover:bg-blue-950/20 ${index % 2 === 0 ? "lg:border-r lg:border-slate-100 dark:lg:border-slate-800" : ""} lg:border-b lg:border-slate-100 dark:lg:border-slate-800`}
            >
              <EntityGlyph entity={entity} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-950 dark:text-white">{entity.canonicalName}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
                  <span>{displayIdentifier(entity)}</span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">{entityTypeLabel(entity.entityType)}</span>
                  <span>{entity.entityClasses?.includes("forecastable_entity")
                    ? "Forecastable entity"
                    : `${entity.relatedEntityCount} market listing${entity.relatedEntityCount === 1 ? "" : "s"}`}</span>
                </div>
              </div>
              <span
                className={`grid size-8 shrink-0 place-items-center rounded-lg border text-xs font-bold tabular-nums ${forecastCount(entity.entityId) > 0
                  ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-300"
                  : "border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500"
                }`}
                title={`${forecastCount(entity.entityId)} active forecasts`}
                aria-label={`${forecastCount(entity.entityId)} active forecasts`}
              >
                {forecastCount(entity.entityId)}
              </span>
              <ArrowRight className="shrink-0 text-slate-300" size={16} aria-hidden="true" />
            </Link>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="px-5 py-16 text-center text-sm text-slate-500">No entities match this search.</div>
        )}
        {visibleCount < filtered.length && (
          <div className="border-t border-slate-200 p-4 text-center dark:border-slate-800">
            <button
              type="button"
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
              className="rounded-lg border border-slate-200 bg-white px-5 py-2 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              Show more entities
            </button>
          </div>
        )}
      </section>

      <p className="text-xs leading-5 text-slate-500">
        Current source: the governed iPulse AI semantic catalog. Forecasts reference stable entity IDs; market listings and their underlying organizations remain separate, related records.
      </p>
    </div>
  );
}

function CatalogMetric({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-white/80 bg-white/90 px-2 py-3 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/90 sm:px-3">
      <div className="tabular-nums text-xl font-bold text-slate-950 dark:text-white">{value}</div>
      <div className="mt-0.5 text-[9px] font-bold uppercase leading-3 tracking-[0.08em] text-slate-400">{label}</div>
    </div>
  );
}

function ForecastableEntityExplainer() {
  return (
    <details className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-5 marker:hidden hover:bg-slate-50 dark:hover:bg-slate-800/60 sm:px-7 [&::-webkit-details-marker]:hidden">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
          <GitBranch size={20} weight="duotone" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600">Forecast target FAQ</div>
          <h2 className="mt-1 text-lg font-black tracking-tight text-slate-950 sm:text-xl dark:text-white">What is a Forecast Target?</h2>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">The exact measurable outcome predicted for a governed entity, including its dimension, unit, cadence, and horizon.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-300">
          <span className="hidden sm:inline">View explanation</span>
          <CaretDown className="transition-transform duration-200 group-open:rotate-180" size={18} weight="bold" aria-hidden="true" />
        </div>
      </summary>
      <div className="border-t border-slate-200 dark:border-slate-800">
        <div className="grid gap-4 bg-gradient-to-r from-slate-950 to-blue-950 px-6 py-5 text-white sm:grid-cols-[1fr_auto] sm:items-center sm:px-8">
          <p className="max-w-3xl text-sm leading-6 text-slate-300">{FORECAST_TARGET_ANSWER}</p>
          <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-xs leading-5 text-slate-200">
            <span className="font-bold text-white">Entity</span> + target + horizon
            <ArrowRight className="mx-2 inline" size={14} /> one unambiguous receipt
          </div>
        </div>
        <KnowledgeGraphExamples />
      </div>
    </details>
  );
}
