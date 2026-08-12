import { useState, useCallback, useEffect } from "react";
import { ArrowCounterClockwise, CheckCircle, Fingerprint, XCircle } from "@phosphor-icons/react";
import type { OfrDocument } from "../../types/ofr";
import type { VerificationResult } from "../../types/verification";
import { verifyDocument } from "../../lib/verify/pipeline";
import { percentToBps } from "../../lib/convert/basisPoints";

interface TamperSandboxProps {
  document: OfrDocument;
}

export function TamperSandbox({ document }: TamperSandboxProps) {
  const getOriginalSteps = useCallback(
    () => document.receiptPayload.forecast.prediction.points.map((point) => point.value),
    [document],
  );
  const [steps, setSteps] = useState<number[]>(() => getOriginalSteps());
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runVerification = useCallback(async (tamperedSteps: number[]) => {
    setLoading(true);
    const tamperedDocument = structuredClone(document);
    tamperedDocument.receiptPayload.forecast.prediction.points = tamperedDocument.receiptPayload.forecast.prediction.points.map((point, index) => ({
      ...point,
      value: tamperedSteps[index] ?? point.value,
    }));
    try {
      setResult(await verifyDocument(tamperedDocument));
    } finally {
      setLoading(false);
    }
  }, [document]);

  useEffect(() => {
    const original = getOriginalSteps();
    setSteps(original);
    void runVerification(original);
  }, [getOriginalSteps, runVerification]);

  const handleChange = useCallback((index: number, percentValue: number) => {
    const next = [...steps];
    next[index] = percentToBps(percentValue);
    setSteps(next);
    void runVerification(next);
  }, [steps, runVerification]);

  const handleReset = useCallback(() => {
    const original = getOriginalSteps();
    setSteps(original);
    void runVerification(original);
  }, [getOriginalSteps, runVerification]);

  const passed = result?.integrityStatus === "pass";

  return (
    <section id="tamper-test" className="scroll-mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Fingerprint size={18} weight="duotone" className="text-blue-600" aria-hidden="true" />
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Try the integrity test</h3>
            <p className="text-[10px] text-slate-500">Change one return and watch verification react</p>
          </div>
        </div>
        <button onClick={handleReset} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:text-slate-300">
          <ArrowCounterClockwise size={14} weight="bold" /> Reset
        </button>
      </div>

      <div className="p-4">
        {result && (
          <div className={`mb-4 flex items-center gap-3 rounded-xl border px-4 py-3 ${passed ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30" : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"}`}>
            {passed ? <CheckCircle size={24} weight="fill" className="text-emerald-600" /> : <XCircle size={24} weight="fill" className="text-red-600" />}
            <div className="min-w-0">
              <div className={`text-xs font-bold ${passed ? "text-emerald-800 dark:text-emerald-200" : "text-red-800 dark:text-red-200"}`}>Integrity: {passed ? "PASS" : "FAIL"}</div>
              <p className={`mt-0.5 text-[11px] ${passed ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}>
                {passed ? "The values below still match the sealed receipt." : "A changed value creates a different digest immediately."}
              </p>
            </div>
            {loading && <span className="ml-auto text-[10px] text-slate-400">Checking…</span>}
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 xl:grid-cols-10">
          {steps.map((value, index) => {
            const changed = value !== document.receiptPayload.forecast.prediction.points[index].value;
            return (
              <label key={index} className={`rounded-lg border p-2 text-center ${changed ? "border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30" : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800"}`}>
                <span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-400">Step {index + 1}</span>
                <span className="flex items-center justify-center gap-0.5">
                  <input
                    type="number"
                    value={Number((value / 100).toFixed(2))}
                    step="0.01"
                    aria-label={`Step ${index + 1} return in percent`}
                    onChange={(event) => handleChange(index, Number.parseFloat(event.target.value) || 0)}
                    className="w-full min-w-0 bg-transparent text-right text-xs font-bold text-slate-800 outline-none dark:text-slate-100"
                  />
                  <span className="text-[10px] font-semibold text-slate-400">%</span>
                </span>
              </label>
            );
          })}
        </div>
        <p className="mt-3 text-center text-[10px] leading-4 text-slate-400">This demonstration runs entirely in your browser and never writes a modified value to the blockchain.</p>
      </div>
    </section>
  );
}
