import { useState, useCallback, useEffect } from "react";
import type { OfrDocument } from "../../types/ofr";
import type { VerificationResult } from "../../types/verification";
import { verifyDocument } from "../../lib/verify/pipeline";

interface TamperSandboxProps {
  document: OfrDocument;
}

export function TamperSandbox({ document }: TamperSandboxProps) {
  const getOriginalSteps = useCallback(() => {
    return document.receiptPayload.forecast.prediction.points.map((p) => p.value);
  }, [document]);

  const [steps, setSteps] = useState<number[]>(() => getOriginalSteps());
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runVerification = useCallback(async (tamperedSteps: number[]) => {
    setLoading(true);
    const tamperedDoc = structuredClone(document);
    tamperedDoc.receiptPayload.forecast.prediction.points = tamperedDoc.receiptPayload.forecast.prediction.points.map((p, i) => ({
      ...p,
      value: tamperedSteps[i] ?? p.value,
    }));
    try {
      const res = await verifyDocument(tamperedDoc);
      setResult(res);
    } catch {
      // ignore
    }
    setLoading(false);
  }, [document]);

  useEffect(() => {
    runVerification(steps);
  }, []); // Run initial verification on mount

  const handleChange = useCallback((index: number, value: number) => {
    const newSteps = [...steps];
    newSteps[index] = value;
    setSteps(newSteps);
    runVerification(newSteps);
  }, [steps, runVerification]);

  const handleReset = useCallback(() => {
    const original = document.receiptPayload.forecast.prediction.points.map((p) => p.value);
    setSteps(original);
    runVerification(original);
  }, [document, runVerification]);

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">
          Tamper Sandbox
        </h3>
        <button
          onClick={handleReset}
          className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer active:scale-95"
        >
          Reset
        </button>
      </div>

      <div className="p-4 space-y-4">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Edit any step return value below and watch the integrity check change. This is a local simulation — nothing is written onchain.
        </div>

        {/* Status indicator */}
        {result && (
          <div className={`p-3 rounded-lg text-sm font-medium ${
            result.integrityStatus === "pass"
              ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900"
              : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900"
          }`}>
            Integrity: {result.integrityStatus === "pass" ? "PASS ✓" : "FAIL ✗"}
            {result.computedDigest && (
              <span className="block text-xs font-mono mt-1 opacity-75">
                {result.computedDigest}
              </span>
            )}
          </div>
        )}

        {loading && (
          <div className="text-xs text-gray-400 dark:text-gray-600">Recomputing...</div>
        )}

        {/* Step inputs */}
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {steps.map((value, i) => (
            <div key={i} className="flex flex-col items-center">
              <label className="text-[10px] text-gray-400 dark:text-gray-600 mb-0.5">
                {i + 1}
              </label>
              <input
                type="number"
                value={value}
                onChange={(e) => handleChange(i, parseInt(e.target.value, 10) || 0)}
                className={`w-full text-center text-xs px-1 py-1.5 rounded border ${
                  value !== document.receiptPayload.forecast.prediction.points[i].value
                    ? "border-orange-400 dark:border-orange-600 bg-orange-50 dark:bg-orange-950/30"
                    : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                } text-gray-900 dark:text-gray-100`}
              />
            </div>
          ))}
        </div>

        <div className="text-[10px] text-gray-400 dark:text-gray-600 text-center">
          Modified values highlighted in orange. Click Reset to restore original.
        </div>
      </div>
    </div>
  );
}
