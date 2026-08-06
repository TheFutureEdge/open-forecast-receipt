import type { OfrDocument } from "../../types/ofr";
import type { ReconstructionResult } from "../../types/path";
import { reconstructPath } from "../../lib/path/reconstruct";

interface SummaryTabProps {
  document: OfrDocument;
}

function formatTimestamp(value: string | undefined): string {
  if (!value) return "Unknown";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "UTC",
  }) + " UTC";
}

export function SummaryTab({ document }: SummaryTabProps) {
  const payload = document.receiptPayload;
  const forecast = payload.forecast;
  const temporal = payload.provenance.temporal;
  const anchorValueMicros = forecast.anchor?.valueScaled ?? 0;
  const anchorAt = forecast.temporal.anchorAt;
  const cadenceMonths = forecast.temporal.cadence.value;
  const pointCount = forecast.temporal.cadence.count;
  const stepReturnBps = forecast.prediction.points.map((point) => point.value).join(",");

  let reconstruction: ReconstructionResult | null = null;
  try {
    reconstruction = reconstructPath(
      anchorValueMicros,
      anchorAt,
      cadenceMonths,
      pointCount,
      stepReturnBps
    );
  } catch {
    reconstruction = null;
  }

  const baseModelKnowledge = temporal.baseModelKnowledge;
  const webSearch = temporal.acquiredEvidence.webSearch;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <InfoItem label="Subject" value={forecast.subject.name} />
        <InfoItem label="Ticker" value={forecast.subject.identifiers?.ticker ?? "—"} />
        <InfoItem label="Anchor" value={`${forecast.anchor?.valueDecimal ?? "—"} ${forecast.anchor?.unit ?? ""}`.trim()} />
        <InfoItem label="Anchor Date" value={new Date(anchorAt).toLocaleDateString()} />
        {forecast.classification?.value && (
          <InfoItem label="Classification" value={forecast.classification.value} />
        )}
        <InfoItem label="Forecaster" value={forecast.forecaster.name} />
        {forecast.forecaster.role && <InfoItem label="Role" value={forecast.forecaster.role} />}
        {forecast.forecaster.mode && <InfoItem label="Mode" value={forecast.forecaster.mode} />}
        <InfoItem label="Cadence" value={`Every ${cadenceMonths} months`} />
        <InfoItem label="Steps" value={String(pointCount)} />
        <InfoItem label="Forecast Created" value={formatTimestamp(forecast.temporal.forecastCreatedAt)} />
        <InfoItem
          label="Receipt Issuance"
          value={payload.receipt.issuanceMode === "retrospective" ? "Retrospective" : "Contemporaneous"}
        />
      </div>

      {reconstruction && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <InfoItem label="Terminal Price" value={`${reconstruction.terminalPrice.toFixed(2)} ${forecast.anchor?.unit ?? ""}`.trim()} />
          <InfoItem label="Terminal Return" value={reconstruction.terminalReturnPercent} />
          <InfoItem label="Step Range" value={`1–${reconstruction.pointCount}`} />
          <InfoItem label="Year Span" value={`~${Math.round(reconstruction.pointCount * reconstruction.cadenceMonths / 12)} years`} />
        </div>
      )}

      <section>
        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">AI model and information boundary</h3>
        <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-700 dark:text-gray-300">
          <DetailCard
            title="Base model"
            lines={[
              `${forecast.forecaster.model?.name ?? "Unknown"} (${forecast.forecaster.model?.provider ?? "provider unknown"})`,
              `API identifier: ${forecast.forecaster.model?.apiIdentifier ?? "not recorded"}`,
              `Release: ${formatTimestamp(forecast.forecaster.model?.releaseDate)}`,
              `Knowledge cutoff: ${formatTimestamp(baseModelKnowledge?.cutoffAt)}`,
              `Cutoff status: ${baseModelKnowledge?.status ?? "unknown"} (${baseModelKnowledge?.precision ?? "unknown"} precision)`,
            ]}
          />
          <DetailCard
            title="Run acquisition"
            lines={[
              `Web search configured: ${webSearch.configured ? "yes" : "no"}`,
              `Execution: ${webSearch.executionStatus}`,
              `Evidence manifest: ${webSearch.evidenceManifestStatus}`,
              `Request submitted: ${formatTimestamp(temporal.generation.requestSubmittedAt)}`,
              `Response generated: ${formatTimestamp(temporal.generation.responseGeneratedAt)}`,
            ]}
          />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Supplied context</h3>
        <div className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
          <p><strong>Snapshot:</strong> <code className="text-xs break-all">{temporal.suppliedContext.snapshotId ?? "not recorded"}</code></p>
          <p><strong>Capture status:</strong> {temporal.suppliedContext.captureStatus}</p>
          <p><strong>Effective at:</strong> {formatTimestamp(temporal.suppliedContext.effectiveAt)}</p>
          <p><strong>Recorded at:</strong> {formatTimestamp(temporal.suppliedContext.recordedAt)}</p>
          <div className="grid sm:grid-cols-3 gap-2 pt-1">
            {temporal.suppliedContext.components.map((component) => (
              <div key={`${component.type}-${component.contentDigestSha256}`} className="rounded border border-gray-200 dark:border-gray-700 p-3">
                <div className="font-medium">{component.type.replaceAll("_", " ")}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Coverage: {component.coverageStart ?? "unknown"} to {component.coverageEnd ?? "unknown"}
                </div>
                {component.knowledgeCutoff && (
                  <div className="text-xs text-gray-500">Knowledge cutoff: {component.knowledgeCutoff}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {payload.receipt.issuanceMode === "retrospective" && (
        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900">
          <p className="text-sm text-amber-700 dark:text-amber-400">
            <strong>Retrospective receipt.</strong> The receipt was sealed after the original forecast publication.
            A later blockchain timestamp proves the payload existed no later than the attestation time; it does not
            move the forecast creation time backward. This label does not mean the underlying forecast was backtested.
          </p>
        </div>
      )}

      <section>
        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Publication provenance</h3>
        <div className="text-sm text-gray-700 dark:text-gray-300">
          <p><strong>Source system:</strong> {payload.provenance.sourceSystem}</p>
          <p><strong>Source publication:</strong> {payload.provenance.sourcePublication.id}</p>
          <p><strong>Source revision:</strong> {payload.provenance.sourcePublication.revision}</p>
          <p><strong>Released:</strong> {formatTimestamp(temporal.releasedAt)}</p>
          <p><strong>Evaluation eligible:</strong> {formatTimestamp(temporal.evaluationEligibleAt)}</p>
          <p><strong>Mapping adapter:</strong> {payload.provenance.mapping.adapter} v{payload.provenance.mapping.version}</p>
        </div>
      </section>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</div>
      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{value}</div>
    </div>
  );
}

function DetailCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
      <div className="font-medium mb-1">{title}</div>
      {lines.map((line) => <div key={line} className="text-xs text-gray-500 dark:text-gray-400">{line}</div>)}
    </div>
  );
}
