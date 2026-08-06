import { Link, useLocation } from "../../lib/router";

interface BreadcrumbSegment {
  label: string;
  path?: string;
}

const labelMap: Record<string, string> = {
  manifest: "Manifest",
  "batch-6": "Batch 6",
  assets: "Assets",
  pepsi: "PepsiCo",
  nvidia: "NVIDIA",
  bitcoin: "Bitcoin",
  alphabet: "Alphabet",
  spy: "SPY",
  receipts: "Receipt",
  standards: "Standards",
};

function getLabel(segment: string): string {
  return labelMap[segment] ?? segment;
}

export function Breadcrumbs() {
  const location = useLocation();

  if (location.pathname === "/") return null;

  const segments = location.pathname.split("/").filter(Boolean);
  const crumbs: BreadcrumbSegment[] = [{ label: "Home", path: "/manifest/batch-6" }];

  let current = "";
  for (const seg of segments) {
    current += `/${seg}`;
    crumbs.push({
      label: getLabel(seg),
      path: current,
    });
  }

  return (
    <nav className="max-w-6xl mx-auto px-4 py-3" aria-label="Breadcrumb">
      <ol className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
        {crumbs.map((crumb, i) => (
          <li key={`${crumb.path ?? i}-${crumb.label}`} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-gray-300 dark:text-gray-600">/</span>}
            {crumb.path && i < crumbs.length - 1 ? (
              <Link to={crumb.path} className="hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-gray-900 dark:text-gray-100 font-medium">{crumb.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
