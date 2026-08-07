import { useState, useCallback } from "react";
import type { OfrDocument } from "../types/ofr";
import type { VerificationResult } from "../types/verification";
import { verifyDocument } from "../lib/verify/pipeline";

interface TamperState {
  originalDoc: OfrDocument;
  tamperedDoc: OfrDocument;
  result: VerificationResult | null;
  loading: boolean;
  active: boolean;
}

interface UseTamperSandboxResult {
  tamperedDoc: OfrDocument | null;
  result: VerificationResult | null;
  loading: boolean;
  active: boolean;
  setStepReturnBps: (index: number, value: number) => void;
  reset: () => void;
}

export function useTamperSandbox(
  document: OfrDocument | undefined
): UseTamperSandboxResult {
  const [state, setState] = useState<TamperState | null>(null);

  const updateVerification = useCallback(
    async (doc: OfrDocument) => {
      const result = await verifyDocument(doc);
      setState((prev) =>
        prev ? { ...prev, result, loading: false } : null
      );
    },
    []
  );

  const init = useCallback(() => {
    if (!document) return;
    const cloned = structuredClone(document);
    setState({
      originalDoc: cloned,
      tamperedDoc: cloned,
      result: null,
      loading: false,
      active: true,
    });
    // Run initial verification
    verifyDocument(cloned).then((result) => {
      setState((prev) =>
        prev ? { ...prev, result, loading: false } : null
      );
    });
  }, [document]);

  const setStepReturnBps = useCallback(
    (index: number, value: number) => {
      if (!state) {
        if (document) {
          init();
        }
        return;
      }

      const steps = state.tamperedDoc.receiptPayload.forecast.prediction.points.map((p) => p.value);
      steps[index] = value;

      const newDoc = structuredClone(state.tamperedDoc);
      newDoc.receiptPayload.forecast.prediction.points =
        newDoc.receiptPayload.forecast.prediction.points.map((p, i) => ({
        ...p,
        value: steps[i] ?? p.value,
      }));

      setState((prev) =>
        prev ? { ...prev, tamperedDoc: newDoc, loading: true } : null
      );
      updateVerification(newDoc);
    },
    [state, document, init, updateVerification]
  );

  const reset = useCallback(() => {
    if (!state) return;
    setState({
      ...state,
      tamperedDoc: structuredClone(state.originalDoc),
      loading: true,
    });
    verifyDocument(state.originalDoc).then((result) => {
      setState((prev) =>
        prev ? { ...prev, result, loading: false } : null
      );
    });
  }, [state]);

  if (!document) {
    return {
      tamperedDoc: null,
      result: null,
      loading: false,
      active: false,
      setStepReturnBps,
      reset,
    };
  }

  if (!state) {
    return {
      tamperedDoc: document,
      result: null,
      loading: false,
      active: true,
      setStepReturnBps,
      reset,
    };
  }

  return {
    tamperedDoc: state.tamperedDoc,
    result: state.result,
    loading: state.loading,
    active: state.active,
    setStepReturnBps,
    reset,
  };
}
