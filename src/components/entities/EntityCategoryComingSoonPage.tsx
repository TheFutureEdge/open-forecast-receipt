"use client";

import { ArrowLeft, Clock, Database, GitBranch } from "@phosphor-icons/react";
import { Link } from "../../lib/router";

interface ComingSoonCategory {
  title: string;
  description: string;
  context: string;
}

const categories: Record<string, ComingSoonCategory> = {
  macroeconomics: {
    title: "Macroeconomic forecast subjects",
    description: "Countries, economies, and institutions become forecast subjects through governed targets such as GDP growth, inflation, unemployment, and policy rates.",
    context: "The country remains a graph entity; each measurable target receives its own versioned binding and forecast history.",
  },
  countries: {
    title: "Countries and economies",
    description: "Countries will provide geographic and economic context across the Knowledge Graph.",
    context: "A country can also become a forecast subject when an approved macroeconomic target is bound to it.",
  },
  "markets-venues": {
    title: "Markets and venues",
    description: "Exchanges, trading venues, and market operators will connect listed instruments to their governed MIC and venue identities.",
    context: "These are contextual graph entities; forecasts normally concern an instrument or market target rather than the venue itself.",
  },
  "networks-protocols": {
    title: "Networks and protocols",
    description: "Blockchain networks and protocols will provide context for cryptoassets and protocol-level targets.",
    context: "For example, the Bitcoin network and BTC remain distinct, related entities with separate possible targets.",
  },
};

export function EntityCategoryComingSoonPage({ categoryKey }: { categoryKey: string }) {
  const category = categories[categoryKey] || categories.countries;
  return (
    <div className="mx-auto max-w-4xl">
      <section className="overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm dark:border-blue-950 dark:bg-slate-900">
        <div className="bg-gradient-to-br from-slate-950 to-blue-950 px-7 py-9 text-white sm:px-10">
          <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-300">
            <GitBranch size={16} weight="duotone" /> Knowledge Graph expansion
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{category.title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">{category.description}</p>
        </div>
        <div className="grid gap-5 p-7 sm:grid-cols-[auto_1fr] sm:p-10">
          <div className="grid size-12 place-items-center rounded-2xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            <Clock size={25} weight="duotone" />
          </div>
          <div>
            <div className="inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">Coming soon</div>
            <h2 className="mt-3 text-lg font-bold text-slate-950 dark:text-white">The graph model is ready; governed records are not published yet.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{category.context}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/entities/directory" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700">
                <Database size={15} /> Browse current directory
              </Link>
              <Link to="/entities" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:text-slate-200">
                <ArrowLeft size={15} /> All forecast subjects
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
