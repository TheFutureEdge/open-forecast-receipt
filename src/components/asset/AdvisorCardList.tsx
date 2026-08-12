import { useMemo, useState } from "react";
import { CheckCircle, LinkSimple, MagnifyingGlass } from "@phosphor-icons/react";
import type { PublicForecastRecord } from "../../lib/library/types";

interface AdvisorCardListProps {
  fixtures: PublicForecastRecord[];
  advisorCount: number;
  selectedDigest?: string;
  onSelect?: (fixture: PublicForecastRecord) => void;
}

const avatarByName: Record<string, string> = {
  "Elon Musk": "elon_musk.jpg",
  "J.P. Morgan": "jp_morgan.jpg",
  "Michael Burry": "michael_burry.jpg",
  "Niccolo Machiavelli": "niccolo_machiavelli.jpg",
  "Ray Dalio": "ray_dalio.jpg",
  "Sherlock Holmes": "sherlock_holmes.jpg",
  Superintelligence: "superintelligence.jpg",
  "Warren Buffett": "warren_buffett.jpg",
};

export function getForecasterAvatar(sourceName: string): string {
  return `/assets/forecasters/${avatarByName[sourceName] ?? "consensus.jpg"}`;
}

export function AdvisorCardList({ fixtures, advisorCount, selectedDigest, onSelect }: AdvisorCardListProps) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return fixtures;
    return fixtures.filter((fixture) => {
      const searchable = [
        fixture.forecaster.displayName,
        fixture.forecaster.description,
        fixture.forecaster.implementationLabel,
      ].join(" ").toLowerCase();
      return searchable.includes(normalized);
    });
  }, [fixtures, query]);

  return (
    <div className="flex h-full min-h-[640px] flex-col bg-white dark:bg-slate-900">
      <div className="border-b border-slate-200 p-4 dark:border-slate-800">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-950 dark:text-white">Forecasters</h2>
            <p className="text-[11px] text-slate-500">{fixtures.length} of {advisorCount} receipts loaded</p>
          </div>
          <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">Complete</span>
        </div>
        <label className="relative block">
          <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search forecasters"
            className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-blue-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />
        </label>
      </div>

      <div className="flex-1 overflow-y-auto p-2" role="list" aria-label="Individual forecaster receipts">
        {filtered.map((fixture) => {
          const selected = selectedDigest === fixture.receiptDigest;
          const hasProof = fixture.chainStatus === "verified" && Boolean(fixture.attestationUID);
          return (
            <button
              key={fixture.receiptDigest}
              type="button"
              onClick={() => onSelect?.(fixture)}
              className={`mb-1 flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all ${
                selected
                  ? "border-blue-200 bg-blue-50 shadow-sm dark:border-blue-800 dark:bg-blue-950/40"
                  : "border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-800/70"
              }`}
              aria-pressed={selected}
            >
              <img src={getForecasterAvatar(fixture.forecaster.sourceName)} alt="" className="size-10 shrink-0 rounded-full object-cover ring-2 ring-white dark:ring-slate-800" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-slate-900 dark:text-white">{fixture.forecaster.displayName}</span>
                <span className="mt-0.5 block truncate text-[10px] text-slate-500">{fixture.forecaster.description}</span>
              </span>
              <span className="shrink-0">
                {hasProof ? (
                  <LinkSimple size={16} weight="bold" className="text-blue-600" aria-label="Public proof available" />
                ) : fixture.showcaseSelected ? (
                  <span className="block size-2 rounded-full bg-amber-400" title="Proof selected" />
                ) : (
                  <CheckCircle size={16} weight="fill" className="text-emerald-500" aria-label="Receipt loaded" />
                )}
              </span>
            </button>
          );
        })}
        {filtered.length === 0 && <p className="px-3 py-8 text-center text-xs text-slate-500">No forecasters match “{query}”.</p>}
      </div>
    </div>
  );
}
