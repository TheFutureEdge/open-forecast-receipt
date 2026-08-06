import { useEffect, useState } from "react";
import { Link } from "../../lib/router";
import type { CompactEasProjection, OfrDocument } from "../../types/ofr";
import { useVerification } from "../../hooks/useVerification";
import { SummaryTab } from "./SummaryTab";
import { FullJsonTab } from "./FullJsonTab";
import { PathReconstruction } from "./PathReconstruction";
import { VerificationPanel } from "./VerificationPanel";
import { TamperSandbox } from "./TamperSandbox";
import { StatusBadge } from "../common/StatusBadge";

import { findFixtureEntry, loadFixture } from "../../data/fixtures/catalog";

type Tab = "summary" | "json";

export function ReceiptDetail({ receiptDigest }: { receiptDigest: string }) {
  const entry = findFixtureEntry(receiptDigest);
  const [fixture, setFixture] = useState<{ document: OfrDocument; projection: CompactEasProjection } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setFixture(null);
    setLoadError(null);
    if (!entry) return () => { active = false; };
    loadFixture(entry)
      .then((loaded) => {
        if (active && loaded.document && loaded.projection) {
          setFixture({ document: loaded.document, projection: loaded.projection });
        }
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : "Unable to load receipt fixture");
      });
    return () => { active = false; };
  }, [entry]);

  if (!receiptDigest || !entry || loadError) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Receipt not found</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {loadError || <>No receipt with digest <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">{receiptDigest}</code></>}
        </p>
        <Link to="/manifest/batch-6" className="text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
          Back to Manifest
        </Link>
      </div>
    );
  }

  if (!fixture) {
    return <div className="p-8 text-sm text-gray-500 dark:text-gray-400">Loading receipt...</div>;
  }

  return <LoadedReceiptDetail document={fixture.document} projection={fixture.projection} />;
}

function LoadedReceiptDetail({ document, projection }: { document: OfrDocument; projection: CompactEasProjection }) {
  const [activeTab, setActiveTab] = useState<Tab>("summary");
  const payload = document.receiptPayload;
  const { result, loading } = useVerification(document, projection.protocolSuppliedAfterIssuance.attestationUID);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {payload.forecast.forecaster.name} — {payload.forecast.subject.name}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-mono truncate max-w-full">
            {document.proofEnvelope.payloadDigestSha256}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge type="integrityStatus" value={result?.integrityStatus ?? "not_checked"} />
          <StatusBadge type="chainStatus" value={result?.chainStatus ?? "not_issued"} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab("summary")}
          className={`px-4 py-2 text-sm font-medium transition-colors cursor-pointer -mb-px ${
            activeTab === "summary"
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Summary
        </button>
        <button
          onClick={() => setActiveTab("json")}
          className={`px-4 py-2 text-sm font-medium transition-colors cursor-pointer -mb-px ${
            activeTab === "json"
              ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          }`}
        >
          Full JSON
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "summary" && <SummaryTab document={document} />}
      {activeTab === "json" && <FullJsonTab document={document} />}

      {/* Path Reconstruction */}
      <PathReconstruction document={document} />

      {/* Verification Panel */}
      {loading ? (
        <div className="p-4 text-sm text-gray-400 dark:text-gray-600">Verifying...</div>
      ) : result ? (
        <VerificationPanel
          result={result}
          attestationUID={projection.protocolSuppliedAfterIssuance.attestationUID}
        />
      ) : null}

      {/* Tamper Sandbox */}
      <TamperSandbox document={document} />
    </div>
  );
}
