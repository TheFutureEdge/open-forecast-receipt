import { Link, useLocation } from "../../lib/router";

interface BreadcrumbSegment {
  label: string;
  path?: string;
}

const labelMap: Record<string, string> = {
  showcase: "Forecasts",
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
  "batch-6": "Public Forecasts",
  assets: "Assets",
  pepsi: "PepsiCo",
  nvidia: "NVIDIA",
  bitcoin: "Bitcoin",
  alphabet: "Alphabet",
  spy: "SPY",
  receipts: "Receipt",
  standards: "How it works",
  test: "Integrity Test",
};

function getLabel(segment: string): string {
  return labelMap[segment] ?? segment;
}

function isNavigableBreadcrumb(path: string): boolean {
  return (
    path === "/standards"
    || path === "/test"
    || path === "/entities"
    || path === "/entities/directory"
    || path === "/entities/organizations"
    || path === "/entities/forecasters"
    || /^\/entities\/(subjects|context)\/[^/]+$/.test(path)
    || (
      /^\/entities\/[^/]+$/.test(path)
      && !["/entities/subjects", "/entities/context", "/entities/directory", "/entities/organizations", "/entities/forecasters"].includes(path)
    )
    || path === "/forecasts"
    || path === "/forecasters"
    || path === "/showcase"
    || /^\/showcase\/[^/]+$/.test(path)
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

  let current = "";
  for (const seg of segments) {
    current += `/${seg}`;
    crumbs.push({
      label: getLabel(seg),
      path: isNavigableBreadcrumb(current) ? current : undefined,
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
