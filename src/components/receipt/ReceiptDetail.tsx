import { useEffect, useState } from "react";
import { ArrowSquareOut, FileText } from "@phosphor-icons/react";
import { Link } from "../../lib/router";
import type { CompactEasProjection, OfrDocument } from "../../types/ofr";
import { useVerification } from "../../hooks/useVerification";
import { SummaryTab } from "./SummaryTab";
import { FullJsonTab } from "./FullJsonTab";
import { VerificationPanel } from "./VerificationPanel";
import { TamperSandbox } from "./TamperSandbox";
import { StatusBadge } from "../common/StatusBadge";
import { presentForecaster } from "../../lib/forecasters/presentation";

import { getLibraryReceipt } from "../../lib/library/repository";

type Tab = "summary" | "json";

export function ReceiptDetail({ receiptDigest }: { receiptDigest: string }) {
  const [fixture, setFixture] = useState<{ document: OfrDocument; projection: CompactEasProjection } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setFixture(null);
    setLoadError(null);
    setLoading(true);
    getLibraryReceipt(receiptDigest)
      .then((loaded) => {
        if (active && loaded) {
          setFixture({ document: loaded.document, projection: loaded.projection });
        }
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : "Unable to load receipt");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [receiptDigest]);

  if (loading) {
    return <div className="p-8 text-sm text-gray-500 dark:text-gray-400">Loading receipt…</div>;
  }

  if (!receiptDigest || !fixture || loadError) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Receipt not found</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {loadError || <>No receipt with digest <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">{receiptDigest}</code></>}
        </p>
        <Link to="/showcase" className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
          Back to iPulse AI showcase
        </Link>
      </div>
    );
  }

  return <LoadedReceiptDetail document={fixture.document} projection={fixture.projection} />;
}

export function LoadedReceiptDetail({
  document,
  projection,
  embedded = false,
}: {
  document: OfrDocument;
  projection: CompactEasProjection;
  embedded?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<Tab>("summary");
  const payload = document.receiptPayload;
  const forecaster = presentForecaster(payload.forecast);
  const { result, loading } = useVerification(document, projection.protocolSuppliedAfterIssuance.attestationUID);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600">Individual forecast receipt</div>
          <h2 className={`${embedded ? "text-xl" : "text-2xl"} font-bold tracking-tight text-slate-950 dark:text-white`}>
            {forecaster.displayName}
          </h2>
          <p className="mt-1 text-xs font-medium text-slate-600 dark:text-slate-300">
            {forecaster.description}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-500">
            <span>{forecaster.typeLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{forecaster.implementationLabel}</span>
            <span aria-hidden="true">·</span>
            <span>{forecaster.reviewStatusLabel}</span>
            <span aria-hidden="true">·</span>
            <span>Forecast for {payload.forecast.entity.name}</span>
            <span aria-hidden="true">·</span>
            <span>Created {new Date(payload.forecast.temporal.forecastCreatedAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge type="integrityStatus" value={result?.integrityStatus ?? "not_checked"} />
          <StatusBadge type="chainStatus" value={result?.chainStatus ?? "not_issued"} />
          {embedded && (
            <Link
              to={`/receipts/${document.proofEnvelope.payloadDigestSha256}`}
              className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900"
              aria-label="Open full receipt"
            >
              <ArrowSquareOut size={16} weight="bold" />
            </Link>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("summary")}
          className={`-mb-px border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            activeTab === "summary"
              ? "border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-300"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          Summary
        </button>
        <button
          onClick={() => setActiveTab("json")}
          className={`-mb-px flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            activeTab === "json"
              ? "border-blue-600 text-blue-700 dark:border-blue-400 dark:text-blue-300"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
        >
          <FileText size={14} /> Receipt JSON
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "summary" && <SummaryTab document={document} />}
      {activeTab === "json" && <FullJsonTab document={document} />}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">Verifying receipt…</div>
      ) : result ? (
        <VerificationPanel
          result={result}
          attestationUID={projection.protocolSuppliedAfterIssuance.attestationUID}
          transactionHash={projection.protocolSuppliedAfterIssuance.transactionHash}
          schemaUID={projection.protocolSuppliedAfterIssuance.schemaUID}
          attester={projection.protocolSuppliedAfterIssuance.attester}
          blockTimestamp={projection.protocolSuppliedAfterIssuance.blockTimestamp}
        />
      ) : null}

      {/* Tamper Sandbox */}
      <TamperSandbox document={document} />
    </div>
  );
}
