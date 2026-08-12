import type { ReactNode } from "react";
import { NavBar } from "./NavBar";
import { Breadcrumbs } from "./Breadcrumbs";
import { Disclaimer } from "./Disclaimer";
import { ProductSidebar } from "./ProductSidebar";

export function AppShell({ children, landing = false }: { children: ReactNode; landing?: boolean }) {
  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {!landing && <ProductSidebar />}
      <div className={`min-h-screen ${landing ? "" : "md:pl-[256px]"}`}>
        <NavBar />
        {!landing && <Disclaimer />}
        {landing ? children : (
          <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8">
            <Breadcrumbs />
            <main className="pb-10 pt-1">{children}</main>
          </div>
        )}
        <footer className="mt-10 border-t border-slate-200 bg-white/70 dark:border-slate-800 dark:bg-slate-950/70">
          <div className="mx-auto max-w-[1500px] px-6 py-4 text-center text-xs text-slate-400">
            Open Forecast Receipt by Future Edge Group · Questions or public submissions: <a className="font-medium text-blue-600 hover:underline" href="mailto:support@ipulseai.com">support@ipulseai.com</a> · {new Date().getFullYear()}
          </div>
        </footer>
      </div>
    </div>
  );
}
