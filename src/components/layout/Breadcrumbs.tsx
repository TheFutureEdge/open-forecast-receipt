import { Link, useLocation } from "../../lib/router";
import {
  parseEntityDetailPath,
  parseEntityForecastCollectionPath,
  parseEntityForecastLedgerPath,
  parseEntityForecastSetPath,
  parsePublicForecastPath,
} from "../../lib/library/entityRoutes";

interface BreadcrumbSegment {
  label: string;
  path?: string;
}

const labelMap: Record<string, string> = {
  forecasts: "Forecasts",
  forecasters: "Forecasters",
  organizations: "Organizations",
  entities: "Entities",
  directory: "Entity Directory",
  subjects: "Forecast Subjects",
  context: "Context Entities",
  "listed-securities": "Listed Securities",
  "funds-etfs": "Funds & ETFs",
  cryptoassets: "Cryptoassets",
  commodities: "Commodities",
  "currency-pairs": "Currency Pairs",
  "market-indices": "Market Indices",
  macroeconomics: "Macroeconomics",
  corporations: "Corporations",
  "investment-funds": "Investment Funds",
  countries: "Countries & Economies",
  "markets-venues": "Markets & Venues",
  "networks-protocols": "Networks & Protocols",
  manifest: "Forecasts",
  "forecast-sets": "Publication Sets",
  assets: "Assets",
  pepsi: "PepsiCo",
  nvidia: "NVIDIA",
  bitcoin: "Bitcoin",
  alphabet: "Alphabet",
  spy: "SPY",
  receipts: "Receipt",
  standards: "Standards",
  test: "Integrity Test",
  "integrity-test": "Integrity Test",
};

function getLabel(segment: string): string {
  if (/^\d{4}-\d{2}-\d{2}-sb\d+$/i.test(segment)) {
    const [date, sourceBatch] = [segment.slice(0, 10), segment.slice(11).toUpperCase()];
    return `${new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`))} · ${sourceBatch}`;
  }
  if (/^\d{4}-\d{2}-\d{2}t\d{2}-\d{2}-\d{2}z$/i.test(segment)) {
    return segment.slice(0, 10);
  }
  if (/^[0-9a-f]{12}$/i.test(segment)) return `Receipt ${segment}`;
  if (/^f-[0-9a-z]+$/i.test(segment)) return "Forecast";
  return labelMap[segment] ?? humanizePublicSlug(segment);
}

function humanizePublicSlug(value: string): string {
  return value.split("-").map((part) => {
    if (/^\d+[a-z]$/i.test(part)) return `${part.slice(0, -1)}${part.slice(-1).toUpperCase()}`;
    if (part.length <= 4 && /^[a-z]+$/i.test(part)) return part.toUpperCase();
    return part.charAt(0).toUpperCase() + part.slice(1);
  }).join(" ");
}

function humanizeForecasterSlug(value: string): string {
  return value.split("-").map((part) => {
    if (part.toLowerCase() === "ai") return "AI";
    if (/^\d+$/.test(part)) return part;
    return part.charAt(0).toUpperCase() + part.slice(1);
  }).join(" ");
}

function initialEntityLabel(pathname: string): string | null {
  const nestedForecast = parsePublicForecastPath(pathname)
    || parseEntityForecastSetPath(pathname)
    || parseEntityForecastLedgerPath(pathname)
    || parseEntityForecastCollectionPath(pathname);
  if (nestedForecast) return nestedForecast.routeSlug.split("-").at(-1)?.toUpperCase() || nestedForecast.routeSlug;
  const detail = parseEntityDetailPath(pathname);
  if (!detail) return null;
  if (detail.routeKind === "listed-securities") {
    return detail.routeKey.split("-").at(-1)?.toUpperCase() || detail.routeKey;
  }
  return humanizePublicSlug(detail.routeKey);
}

function isNavigableBreadcrumb(path: string): boolean {
  return (
    path === "/standards"
    || path === "/how-it-works"
    || path === "/integrity-test"
    || path === "/test"
    || path === "/entities"
    || path === "/entities/directory"
    || path === "/entities/organizations"
    || path === "/entities/forecasters"
    || /^\/entities\/(listed-securities|corporations|investment-funds|organizations)\/[^/]+$/.test(path)
    || /^\/entities\/listed-securities\/[^/]+\/forecasts$/.test(path)
    || /^\/entities\/listed-securities\/[^/]+\/forecast-sets\/[^/]+$/.test(path)
    || /^\/entities\/listed-securities\/[^/]+\/forecasts\/[^/]+\/[^/]+\/[^/]+$/.test(path)
    || /^\/entities\/(subjects|context)\/[^/]+$/.test(path)
    || (
      /^\/entities\/[^/]+$/.test(path)
      && !["/entities/subjects", "/entities/context", "/entities/directory", "/entities/organizations", "/entities/forecasters"].includes(path)
    )
    || path === "/forecasts"
    || path === "/forecasters"
    || /^\/forecasters\/[^/]+$/.test(path)
    || path === "/targets"
    || /^\/targets\/[^/]+$/.test(path)
    || path === "/publishers"
    || /^\/publishers\/[^/]+$/.test(path)
    || path === "/collections"
    || /^\/collections\/[^/]+\/[^/]+$/.test(path)
    || /^\/manifest\/[^/]+$/.test(path)
    || /^\/manifest\/[^/]+\/assets\/[^/]+$/.test(path)
    || /^\/receipts\/[0-9a-fA-F]{64}$/.test(path)
  );
}

export function Breadcrumbs() {
  const location = useLocation();

  if (location.pathname === "/") return null;

  const segments = location.pathname.split("/").filter(Boolean);
  const crumbs: BreadcrumbSegment[] = [{ label: "Home", path: "/" }];
  const entityLabel = initialEntityLabel(location.pathname);
  const nestedForecast = parsePublicForecastPath(location.pathname)
    || parseEntityForecastSetPath(location.pathname)
    || parseEntityForecastLedgerPath(location.pathname)
    || parseEntityForecastCollectionPath(location.pathname);
  const entityRouteSegment = nestedForecast?.routeSlug
    || parseEntityDetailPath(location.pathname)?.routeKey;

  let current = "";
  for (const seg of segments) {
    current += `/${seg}`;
    const navigablePath = isNavigableBreadcrumb(current) ? current : undefined;
    crumbs.push({
      label: entityLabel && seg === entityRouteSegment
        ? entityLabel
        : seg === parsePublicForecastPath(location.pathname)?.forecasterSlug
          ? humanizeForecasterSlug(seg)
          : getLabel(seg),
      path: navigablePath,
    });
  }

  return (
    <nav className="py-2.5" aria-label="Breadcrumb">
      <ol className="flex items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500">
        {crumbs.map((crumb, i) => (
          <li key={`${crumb.path ?? i}-${crumb.label}`} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-slate-300 dark:text-slate-700">/</span>}
            {crumb.path && i < crumbs.length - 1 ? (
              <Link to={crumb.path} className="transition-colors hover:text-slate-700 dark:hover:text-slate-200">
                {crumb.label}
              </Link>
            ) : (
              <span className="font-semibold text-slate-700 dark:text-slate-200">{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
