import { useState, useEffect } from "react";
import { EnvelopeSimple, Moon, Sun } from "@phosphor-icons/react";
import { Link, useLocation } from "../../lib/router";

export function NavBar() {
  const location = useLocation();
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("ofr-explorer-theme-v2") === "dark";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    window.localStorage.setItem("ofr-explorer-theme-v2", dark ? "dark" : "light");
  }, [dark]);

  const toggleTheme = () => setDark((d) => !d);

  const linkClass = (path: string) =>
    `border-b-2 px-1 py-[18px] text-sm font-medium transition-colors ${
      (path === "/" ? location.pathname === "/" : location.pathname.startsWith(path))
      || (path === "/forecasts" && (
        location.pathname.startsWith("/showcase")
        || location.pathname.startsWith("/manifest")
        || location.pathname.startsWith("/receipts")
      ))
        ? "border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-300"
        : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
    }`;

  return (
    <nav className="h-14 border-b border-slate-200 bg-white/95 dark:border-slate-800 dark:bg-slate-900/95">
      <div className="mx-auto flex h-full max-w-[1500px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex h-full items-center gap-6">
          <Link
            to="/"
            className="font-bold tracking-tight text-slate-900 dark:text-white"
          >
            Open Forecast Library
          </Link>
          <div className="hidden h-full items-center gap-5 sm:flex">
            <Link to="/" className={linkClass("/")}>Home</Link>
            <Link to="/entities" className={linkClass("/entities")}>
              Entities
            </Link>
            <Link to="/forecasts" className={linkClass("/forecasts")}>
              Forecasts
            </Link>
            <Link to="/standards" className={linkClass("/standards")}>
              How it works
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="mailto:support@ipulseai.com?subject=Public%20forecast%20submission"
            className="hidden items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 sm:inline-flex"
          >
            <EnvelopeSimple size={14} weight="bold" /> Submit a public forecast
          </a>
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 active:scale-95 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="Toggle theme"
          >
            {dark ? <Sun size={18} weight="bold" /> : <Moon size={18} weight="bold" />}
          </button>
        </div>
      </div>
    </nav>
  );
}
