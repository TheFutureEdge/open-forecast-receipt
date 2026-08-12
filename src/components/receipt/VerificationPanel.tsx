import { ArrowSquareOut, CheckCircle, LinkSimple, ShieldCheck, XCircle } from "@phosphor-icons/react";
import type { VerificationResult } from "../../types/verification";
import { getBaseTransactionUrl, getEasAttestationUrl } from "../../lib/eas/constants";
import { StatusBadge } from "../common/StatusBadge";

interface VerificationPanelProps {
  result: VerificationResult;
  attestationUID?: string | null;
  transactionHash?: string | null;
  schemaUID?: string | null;
  attester?: string | null;
  blockTimestamp?: number | null;
}

export function VerificationPanel({
  result,
  attestationUID,
  transactionHash,
  schemaUID,
  attester,
  blockTimestamp,
}: VerificationPanelProps) {
  const passed = result.integrityStatus === "pass";
  const showPublicProof = Boolean(attestationUID);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} weight="duotone" className="text-blue-600" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Verification</h3>
        </div>
        <div className="flex gap-2">
          <StatusBadge type="dataStatus" value={result.dataStatus} />
          <StatusBadge type="chainStatus" value={result.chainStatus} />
        </div>
      </div>

      <div className="p-4">
        <div className={`rounded-xl border p-4 ${passed ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30" : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"}`}>
          <div className="flex items-start gap-3">
            {passed ? (
              <CheckCircle size={28} weight="fill" className="shrink-0 text-emerald-600" aria-hidden="true" />
            ) : (
              <XCircle size={28} weight="fill" className="shrink-0 text-red-600" aria-hidden="true" />
            )}
            <div className="min-w-0 flex-1">
              <div className={`text-sm font-bold ${passed ? "text-emerald-900 dark:text-emerald-100" : "text-red-900 dark:text-red-100"}`}>
                Integrity: {passed ? "PASS" : "FAIL"}
              </div>
              <p className={`mt-1 text-xs leading-5 ${passed ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}>
                {passed
                  ? "The receipt payload recomputes to the same SHA-256 digest that was sealed at issuance."
                  : "The current payload does not match the sealed digest. At least one field has changed."}
              </p>
              {result.computedDigest && (
                <code className="mt-2 block truncate rounded-md bg-white/60 px-2 py-1.5 text-[10px] text-slate-600 dark:bg-slate-950/40 dark:text-slate-300" title={result.computedDigest}>
                  {result.computedDigest}
                </code>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-100">
              <LinkSimple size={16} className={showPublicProof ? "text-blue-600" : "text-slate-400"} />
              {showPublicProof ? "Independent blockchain proof available" : "No blockchain proof published for this receipt"}
            </div>
            <p className="mt-1 text-[11px] leading-4 text-slate-500">
              {showPublicProof
                ? "Open the public EAS attestation or its Base transaction without trusting this website."
                : "The receipt can still be verified locally; blockchain anchoring is an optional second layer."}
            </p>
          </div>
          {showPublicProof && (
            <div className="flex flex-wrap gap-2">
              <a href={getEasAttestationUrl(attestationUID!)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700">
                View attestation <ArrowSquareOut size={14} weight="bold" />
              </a>
              {transactionHash && (
                <a href={getBaseTransactionUrl(transactionHash)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                  Transaction <ArrowSquareOut size={14} weight="bold" />
                </a>
              )}
            </div>
          )}
        </div>

        {showPublicProof && (
          <dl className="mt-4 grid gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 text-[10px] sm:grid-cols-3 dark:border-slate-800 dark:bg-slate-950/40">
            {schemaUID && <ProofMeta label="Schema UID" value={schemaUID} />}
            {attester && <ProofMeta label="Attester" value={attester} />}
            {blockTimestamp && <ProofMeta label="Onchain time" value={new Date(blockTimestamp * 1_000).toISOString()} />}
          </dl>
        )}

        {result.isRetrospective && (
          <p className="mt-3 text-[11px] leading-4 text-amber-700 dark:text-amber-300">This proof was issued after the underlying forecast was originally published; the dates remain separately visible.</p>
        )}

        {result.failureReason && result.failureDetails && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            <strong>{result.failureReason}:</strong> {result.failureDetails}
          </div>
        )}

        {result.schemaErrors && result.schemaErrors.length > 0 && (
          <div className="mt-3 space-y-1 rounded-lg border border-red-200 bg-red-50 p-3 text-[11px] text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            <strong>Schema errors</strong>
            {result.schemaErrors.map((error) => <code key={error} className="block">{error}</code>)}
          </div>
        )}
      </div>
    </section>
  );
}

function ProofMeta({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0"><dt className="font-semibold uppercase tracking-[0.08em] text-slate-400">{label}</dt><dd className="mt-1 truncate font-mono text-slate-600 dark:text-slate-300" title={value}>{value}</dd></div>;
}
