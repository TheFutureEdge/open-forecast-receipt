import { useState, useEffect, useCallback } from "react";
import type { VerificationResult } from "../types/verification";
import { verifyDocument } from "../lib/verify/pipeline";

interface UseVerificationResult {
  result: VerificationResult | null;
  loading: boolean;
  error: string | null;
  recheck: () => void;
}

export function useVerification(
  document: unknown | undefined,
  attestationUID?: string | null
): UseVerificationResult {
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recheck = useCallback(() => {
    if (!document) return;
    setLoading(true);
    setError(null);
    verifyDocument(document, attestationUID)
      .then(setResult)
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Verification failed");
        setResult(null);
      })
      .finally(() => setLoading(false));
  }, [document, attestationUID]);

  useEffect(() => {
    recheck();
  }, [recheck]);

  return { result, loading, error, recheck };
}