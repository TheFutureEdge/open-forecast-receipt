"use client";

import { useState, useEffect } from "react";
import { EnvelopeSimple, List, Moon, Sun, X } from "@phosphor-icons/react";
import { Link, useLocation } from "../../lib/router";

export function NavBar({ mobileOpen, onMobileOpenChange }: { mobileOpen: boolean; onMobileOpenChange: (open: boolean) => void }) {
  const location = useLocation();
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("ofr-explorer-theme-v2") === "dark";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    window.localStorage.setItem("ofr-explorer-theme-v2", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => {
    onMobileOpenChange(false);
  }, [location.pathname, location.hash, onMobileOpenChange]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const toggleTheme = () => setDark((d) => !d);

  const linkClass = (path: string) =>
    `border-b-2 px-1 py-[18px] text-sm font-medium transition-colors ${
      (path === "/"
        ? location.pathname === "/"
        : path === "/entities"
          ? location.pathname.startsWith("/entities") && !location.pathname.startsWith("/entities/forecasters")
          : location.pathname.startsWith(path))
      || (path === "/forecasts" && (
        location.pathname.startsWith("/manifest")
        || location.pathname.startsWith("/receipts")
      ))
        ? "border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-300"
        : "border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
    }`;

  return (
    <nav className="sticky top-0 z-40 h-14 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
      <div className="mx-auto flex h-full max-w-[1500px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 h-full items-center gap-6">
          <Link
            to="/"
            className="truncate font-bold tracking-tight text-slate-900 dark:text-white"
          >
            Forecast Library
          </Link>
          <div className="hidden h-full items-center gap-5 xl:flex">
            <Link to="/" className={linkClass("/")}>Home</Link>
            <Link to="/entities" className={linkClass("/entities")}>
              Entities
            </Link>
            <Link to="/forecasts" className={linkClass("/forecasts")}>
              Forecasts
            </Link>
            <Link to="/forecasters" className={linkClass("/forecasters")}>
              Forecasters
            </Link>
            <Link to="/how-it-works" className={linkClass("/how-it-works")}>
              How it works
            </Link>
          </div>
        </div>
        <div className="ml-3 flex shrink-0 items-center gap-2 sm:gap-3">
          <a
            href="/submit"
            className="hidden items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 xl:inline-flex"
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
          <button
            type="button"
            onClick={() => onMobileOpenChange(!mobileOpen)}
            className="grid size-9 place-items-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 active:scale-95 md:hidden dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-library-navigation"
          >
            {mobileOpen ? <X size={21} weight="bold" /> : <List size={21} weight="bold" />}
          </button>
        </div>
      </div>

    </nav>
  );
}
