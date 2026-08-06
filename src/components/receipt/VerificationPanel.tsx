import type { VerificationResult } from "../../types/verification";
import { StatusBadge } from "../common/StatusBadge";

interface VerificationPanelProps {
  result: VerificationResult;
  attestationUID?: string | null;
}

export function VerificationPanel({ result, attestationUID }: VerificationPanelProps) {
  const showReadFromChain = Boolean(attestationUID);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Verification</h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Three status axes */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Data:</span>
            <StatusBadge type="dataStatus" value={result.dataStatus} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Integrity:</span>
            <StatusBadge type="integrityStatus" value={result.integrityStatus} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Chain:</span>
            <StatusBadge type="chainStatus" value={result.chainStatus} />
          </div>
        </div>

        {/* Digests */}
        {result.computedDigest && result.documentDigest && (
          <div className="space-y-2 text-xs font-mono">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Sealed Payload Digest: </span>
              <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{result.documentDigest}</code>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Computed Digest: </span>
              <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">{result.computedDigest}</code>
              <span className={`ml-2 text-xs ${result.integrityStatus === "pass" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                {result.integrityStatus === "pass" ? "✓ Matches" : "✗ Mismatch"}
              </span>
            </div>
          </div>
        )}

        {/* Chain status */}
        {result.chainStatus === "not_issued" && !showReadFromChain && (
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400">
            No attestation has been published on Base Sepolia for this receipt yet. Chain verification is not available.
          </div>
        )}

        {/* Read from chain button */}
        {showReadFromChain ? (
          <button
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors cursor-pointer active:scale-95"
          >
            Read from Chain
          </button>
        ) : (
          <button
            disabled
            className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-600 text-sm cursor-not-allowed"
          >
            Read from Chain (unavailable)
          </button>
        )}

        {/* Retrospective */}
        {result.isRetrospective && (
          <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-600 dark:text-amber-400">
            The receipt was issued retrospectively for an earlier forecast. This does not mean the forecast itself was backtested.
          </div>
        )}

        {/* Failure details */}
        {result.failureReason && result.failureDetails && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
            <div className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase">
              {result.failureReason}
            </div>
            <div className="text-xs text-red-500 dark:text-red-400 mt-1">
              {result.failureDetails}
            </div>
          </div>
        )}

        {/* Schema errors */}
        {result.schemaErrors && result.schemaErrors.length > 0 && (
          <div className="space-y-1">
            <div className="text-xs font-semibold text-red-600 dark:text-red-400">Schema Errors:</div>
            {result.schemaErrors.map((err, i) => (
              <div key={i} className="text-xs text-red-500 dark:text-red-400 font-mono">
                {err}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
