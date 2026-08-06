import type { ReactNode } from "react";
import { NavBar } from "./NavBar";
import { Breadcrumbs } from "./Breadcrumbs";
import { Disclaimer } from "./Disclaimer";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <NavBar />
      <Disclaimer />
      <Breadcrumbs />
      <main className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </main>
      <footer className="border-t border-gray-200 dark:border-gray-800 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-4 text-xs text-gray-400 dark:text-gray-600 text-center">
          Open Forecast Receipt Explorer — {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
