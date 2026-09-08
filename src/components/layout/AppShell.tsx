"use client";

import { Suspense, useState, type ReactNode } from "react";
import { NavBar } from "./NavBar";
import { Breadcrumbs } from "./Breadcrumbs";
import { Footer } from "./Footer";
import { ProductSidebar } from "./ProductSidebar";

export function AppShell({ children, landing = false }: { children: ReactNode; landing?: boolean }) {
  const [mobileDirectoryOpen, setMobileDirectoryOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-clip bg-[#f4f7fb] text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Suspense fallback={null}>
        <ProductSidebar mobileOpen={mobileDirectoryOpen} onMobileOpenChange={setMobileDirectoryOpen} />
      </Suspense>
      <div className="flex min-h-screen flex-col md:pl-64">
        <Suspense fallback={<div className="h-14 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />}>
          <NavBar mobileOpen={mobileDirectoryOpen} onMobileOpenChange={setMobileDirectoryOpen} />
        </Suspense>
        {landing ? (
          <main className="min-h-[calc(100dvh-3.5rem)]">{children}</main>
        ) : (
          <div className="mx-auto min-h-[calc(100dvh-3.5rem)] w-full max-w-[1500px] px-4 sm:px-6 lg:px-8">
            <Suspense fallback={<div className="h-11" />}><Breadcrumbs /></Suspense>
            <main className="pb-10 pt-1">{children}</main>
          </div>
        )}
        <Footer />
      </div>
    </div>
  );
}
