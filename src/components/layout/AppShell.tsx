import type { ReactNode } from "react";
import { NavBar } from "./NavBar";
import { Breadcrumbs } from "./Breadcrumbs";
import { Footer } from "./Footer";
import { ProductSidebar } from "./ProductSidebar";

export function AppShell({ children, landing = false }: { children: ReactNode; landing?: boolean }) {
  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <ProductSidebar />
      <div className="min-h-screen md:pl-64">
        <NavBar />
        {landing ? children : (
          <div className="mx-auto w-full max-w-[1500px] px-4 sm:px-6 lg:px-8">
            <Breadcrumbs />
            <main className="pb-10 pt-1">{children}</main>
          </div>
        )}
        <Footer />
      </div>
    </div>
  );
}
