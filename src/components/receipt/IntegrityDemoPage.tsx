import { useEffect, useState } from "react";
import { ArrowRight, Fingerprint, ShieldCheck } from "@phosphor-icons/react";
import { Link } from "../../lib/router";
import {
  getLibraryReceipt,
  getLibraryEntity,
  listLibraryForecasts,
} from "../../lib/library/repository";
import type { OfrDocument } from "../../types/ofr";
import { TamperSandbox } from "./TamperSandbox";

export function IntegrityDemoPage() {
  const [document, setDocument] = useState<OfrDocument | null>(null);
  const [featuredDigest, setFeaturedDigest] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getLibraryEntity("batch-6", "pepsi")
      .then(async (entity) => {
        if (!entity) return null;
        const forecasts = await listLibraryForecasts("batch-6", entity.entityId);
        const featured = forecasts.find((forecast) => forecast.showcaseSelected) || forecasts[0];
        if (!featured) return null;
        const receipt = await getLibraryReceipt(featured.receiptDigest);
        return { receipt, digest: featured.receiptDigest };
      })
      .then((result) => {
        if (!active) return;
        if (!result?.receipt) {
          setError("The featured receipt is not available.");
          return;
        }
        setFeaturedDigest(result.digest);
        setDocument(result.receipt.document);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load the receipt.");
      });

    return () => { active = false; };
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-6 shadow-sm sm:p-8 dark:border-blue-950 dark:from-slate-900 dark:to-blue-950/40">
        <div className="flex items-start gap-4">
          <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-600 text-white shadow-sm">
            <Fingerprint size={23} weight="duotone" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600">Interactive browser test</div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl dark:text-white">Change one forecast value. See the receipt fail.</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              The example below is a real sanitized PepsiCo forecast receipt from the iPulse AI showcase. It starts with integrity PASS. Change any percentage and the SHA-256 digest changes, producing FAIL. Reset restores the sealed values.
            </p>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        <ShieldCheck size={17} weight="duotone" className="shrink-0 text-blue-600" />
        This test runs only in your browser. It never changes the saved receipt or writes anything to a blockchain.
      </div>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : document ? (
        <TamperSandbox document={document} />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400 dark:border-slate-800 dark:bg-slate-900">Loading the featured receipt...</div>
      )}

      {featuredDigest && (
        <div className="flex justify-end">
          <Link to={`/receipts/${featuredDigest}`} className="inline-flex items-center gap-2 text-xs font-semibold text-blue-700 hover:underline dark:text-blue-300">
            Inspect the complete PepsiCo receipt <ArrowRight size={14} weight="bold" />
          </Link>
        </div>
      )}
    </div>
  );
}
