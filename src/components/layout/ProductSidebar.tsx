import {
  BookOpenText,
  Buildings,
  ChartLineUp,
  EnvelopeSimple,
  Fingerprint,
  SealCheck,
  GlobeHemisphereWest,
  UsersThree,
} from "@phosphor-icons/react";
import { Link, useLocation } from "../../lib/router";

const entities = [
  { label: "Forecastable entities", path: "/entities", Icon: GlobeHemisphereWest },
  { label: "Organizations", path: "/entities/organizations", Icon: Buildings },
  { label: "Forecaster profiles", path: "/entities/forecasters", Icon: UsersThree },
];

const forecasts = [
  { label: "Forecast collections", path: "/forecasts", Icon: ChartLineUp },
  { label: "PepsiCo receipt example", path: "/showcase/pepsi", Icon: SealCheck },
];

const resources = [
  { label: "How it works", path: "/standards", Icon: BookOpenText },
  { label: "Integrity test", path: "/test", Icon: Fingerprint },
];

export function ProductSidebar() {
  const location = useLocation();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-slate-200 bg-white md:flex dark:border-slate-800 dark:bg-slate-900">
      <div className="flex min-w-0 flex-1 flex-col px-3 py-4">
        <Link to="/" className="mb-5 block px-2">
          <div className="text-sm font-bold tracking-tight text-slate-950 dark:text-white">Open Forecast Library</div>
          <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-600">Built on Open Forecast Receipt</div>
        </Link>

        <SidebarGroup label="Entities" items={entities} pathname={location.pathname} />
        <SidebarGroup label="Forecasts" items={forecasts} pathname={location.pathname} />
        <SidebarGroup label="Protocol" items={resources} pathname={location.pathname} />

        <div className="mt-auto rounded-xl border border-blue-100 bg-blue-50 p-3 dark:border-blue-900/70 dark:bg-blue-950/30">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-950 dark:text-blue-100"><EnvelopeSimple size={15} /> Public submissions</div>
          <p className="mt-1 text-[11px] leading-4 text-blue-700 dark:text-blue-300">
            During this phase, email <a className="font-semibold underline" href="mailto:support@ipulseai.com">support@ipulseai.com</a>. No account or payment is required.
          </p>
        </div>
      </div>
    </aside>
  );
}

function SidebarGroup({
  label,
  items,
  pathname,
}: {
  label: string;
  items: typeof entities;
  pathname: string;
}) {
  return (
    <div className="mb-5">
      <div className="mb-1 px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</div>
      <div className="space-y-1">
        {items.map(({ label: itemLabel, path, Icon }) => {
          const active = path === "/entities"
            ? pathname === "/entities" || /^\/entities\/[^/]+$/.test(pathname) && pathname !== "/entities/organizations" && pathname !== "/entities/forecasters"
            : path === "/forecasts"
            ? pathname === "/forecasts" || pathname === "/showcase" || pathname.startsWith("/manifest")
              || pathname.startsWith("/receipts")
            : pathname === path || pathname.startsWith(`${path}/`);
          return (
            <Link
              key={`${label}-${itemLabel}`}
              to={path}
              className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors ${
                active
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              }`}
            >
              <Icon size={17} weight={active ? "fill" : "regular"} aria-hidden="true" />
              {itemLabel}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
