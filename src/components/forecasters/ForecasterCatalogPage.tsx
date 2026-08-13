import { useEffect, useMemo, useState } from "react";
import {
  Brain,
  Buildings,
  ChartLineUp,
  CheckCircle,
  GitBranch,
  IdentificationCard,
  MagnifyingGlass,
  Robot,
  ShieldCheck,
  Stack,
  UsersThree,
} from "@phosphor-icons/react";
import { getForecasterAvatar } from "../../lib/forecasters/avatar";
import { listPublicForecasters, listPublicForecasts } from "../../lib/library/repository";
import type { PublicForecasterRecord, PublicForecastRecord } from "../../lib/library/types";

interface ForecasterCoverage {
  forecasts: number;
  entities: number;
  modes: string[];
  specializations: string[];
  proofSelected: number;
  proofVerified: number;
}

function forecasterIdentityLabel(forecaster: PublicForecasterRecord): string {
  const displayName = forecaster.displayName.trim();
  const modelName = forecaster.model?.name?.trim();
  if (!modelName || displayName.toLowerCase().includes(modelName.toLowerCase())) return displayName;
  return `${displayName} on ${modelName}`;
}

function modeFromDescription(description: string): string | null {
  const mode = description.split("·").at(-1)?.trim().toUpperCase();
  return mode === "RESEARCHER" || mode === "THINKER" ? mode : null;
}

function buildCoverage(forecasters: PublicForecasterRecord[], forecasts: PublicForecastRecord[]): Map<string, ForecasterCoverage> {
  const coverage = new Map<string, ForecasterCoverage>();
  for (const forecaster of forecasters) {
    const records = forecasts.filter((forecast) => forecast.forecasterId === forecaster.forecasterId);
    coverage.set(forecaster.forecasterId, {
      forecasts: records.length,
      entities: new Set(records.map((record) => record.entityId)).size,
      modes: [...new Set(records.map((record) => record.forecasterMode || modeFromDescription(record.forecaster.description)).filter((mode): mode is string => Boolean(mode)))].sort(),
      specializations: [...new Set(records.map((record) => record.subjectCategory).filter((value): value is string => Boolean(value)))].sort(),
      proofSelected: records.filter((record) => record.showcaseSelected).length,
      proofVerified: records.filter((record) => record.chainStatus === "verified").length,
    });
  }
  return coverage;
}

export function ForecasterCatalogPage() {
  const [forecasters, setForecasters] = useState<PublicForecasterRecord[]>([]);
  const [forecasts, setForecasts] = useState<PublicForecastRecord[]>([]);
  const [queryText, setQueryText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([listPublicForecasters(), listPublicForecasts()])
      .then(([forecasterRecords, forecastRecords]) => {
        if (!active) return;
        setForecasters(forecasterRecords);
        setForecasts(forecastRecords);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Unable to load the public forecaster catalog");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const coverage = useMemo(() => buildCoverage(forecasters, forecasts), [forecasters, forecasts]);
  const filtered = useMemo(() => {
    const normalized = queryText.trim().toLowerCase();
    if (!normalized) return forecasters;
    return forecasters.filter((forecaster) => [
      forecasterIdentityLabel(forecaster),
      forecaster.displayName,
      forecaster.name,
      forecaster.description,
      forecaster.typeLabel,
      forecaster.model?.name,
      forecaster.model?.provider,
      ...(forecaster.specializations || []),
    ].filter(Boolean).some((value) => String(value).toLowerCase().includes(normalized)));
  }, [forecasters, queryText]);

  if (loading) return <div className="py-20 text-center text-sm text-slate-500">Loading public forecasters…</div>;
  if (error) return <div className="py-20 text-center text-sm text-rose-600">{error}</div>;

  const entityCount = new Set(forecasts.map((forecast) => forecast.entityId)).size;
  const verifiedCount = forecasts.filter((forecast) => forecast.chainStatus === "verified").length;

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-white via-white to-violet-50 px-6 py-8 shadow-sm dark:border-blue-950 dark:from-slate-900 dark:via-slate-900 dark:to-violet-950/30 sm:px-9">
        <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-violet-700 dark:border-violet-900 dark:bg-violet-950/60 dark:text-violet-300">
              <UsersThree size={15} weight="fill" /> Forecaster catalog
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">Browse who generated the forecasts</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              A forecaster profile is the stable platform identity responsible for generating forecasts. For an iPulse AI analyst, it combines the software persona, investment framework, and exact model specification/version. Operating modes and task configurations then define how that forecaster runs for a particular assignment.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Metric value={forecasters.length} label="Forecasters" />
            <Metric value={forecasts.length} label="Forecasts" />
            <Metric value={entityCount} label="Entities" />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-xs leading-5 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 shrink-0" size={19} weight="duotone" />
          <p><strong>Platform profiles, not namesake people:</strong> the named figures below are iPulse AI software personas. They are internal forecaster profiles and are not linked with <code>sameAs</code> to real-world Person entities. The Library does not claim that the namesake people generated, reviewed, endorsed, or are affiliated with these forecasts.</p>
        </div>
      </section>

      <section className="grid gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-3 lg:grid-cols-6">
        {[
          [Buildings, "Publisher", "Future Edge Group FZE"],
          [UsersThree, "Product team", "iPulse AI Research"],
          [IdentificationCard, "Profile", "analyst_id"],
          [Brain, "Execution", "mode + task config"],
          [GitBranch, "Assignment", "entity + task config"],
          [ChartLineUp, "Output", "individual forecast"],
        ].map(([Icon, label, value]) => {
          const StepIcon = Icon as typeof Buildings;
          return (
            <div key={String(label)} className="rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-800/70">
              <StepIcon size={17} className="text-blue-600" aria-hidden="true" />
              <div className="mt-2 text-[9px] font-bold uppercase tracking-wider text-slate-400">{String(label)}</div>
              <div className="mt-0.5 text-xs font-semibold text-slate-800 dark:text-slate-100">{String(value)}</div>
            </div>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <label className="relative block">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} aria-hidden="true" />
            <input
              value={queryText}
              onChange={(event) => setQueryText(event.target.value)}
              placeholder="Search forecasters, roles, models, or providers"
              className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none focus:border-blue-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800"
            />
          </label>
        </div>
        <div className="grid gap-px bg-slate-100 p-px dark:bg-slate-800 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((forecaster) => {
            const stats = coverage.get(forecaster.forecasterId) || { forecasts: 0, entities: 0, modes: [], specializations: [], proofSelected: 0, proofVerified: 0 };
            const specializations = forecaster.specializations?.length ? forecaster.specializations : stats.specializations;
            const forecasterForecasts = forecasts.filter((forecast) => forecast.forecasterId === forecaster.forecasterId);
            const taskConfigurationIds = forecaster.taskConfigurationIds || [...new Set(
              forecasterForecasts.map((forecast) => forecast.taskConfigurationId).filter((value): value is string => Boolean(value)),
            )].sort();
            const subjectAssignmentIds = forecaster.subjectAssignmentIds || [...new Set(
              forecasterForecasts.map((forecast) => forecast.subjectAssignmentId).filter((value): value is string => Boolean(value)),
            )].sort();
            return (
              <article key={forecaster.forecasterId} className="bg-white p-5 dark:bg-slate-900">
                <div className="flex items-start gap-4">
                  <img src={getForecasterAvatar(forecaster.name)} alt="" className="size-14 shrink-0 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800" />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-bold leading-5 text-slate-950 dark:text-white">{forecasterIdentityLabel(forecaster)}</h2>
                    <p className="mt-0.5 text-xs text-slate-500">{forecaster.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                        <Robot size={13} /> {forecaster.typeLabel}
                      </span>
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">Platform profile</span>
                    </div>
                  </div>
                </div>

                <dl className="mt-5 grid grid-cols-3 gap-2">
                  <Stat value={stats.forecasts} label="Forecasts" />
                  <Stat value={stats.entities} label="Entities" />
                  <Stat value={stats.proofVerified} label="Proofs" />
                </dl>

                <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-xs dark:border-slate-800">
                  <div>
                    <div className="inline-flex items-center gap-1.5 text-slate-400"><IdentificationCard size={14} /> Forecaster profile ID</div>
                    <code className="mt-1 block break-all rounded bg-slate-50 px-2 py-1.5 text-[10px] text-slate-700 dark:bg-slate-800 dark:text-slate-200">{forecaster.sourceProfile?.analystId || forecaster.forecasterId}</code>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-slate-400"><Buildings size={14} /> Publisher</span>
                    <span className="truncate font-medium text-slate-700 dark:text-slate-200">{forecaster.publisherOrganization?.name || "Future Edge Group FZE"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-slate-400"><UsersThree size={14} /> Product team</span>
                    <span className="truncate font-medium text-slate-700 dark:text-slate-200">{forecaster.publisherTeam?.name || "iPulse AI Research"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-slate-400"><Brain size={14} /> Implementation</span>
                    <span className="truncate font-medium text-slate-700 dark:text-slate-200">{forecaster.model?.name || forecaster.typeLabel}{forecaster.model?.provider ? ` · ${forecaster.model.provider}` : ""}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-slate-400"><ChartLineUp size={14} /> Modes</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">{stats.modes.join(" · ") || "Not recorded"}</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex shrink-0 items-center gap-1.5 text-slate-400"><Stack size={14} /> Specializations</span>
                    <span className="text-right font-medium capitalize text-slate-700 dark:text-slate-200">{specializations.join(", ") || "Not recorded"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-slate-400"><Stack size={14} /> Task configurations</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">{taskConfigurationIds.length || "Pending publication"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-slate-400"><GitBranch size={14} /> Subject assignments</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">{subjectAssignmentIds.length || "Pending publication"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-slate-400"><CheckCircle size={14} /> Review</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">Not reviewed by the named person</span>
                  </div>
                  {(taskConfigurationIds.length > 0 || subjectAssignmentIds.length > 0) && (
                    <details className="rounded-lg bg-slate-50 px-2.5 py-2 dark:bg-slate-800/70">
                      <summary className="cursor-pointer text-[10px] font-bold uppercase tracking-wide text-blue-700 dark:text-blue-300">Configuration identifiers</summary>
                      {taskConfigurationIds.length > 0 && (
                        <div className="mt-2">
                          <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Task configuration IDs</div>
                          {taskConfigurationIds.map((id) => <code key={id} className="mt-1 block break-all text-[9px] text-slate-600 dark:text-slate-300">{id}</code>)}
                        </div>
                      )}
                      {subjectAssignmentIds.length > 0 && (
                        <div className="mt-2">
                          <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Subject assignment IDs</div>
                          {subjectAssignmentIds.map((id) => <code key={id} className="mt-1 block break-all text-[9px] text-slate-600 dark:text-slate-300">{id}</code>)}
                        </div>
                      )}
                    </details>
                  )}
                </div>
              </article>
            );
          })}
        </div>
        {filtered.length === 0 && <div className="px-5 py-16 text-center text-sm text-slate-500">No forecasters match this search.</div>}
      </section>

      <p className="text-xs leading-5 text-slate-500">{verifiedCount} of {forecasts.length} current showcase forecasts have a verified public blockchain proof. Proof establishes receipt integrity and timing, not forecast accuracy.</p>
    </div>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-24 rounded-xl border border-white/80 bg-white/90 px-3 py-3 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/90">
      <div className="text-xl font-bold text-slate-950 dark:text-white">{value}</div>
      <div className="text-[9px] font-bold uppercase tracking-[0.1em] text-slate-400">{label}</div>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2 py-2 text-center dark:bg-slate-800/70">
      <dt className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">{value}</dd>
    </div>
  );
}
