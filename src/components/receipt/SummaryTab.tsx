import type { ReactNode } from "react";
import { Brain, CalendarBlank, CaretDown, Clock, Globe, Info, Target, UserCircleCheck } from "@phosphor-icons/react";
import type { OfrDocument } from "../../types/ofr";
import type { ReconstructionResult } from "../../types/path";
import { reconstructPath } from "../../lib/path/reconstruct";
import { PathChart } from "./PathChart";
import { presentForecaster } from "../../lib/forecasters/presentation";

interface SummaryTabProps {
  document: OfrDocument;
}

function formatTimestamp(value: string | undefined): string {
  if (!value) return "Not recorded";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }) + " UTC";
}

function formatDate(value: string | undefined): string {
  if (!value) return "Not recorded";
  return new Date(value.length === 10 ? `${value}T00:00:00Z` : value).toLocaleDateString(undefined, {
    dateStyle: "medium",
    timeZone: "UTC",
  });
}

function latestKnowledgeCutoff(components: OfrDocument["receiptPayload"]["provenance"]["temporal"]["suppliedContext"]["components"]): string | undefined {
  return components
    .map((component) => component.knowledgeCutoff)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);
}

function humanize(value: string | undefined): string {
  if (!value) return "Not recorded";
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatTarget(value: string): string {
  if (value === "eod_close_price_step_over_step_percentage_change") return "End-of-day close price change";
  return humanize(value);
}

export function SummaryTab({ document }: SummaryTabProps) {
  const payload = document.receiptPayload;
  const forecast = payload.forecast;
  const temporal = payload.provenance.temporal;
  const anchorValueMicros = forecast.anchor?.valueScaled ?? 0;
  const cadenceMonths = forecast.temporal.cadence.value;
  const pointCount = forecast.temporal.cadence.count;

  let reconstruction: ReconstructionResult | null = null;
  try {
    reconstruction = reconstructPath(
      anchorValueMicros,
      forecast.temporal.anchorAt,
      cadenceMonths,
      pointCount,
      forecast.prediction.points.map((point) => point.value).join(","),
    );
  } catch {
    reconstruction = null;
  }

  const baseModelKnowledge = temporal.baseModelKnowledge;
  const webSearch = temporal.acquiredEvidence.webSearch;
  const forecaster = presentForecaster(forecast);
  const inputContextCutoff = latestKnowledgeCutoff(temporal.suppliedContext.components);
  const boundedContextComponents = temporal.suppliedContext.components.filter((component) => component.knowledgeCutoff).length;
  const reviewers = forecaster.reviewers.length > 0
    ? forecaster.reviewers.map((reviewer) => `${reviewer.name} (${humanize(reviewer.type)})`).join(", ")
    : "None recorded";

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-px border-b border-slate-200 bg-slate-200 sm:grid-cols-2 xl:grid-cols-4 dark:border-slate-800 dark:bg-slate-800">
          <SnapshotItem icon={<Target size={15} />} label="Target" value={formatTarget(forecast.target.name)} />
          <SnapshotItem icon={<CalendarBlank size={15} />} label="Forecast created" value={formatTimestamp(forecast.temporal.forecastCreatedAt)} />
          <SnapshotItem icon={<Clock size={15} />} label="Horizon" value={`${pointCount} steps · every ${cadenceMonths} months`} />
          <SnapshotItem icon={<Info size={15} />} label="Receipt" value={payload.receipt.issuanceMode === "retrospective" ? "Retrospective" : "Contemporaneous"} />
        </div>

        <div className="p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-950 dark:text-white">Forecast path</h3>
              <p className="mt-0.5 text-[11px] text-slate-500">Reconstructed from the sealed step-by-step returns</p>
            </div>
            <span className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800">
              {forecast.prediction.unit.includes("basis") ? "Displayed as percentages" : humanize(forecast.prediction.unit)}
            </span>
          </div>
          {reconstruction ? (
            <>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 pb-2 pt-3 dark:border-slate-800 dark:bg-slate-950/40">
                <PathChart reconstruction={reconstruction} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric label="Anchor price" value={`${forecast.anchor?.valueDecimal ?? "—"} ${forecast.anchor?.unit ?? ""}`.trim()} />
                <Metric label="Terminal price" value={`${reconstruction.terminalPrice.toFixed(2)} ${forecast.anchor?.unit ?? ""}`.trim()} />
                <Metric label="Terminal return" value={reconstruction.terminalReturnPercent} tone={reconstruction.terminalReturnPercent.startsWith("-") ? "negative" : "positive"} />
                <Metric label="Classification" value={forecast.classification?.value ?? "Not classified"} />
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">The sealed path could not be reconstructed.</div>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <BoundaryCard
          icon={<Brain size={18} weight="duotone" />}
          title="Knowledge boundary"
          description="What the forecaster could have known independently of the supplied input context."
          rows={[
            ["Forecaster type", forecaster.typeLabel],
            ["Implementation", forecaster.implementationLabel],
            [forecast.forecaster.model ? "Model knowledge cutoff" : "Knowledge cutoff", formatTimestamp(baseModelKnowledge?.cutoffAt)],
            ["Boundary confidence", `${baseModelKnowledge?.status ?? "unknown"} · ${baseModelKnowledge?.precision ?? "unknown"} precision`],
            ["API identifier", forecast.forecaster.model?.apiIdentifier ?? "Not recorded"],
          ]}
        />
        <BoundaryCard
          icon={<Globe size={18} weight="duotone" />}
          title="Input context knowledge boundary"
          description="The newest dated information included in the sealed context supplied to the forecaster."
          rows={[
            ["Latest included cutoff", formatDate(inputContextCutoff)],
            ["Bounded components", `${boundedContextComponents}/${temporal.suppliedContext.components.length} record a cutoff`],
            ["Snapshot effective", formatTimestamp(temporal.suppliedContext.effectiveAt)],
            ["Capture status", humanize(temporal.suppliedContext.captureStatus)],
          ]}
        />
        <BoundaryCard
          icon={<Globe size={18} weight="duotone" />}
          title="Run-time information boundary"
          description="Whether fresh information could enter during this particular run."
          rows={[
            ["Web search", webSearch.configured ? "Configured" : "Not configured"],
            ["Search execution", humanize(webSearch.executionStatus)],
            ["Evidence manifest", humanize(webSearch.evidenceManifestStatus)],
            ["Response generated", formatTimestamp(temporal.generation.responseGeneratedAt)],
          ]}
        />
        <BoundaryCard
          icon={<UserCircleCheck size={18} weight="duotone" />}
          title="Authorship and review"
          description="Who built the forecaster and who reviewed this specific forecast before publication."
          rows={[
            ["Architecture authors", forecaster.architectureAuthors.join(", ") || "Not captured in this v0.1 receipt"],
            ["Review status", forecaster.reviewStatusLabel],
            ["Reviewers", reviewers],
            ["Reviewer limit", "Up to 10 structured reviewers"],
          ]}
        />
      </section>

      {payload.receipt.issuanceMode === "retrospective" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300">
          <strong>Retrospective receipt.</strong> The source forecast predates this receipt. Sealing it later does not establish that it was sealed when originally generated. Any verified independent timestamp is shown separately.
        </div>
      )}

      <details className="group rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-200">
          Provenance and supplied context
          <CaretDown className="text-slate-400 transition-transform group-open:rotate-180" size={15} weight="bold" />
        </summary>
        <div className="grid gap-5 border-t border-slate-200 px-4 py-4 text-xs text-slate-600 sm:grid-cols-2 dark:border-slate-800 dark:text-slate-300">
          <div className="space-y-2">
            <DetailLine label="Source system" value={payload.provenance.sourceSystem} />
            <DetailLine label="Publication" value={payload.provenance.sourcePublication.id} />
            <DetailLine label="Released" value={formatTimestamp(temporal.releasedAt)} />
            <DetailLine label="Evaluation eligible" value={formatTimestamp(temporal.evaluationEligibleAt)} />
          </div>
          <div className="space-y-2">
            <DetailLine label="Context snapshot" value={temporal.suppliedContext.snapshotId ?? "Not recorded"} mono />
            <DetailLine label="Capture status" value={humanize(temporal.suppliedContext.captureStatus)} />
            <DetailLine label="Mapping adapter" value={`${payload.provenance.mapping.adapter} v${payload.provenance.mapping.version}`} />
            <DetailLine label="Components" value={`${temporal.suppliedContext.components.length} sealed context components`} />
            {temporal.suppliedContext.components.map((component, index) => (
              <DetailLine
                key={`${component.type}-${index}`}
                label={humanize(component.type)}
                value={`knowledge cutoff ${formatDate(component.knowledgeCutoff)} · coverage ${formatDate(component.coverageStart)} to ${formatDate(component.coverageEnd)}`}
              />
            ))}
          </div>
        </div>
      </details>
    </div>
  );
}

function SnapshotItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0 bg-white px-4 py-3 dark:bg-slate-900">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-400">{icon}{label}</div>
      <div className="mt-1 truncate text-xs font-semibold text-slate-800 dark:text-slate-100" title={value}>{value}</div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" }) {
  const color = tone === "positive" ? "text-emerald-600" : tone === "negative" ? "text-red-600" : "text-slate-950 dark:text-white";
  return (
    <div className="rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-800">
      <div className="text-[10px] font-medium text-slate-400">{label}</div>
      <div className={`mt-0.5 text-sm font-bold ${color}`}>{value}</div>
    </div>
  );
}

function BoundaryCard({ icon, title, description, rows }: { icon: ReactNode; title: string; description: string; rows: string[][] }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">{icon}</div>
        <div>
          <h3 className="text-xs font-semibold text-slate-900 dark:text-white">{title}</h3>
          <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{description}</p>
        </div>
      </div>
      <dl className="mt-4 space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4 text-[11px]">
            <dt className="shrink-0 text-slate-400">{label}</dt>
            <dd className="text-right font-medium text-slate-700 dark:text-slate-200">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function DetailLine({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div><span className="font-medium text-slate-400">{label}: </span><span className={mono ? "break-all font-mono text-[10px]" : "font-medium text-slate-700 dark:text-slate-200"}>{value}</span></div>;
}
