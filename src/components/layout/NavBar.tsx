import { useState, useEffect } from "react";
import { Link, useLocation } from "../../lib/router";

export function NavBar() {
  const location = useLocation();
  const [dark, setDark] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const toggleTheme = () => setDark((d) => !d);

  const linkClass = (path: string) =>
    `text-sm font-medium transition-colors cursor-pointer ${
      location.pathname.startsWith(path)
        ? "text-blue-600 dark:text-blue-400"
        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
    }`;

  return (
    <nav className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            to="/manifest/batch-6"
            className="font-semibold text-gray-900 dark:text-gray-100 cursor-pointer"
          >
            OFR Explorer
          </Link>
          <div className="hidden sm:flex items-center gap-4">
            <Link to="/manifest/batch-6" className={linkClass("/manifest")}>
              Manifest
            </Link>
            <Link to="/standards" className={linkClass("/standards")}>
              Standards
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 dark:text-gray-500 hidden sm:inline">
            AI Factory — Native.builder Hackathon
          </span>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer active:scale-95"
            aria-label="Toggle theme"
          >
            {dark ? "☀️" : "🌙"}
          </button>
        </div>
      </div>
    </nav>
  );
}
