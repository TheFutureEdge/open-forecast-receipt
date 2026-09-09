import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { AppShell } from "../../../src/components/layout/AppShell";
import { LoadedReceiptDetail } from "../../../src/components/receipt/ReceiptDetail";
import { getLibraryReceiptServer } from "../../../src/lib/library/server-repository";
import { publicForecastSubjectSource } from "../../../src/lib/library/entityRoutes";

export const revalidate = 300;
const readReceipt = cache(getLibraryReceiptServer);
type Props = { params: Promise<{ digest: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { digest } = await params;
  return { title: "Immutable Forecast Receipt", description: "Inspect the original sealed forecast, verify its integrity and retrieve its canonical JSON.", alternates: { canonical: `/receipts/${digest.toLowerCase()}` } };
}
export default async function ReceiptPage({ params }: Props) {
  const digest = (await params).digest.toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(digest)) notFound();
  const receipt = await readReceipt(digest);
  if (!receipt || receipt.document.proofEnvelope.payloadDigestSha256 !== digest) notFound();
  const assetUrl = publicForecastSubjectSource(receipt);
  return <AppShell>
    <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Permanent evidence record</p>
        <h1 className="mt-2 text-2xl font-bold">Immutable forecast receipt</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">This address identifies this exact sealed payload. A correction receives a new receipt and leaves this record intact.</p>
        <p className="mt-3 break-all font-mono text-xs text-slate-500">SHA-256 {digest}</p>
        <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold text-blue-600">
          <a href={`/api/v1/receipts/${digest}`}>Open receipt JSON</a>
          {assetUrl && <a href={assetUrl.url} target="_blank" rel="noopener noreferrer">{assetUrl.label} ↗</a>}
          {receipt.originalSource?.url && <a href={receipt.originalSource.url} target="_blank" rel="noopener noreferrer">Original historical forecast ↗</a>}
        </div>
      </header>
      <LoadedReceiptDetail document={receipt.document} projection={receipt.projection} embedded />
    </div>
  </AppShell>;
}
