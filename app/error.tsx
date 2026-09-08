"use client";

import { useEffect } from "react";
import { WarningCircle } from "@phosphor-icons/react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Forecast Library route failed", error);
  }, [error]);

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-5 text-slate-900 dark:bg-slate-950 dark:text-white">
      <section className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <WarningCircle className="mx-auto text-amber-500" size={38} weight="duotone" />
        <h1 className="mt-4 text-2xl font-black">This page could not be loaded</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-300">The public record is temporarily unavailable. No forecast or receipt data has been changed.</p>
        {error.digest && <p className="mt-3 font-mono text-[10px] text-slate-400">Error reference: {error.digest}</p>}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700">Try again</button>
          <a href="/" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Return home</a>
        </div>
      </section>
    </main>
  );
}
