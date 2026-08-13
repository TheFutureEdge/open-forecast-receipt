import {
  BookOpenText,
  Buildings,
  ChartLineUp,
  Coins,
  CurrencyDollar,
  Database,
  EnvelopeSimple,
  Fingerprint,
  GitBranch,
  GlobeHemisphereWest,
  SealCheck,
  UsersThree,
  type Icon,
} from "@phosphor-icons/react";
import { Link, useLocation } from "../../lib/router";

interface SidebarItem {
  label: string;
  path: string;
  Icon: Icon;
  soon?: boolean;
  match?: "exact" | "entity-detail" | "forecasts" | "knowledge-graph" | "standards";
}

interface SidebarSection {
  label: string;
  items: SidebarItem[];
}

const sections: SidebarSection[] = [
  {
    label: "Knowledge Graph",
    items: [
      { label: "Overview", path: "/standards#knowledge-graph", Icon: GitBranch, match: "knowledge-graph" },
      { label: "Entity directory", path: "/entities/directory", Icon: Database, match: "entity-detail" },
    ],
  },
  {
    label: "Forecast Subjects",
    items: [
      { label: "All forecast subjects", path: "/entities", Icon: GlobeHemisphereWest, match: "exact" },
      { label: "Listed securities", path: "/entities/subjects/listed-securities", Icon: Buildings },
      { label: "Funds & ETFs", path: "/entities/subjects/funds-etfs", Icon: ChartLineUp },
      { label: "Cryptoassets", path: "/entities/subjects/cryptoassets", Icon: Coins },
      { label: "Commodities", path: "/entities/subjects/commodities", Icon: ChartLineUp },
      { label: "Currency pairs", path: "/entities/subjects/currency-pairs", Icon: CurrencyDollar },
      { label: "Market indices", path: "/entities/subjects/market-indices", Icon: ChartLineUp },
      { label: "Macroeconomics", path: "/entities/subjects/macroeconomics", Icon: GlobeHemisphereWest, soon: true },
    ],
  },
  {
    label: "Context Entities",
    items: [
      { label: "Corporations", path: "/entities/context/corporations", Icon: Buildings },
      { label: "Investment funds", path: "/entities/context/investment-funds", Icon: ChartLineUp },
      { label: "Countries & economies", path: "/entities/context/countries", Icon: GlobeHemisphereWest, soon: true },
      { label: "Markets & venues", path: "/entities/context/markets-venues", Icon: Buildings, soon: true },
      { label: "Networks & protocols", path: "/entities/context/networks-protocols", Icon: GitBranch, soon: true },
    ],
  },
  {
    label: "Forecasting",
    items: [
      { label: "Forecaster profiles", path: "/entities/forecasters", Icon: UsersThree },
      { label: "Forecast collections", path: "/forecasts", Icon: ChartLineUp, match: "forecasts" },
      { label: "PepsiCo receipt example", path: "/showcase/pepsi", Icon: SealCheck },
    ],
  },
  {
    label: "Protocol",
    items: [
      { label: "How it works", path: "/standards", Icon: BookOpenText, match: "standards" },
      { label: "Integrity test", path: "/test", Icon: Fingerprint },
    ],
  },
];

export function ProductSidebar() {
  const location = useLocation();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-slate-200 bg-white md:flex dark:border-slate-800 dark:bg-slate-900">
      <div className="flex min-w-0 flex-1 flex-col px-3 py-4">
        <Link to="/" className="mb-4 block px-2">
          <div className="text-sm font-bold tracking-tight text-slate-950 dark:text-white">Open Forecast Library</div>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-600">Built on Open Forecast Receipt</div>
        </Link>

        <nav className="min-h-0 flex-1 overflow-y-auto pr-1" aria-label="Library directory">
          {sections.map((section) => (
            <SidebarGroup key={section.label} section={section} pathname={location.pathname} hash={location.hash} />
          ))}
        </nav>

        <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3 dark:border-blue-900/70 dark:bg-blue-950/30">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-950 dark:text-blue-100"><EnvelopeSimple size={15} /> Public submissions</div>
          <p className="mt-1 text-[11px] leading-4 text-blue-700 dark:text-blue-300">
            During this phase, email <a className="font-semibold underline" href="mailto:support@ipulseai.com">support@ipulseai.com</a>.
          </p>
        </div>
      </div>
    </aside>
  );
}

function SidebarGroup({ section, pathname, hash }: { section: SidebarSection; pathname: string; hash: string }) {
  return (
    <div className="mb-4">
      <div className="mb-1 px-2 text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400">{section.label}</div>
      <div className="space-y-0.5">
        {section.items.map((item) => {
          const active = isItemActive(item, pathname, hash);
          return (
            <Link
              key={`${section.label}-${item.label}`}
              to={item.path}
              className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                active
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              }`}
            >
              <item.Icon size={15} weight={active ? "fill" : "regular"} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.soon && <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">Soon</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function isItemActive(item: SidebarItem, pathname: string, hash: string): boolean {
  const itemPathname = item.path.split("#")[0];
  if (item.match === "knowledge-graph") return pathname === "/standards" && hash === "#knowledge-graph";
  if (item.match === "standards") return pathname === "/standards" && hash !== "#knowledge-graph";
  if (item.match === "exact") return pathname === itemPathname || pathname === `${itemPathname}/`;
  if (item.match === "entity-detail") {
    return pathname === itemPathname || (
      /^\/entities\/[^/]+\/?$/.test(pathname)
      && !["/entities/forecasters", "/entities/organizations", "/entities/directory"].includes(pathname.replace(/\/$/, ""))
    );
  }
  if (item.match === "forecasts") {
    return pathname === "/forecasts" || pathname === "/showcase" || pathname.startsWith("/manifest") || pathname.startsWith("/receipts");
  }
  return pathname === itemPathname || pathname === `${itemPathname}/`;
}
