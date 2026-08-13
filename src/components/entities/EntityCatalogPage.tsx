import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Bank,
  Buildings,
  ChartLineUp,
  Coins,
  CurrencyDollar,
  Database,
  GitBranch,
  GlobeHemisphereWest,
  MagnifyingGlass,
  TrendUp,
} from "@phosphor-icons/react";
import { listPublicForecastableEntities, listPublicOrganizations } from "../../lib/library/repository";
import type { PublicEntityRecord } from "../../lib/library/types";
import { Link } from "../../lib/router";

const PAGE_SIZE = 30;

function categoryFor(entity: PublicEntityRecord): string {
  if (entity.entityClasses?.includes("organization") || entity.entityClasses?.includes("underlying_entity")) {
    return entity.entityType;
  }
  return entity.classifications.find((item) => item.scheme === "ipulse-subject-category")?.code || "other";
}

function displayIdentifier(entity: PublicEntityRecord): string {
  if (entity.entityClasses?.includes("organization")) {
    const listings = (entity.relatedEntities || [])
      .filter((related) => related.predicate === "has_market_representation")
      .map((related) => related.displayIdentifier)
      .filter((value): value is string => Boolean(value));
    if (listings.length > 0) return `${listings.slice(0, 2).join(" · ")}${listings.length > 2 ? ` · +${listings.length - 2}` : ""}`;
  }
  const preferred = ["ticker_venue", "ipulse_symbol", "isin"];
  for (const scheme of preferred) {
    const match = (entity.externalIdentifiers || []).find((identifier) => identifier.scheme === scheme);
    if (match) return match.value;
  }
  return entity.entityId;
}

function entityTypeLabel(value: string): string {
  return value.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function EntityGlyph({ entity }: { entity: PublicEntityRecord }) {
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

export function EntityCatalogPage({ view }: { view: "forecastable" | "organizations" }) {
  const [entities, setEntities] = useState<PublicEntityRecord[]>([]);
  const [queryText, setQueryText] = useState("");
  const [category, setCategory] = useState("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = view === "forecastable" ? listPublicForecastableEntities : listPublicOrganizations;
    load()
      .then((records) => {
        if (active) setEntities(records);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load the public entity catalog");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [view]);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entity of entities) {
      const key = categoryFor(entity);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return [...counts.entries()].sort((left, right) => right[1] - left[1]);
  }, [entities]);

  const filtered = useMemo(() => {
    const normalized = queryText.trim().toLowerCase();
    return entities.filter((entity) => {
      if (category !== "all" && categoryFor(entity) !== category) return false;
      if (!normalized) return true;
      return [
        entity.canonicalName,
        entity.stableSlug,
        ...(entity.aliases || []),
        ...(entity.externalIdentifiers || []).flatMap((identifier) => [identifier.scheme, identifier.value]),
      ].some((value) => value.toLowerCase().includes(normalized));
    });
  }, [category, entities, queryText]);

  useEffect(() => setVisibleCount(PAGE_SIZE), [category, queryText]);

  if (loading) {
    return <div className="py-20 text-center text-sm text-slate-500">Loading the governed entity catalog…</div>;
  }

  if (error) {
    return <div className="py-20 text-center text-sm text-rose-600">{error}</div>;
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-white via-white to-blue-50 px-6 py-8 shadow-sm dark:border-blue-950 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/40 sm:px-9">
        <div className="flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0 max-w-3xl xl:flex-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-blue-700 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300">
              <Database size={15} weight="fill" /> Semantic entity catalog
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">
              {view === "forecastable" ? "Browse forecastable entities" : "Browse organizations"}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {view === "forecastable"
                ? "Start with the market instruments and other subjects that can receive forecasts. Each listing links to its underlying company, fund, venue, and governed identifiers."
                : "Browse companies, funds, publishers, and other organizations separately from their market listings. One organization may relate to several forecastable instruments."}
            </p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4 xl:w-[28rem] xl:shrink-0">
            <CatalogMetric value={entities.length} label={view === "forecastable" ? "Forecastable" : "Organizations"} />
            <CatalogMetric value={entities.filter((entity) => (entity.relatedEntities || []).length > 0).length} label={view === "forecastable" ? "Linked to owner" : "With listings"} />
            <CatalogMetric value={entities.filter((entity) => Boolean(entity.logo?.url)).length} label="With logos" />
            <CatalogMetric value={entities.filter((entity) => (entity.sameAs || []).length > 0).length} label="Verified sameAs" />
          </div>
        </div>
      </section>

      {view === "forecastable" && <ForecastableEntityExplainer />}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row dark:border-slate-800">
          <label className="relative block flex-1">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} aria-hidden="true" />
            <input
              value={queryText}
              onChange={(event) => setQueryText(event.target.value)}
              placeholder="Search by entity, ticker, ISIN, FIGI, or alias"
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-blue-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800"
            />
          </label>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            aria-label="Filter entities by category"
            className="h-10 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-blue-400 dark:border-slate-700 dark:bg-slate-800"
          >
            <option value="all">All {view === "forecastable" ? "forecast types" : "organization types"} ({entities.length})</option>
            {categoryCounts.map(([value, count]) => (
              <option key={value} value={value}>{entityTypeLabel(value)} ({count})</option>
            ))}
          </select>
        </div>

        <div className="border-b border-slate-100 px-5 py-2.5 text-xs text-slate-500 dark:border-slate-800">
          Showing {Math.min(filtered.length, visibleCount)} of {filtered.length} matching entities
        </div>

        <div className="grid divide-y divide-slate-100 dark:divide-slate-800 lg:grid-cols-2 lg:divide-y-0">
          {filtered.slice(0, visibleCount).map((entity, index) => (
            <Link
              key={entity.entityId}
              to={`/entities/${encodeURIComponent(entity.stableSlug)}`}
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
                    : `${(entity.relatedEntities || []).filter((related) => related.predicate === "has_market_representation").length} market listing${(entity.relatedEntities || []).filter((related) => related.predicate === "has_market_representation").length === 1 ? "" : "s"}`}</span>
                </div>
              </div>
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
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="grid gap-6 border-b border-slate-200 bg-gradient-to-r from-slate-950 to-blue-950 px-6 py-7 text-white dark:border-slate-800 sm:px-8 xl:grid-cols-[1fr_auto] xl:items-end">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-300">
            <GitBranch size={16} weight="duotone" /> How the catalog works
          </div>
          <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Context is connected. Forecasts stay precise.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            A forecastable entity is the exact, stable subject a forecast is about. It can be a listed security, benchmark rate, economic measure, market index, commodity, or another governed subject—not merely a loose company or country name.
          </p>
        </div>
        <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-xs leading-5 text-slate-200 backdrop-blur">
          <span className="font-bold text-white">Entity</span> + target + horizon
          <ArrowRight className="mx-2 inline" size={14} /> one unambiguous forecast receipt
        </div>
      </div>

      <div className="grid gap-px bg-slate-200 dark:bg-slate-800 xl:grid-cols-2">
        <RelationshipExample
          eyebrow="Live catalog example"
          icon={<Buildings size={20} weight="duotone" />}
          parentLabel="Parent organization"
          parentName="Alibaba Group Holding Ltd"
          parentHref="/entities/entity-5d88041e-30a3-5218-af25-9e66758f71c9"
          description="One company, two separately identifiable market instruments. A forecast for BABA is not silently treated as a forecast for 9988."
          children={[
            {
              name: "Alibaba ordinary shares",
              code: "9988 · Hong Kong",
              detail: "A distinct listed security",
              href: "/entities/alibaba-9988-hong-kong",
              Icon: TrendUp,
            },
            {
              name: "Alibaba ADR",
              code: "BABA · New York",
              detail: "A distinct listed security",
              href: "/entities/alibaba-baba",
              Icon: TrendUp,
            },
          ]}
        />
        <RelationshipExample
          eyebrow="Illustrative expansion"
          icon={<GlobeHemisphereWest size={20} weight="duotone" />}
          parentLabel="Context entity"
          parentName="United States"
          description="A country provides context, while each measurable economic subject receives its own identity, target definition, cadence, and forecast history."
          children={[
            {
              name: "Real GDP growth",
              code: "Quarterly · annualized %",
              detail: "Economic measure",
              Icon: ChartLineUp,
            },
            {
              name: "Federal funds target rate",
              code: "Policy rate · %",
              detail: "Benchmark rate",
              Icon: Bank,
            },
          ]}
        />
      </div>
    </section>
  );
}

interface RelationshipChild {
  name: string;
  code: string;
  detail: string;
  href?: string;
  Icon: typeof TrendUp;
}

function RelationshipExample({
  eyebrow,
  icon,
  parentLabel,
  parentName,
  parentHref,
  description,
  children,
}: {
  eyebrow: string;
  icon: ReactNode;
  parentLabel: string;
  parentName: string;
  parentHref?: string;
  description: string;
  children: RelationshipChild[];
}) {
  const parentContent = (
    <div className="flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3.5 text-left dark:border-blue-900 dark:bg-blue-950/30">
      <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-white text-blue-700 shadow-sm dark:bg-slate-900 dark:text-blue-300">{icon}</div>
      <div className="min-w-0">
        <div className="text-[9px] font-bold uppercase tracking-[0.12em] text-blue-500">{parentLabel}</div>
        <div className="mt-0.5 truncate text-sm font-bold text-slate-950 dark:text-white">{parentName}</div>
      </div>
      {parentHref && <ArrowRight className="ml-auto shrink-0 text-blue-400" size={15} />}
    </div>
  );

  return (
    <article className="bg-white p-6 dark:bg-slate-900 sm:p-7">
      <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{eyebrow}</div>
      <div className="mt-3">
        {parentHref ? <Link to={parentHref}>{parentContent}</Link> : parentContent}
      </div>
      <div className="mx-auto h-5 w-px bg-blue-200 dark:bg-blue-900" aria-hidden="true" />
      <div className="relative grid gap-2 sm:grid-cols-2 before:absolute before:-top-5 before:left-1/4 before:right-1/4 before:hidden before:h-5 before:rounded-t-xl before:border-x before:border-t before:border-blue-200 sm:before:block dark:before:border-blue-900">
        {children.map(({ name, code, detail, href, Icon }) => {
          const content = (
            <div className="relative h-full rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 transition-colors hover:border-emerald-400 dark:border-emerald-900 dark:bg-emerald-950/20">
              <div className="flex items-start gap-2.5">
                <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><Icon size={17} weight="duotone" /></div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-950 dark:text-white">{name}</div>
                  <div className="mt-0.5 text-[10px] font-semibold text-slate-600 dark:text-slate-300">{code}</div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-emerald-200/70 pt-2 text-[9px] font-bold uppercase tracking-[0.1em] text-emerald-700 dark:border-emerald-900 dark:text-emerald-300">
                <span>{detail}</span><span className="rounded-full bg-emerald-100 px-2 py-1 dark:bg-emerald-950">Forecastable</span>
              </div>
            </div>
          );
          return href ? <Link key={name} to={href}>{content}</Link> : <div key={name}>{content}</div>;
        })}
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-500">{description}</p>
    </article>
  );
}
