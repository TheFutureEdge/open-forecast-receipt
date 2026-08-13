import { useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle,
  EnvelopeSimple,
  Fingerprint,
  LinkSimple,
  MagnifyingGlass,
  ShieldCheck,
} from "@phosphor-icons/react";
import type { LibraryManifest } from "../../lib/library/types";
import { Link } from "../../lib/router";
import { AssetRow } from "./AssetRow";
import { getManifestProofCounts } from "../../lib/library/repository";

interface BatchManifestProps {
  manifest: LibraryManifest;
}

export function BatchManifestComponent({ manifest }: BatchManifestProps) {
  const [query, setQuery] = useState("");
  const assets = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return manifest.entities;
    return manifest.entities.filter((asset) =>
      [asset.name, asset.displaySymbol, asset.marketIdentifier].some((value) => value.toLowerCase().includes(normalized)),
    );
  }, [manifest.entities, query]);
  const receiptCount = manifest.receiptCount;
  const proofCounts = getManifestProofCounts(manifest);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-white via-white to-blue-50 shadow-sm dark:border-blue-950 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/40">
        <div className="grid gap-7 px-5 py-7 sm:px-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:px-9 lg:py-9">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-blue-700 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300">
              <ShieldCheck size={15} weight="fill" /> Publisher: iPulse AI
            </div>
            <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl dark:text-white">
              iPulse AI market forecasts
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Every forecast is preserved as its own receipt: what was predicted, who generated it, when it was created, and whether an independent blockchain proof is available.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <Link
                to="/showcase/pepsi"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                Explore PepsiCo forecasts <ArrowRight size={15} weight="bold" />
              </Link>
              <Link
                to="/test"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                <Fingerprint size={16} weight="duotone" /> Try the integrity test
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Metric value={String(manifest.entities.length)} label="Collection entities" />
            <Metric value={String(receiptCount)} label="Receipts" />
            <Metric value={String(proofCounts.selected)} label="Selected proofs" />
          </div>
        </div>
      </section>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
        <div className="flex items-start gap-2.5">
          <CheckCircle className="mt-0.5 shrink-0" size={18} weight="fill" aria-hidden="true" />
          <div>
            <span className="font-semibold">The full public showcase is loaded.</span> Each asset has 12 individual AI-forecaster receipts. {proofCounts.selected} receipts were selected in advance for separate Base Sepolia proofs; {proofCounts.verified} are currently verified onchain.
          </div>
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-3" aria-labelledby="test-the-showcase">
        <div className="md:col-span-3">
          <h2 id="test-the-showcase" className="text-sm font-semibold text-slate-950 dark:text-white">Test it in three simple steps</h2>
        </div>
        <TestStep number="1" title="Choose an asset" description="Open one of the five iPulse AI assets below." />
        <TestStep number="2" title="Choose a forecaster" description="Inspect the prediction path, timing, model boundary, and receipt JSON." />
        <TestStep number="3" title="Change one value" description="In the tamper test, edit a percentage and watch integrity change from PASS to FAIL." />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-200/40 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-950 dark:text-white">Entities in this collection</h2>
            <p className="mt-0.5 text-xs text-slate-500">Published by iPulse AI · accountable organization: Future Edge Group FZE</p>
          </div>
          <label className="relative block sm:w-72">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search assets or identifiers"
              className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>
        </div>

        <div className="hidden grid-cols-[minmax(240px,1.5fr)_0.7fr_0.75fr_1fr_32px] items-center border-b border-slate-200 bg-slate-50/80 px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 md:grid dark:border-slate-800 dark:bg-slate-950/40">
          <div>Subject</div>
          <div>Coverage</div>
          <div>Receipts</div>
          <div>Blockchain proof</div>
          <span className="sr-only">Open</span>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {assets.map((asset) => (
            <AssetRow key={asset.slug} asset={asset} batchId={manifest.batchId} />
          ))}
          {assets.length === 0 && (
            <div className="px-5 py-12 text-center text-sm text-slate-500">No assets match “{query}”.</div>
          )}
        </div>
      </section>

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <ShieldCheck size={16} className="text-blue-600" aria-hidden="true" />
        A proof confirms a receipt’s integrity and blockchain timestamp. It does not guarantee forecast accuracy.
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
            <EnvelopeSimple size={18} weight="duotone" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-950 dark:text-white">Want to submit a public forecast?</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Public submissions are reviewed manually during this showcase phase. There are no accounts or payments.</p>
          </div>
        </div>
        <a
          href="mailto:support@ipulseai.com?subject=Public%20forecast%20submission"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300"
        >
          Contact support@ipulseai.com <LinkSimple size={14} weight="bold" />
        </a>
      </section>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-24 rounded-xl border border-white/80 bg-white/90 px-3 py-3 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
      <div className="text-xl font-bold text-slate-950 dark:text-white">{value}</div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">{label}</div>
    </div>
  );
}

function TestStep({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="grid size-7 shrink-0 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white">{number}</div>
      <div>
        <div className="text-xs font-semibold text-slate-900 dark:text-white">{title}</div>
        <p className="mt-1 text-[11px] leading-4 text-slate-500">{description}</p>
      </div>
    </div>
  );
}
