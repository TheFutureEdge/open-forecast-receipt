import Image from "next/image";

const transaction = "https://basescan.org/tx/0x17575c0be8e42cda1550064239a34bc578d541b4c7f16c5797408d57c1cd66ed";
const uid = "0xebe16769d597f16364c4848800cf1c87003c61e130589d9f5a94605ae6da121d";
const attestation = `https://base.easscan.org/attestation/view/${uid}`;

function Screenshot({ name, height, alt, caption }: { name: string; height: number; alt: string; caption: string }) {
  const src = `/images/blockchain-proof-guide/${name}.png`;
  return <figure className="my-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
    <a href={src} target="_blank" rel="noopener noreferrer" aria-label={`Enlarge screenshot: ${caption}`}>
      <Image src={src} width={name === "basescan-logs" ? 1240 : 1390} height={height} alt={alt} unoptimized className="h-auto w-full" />
    </a>
    <figcaption className="border-t border-slate-200 px-4 py-3 text-xs leading-5 text-slate-600">{caption} Select the image to enlarge it.</figcaption>
  </figure>;
}

export function BlockchainProofGuide() {
  return <div className="space-y-6 text-sm leading-7">
    <p>Follow a public proof from its Base transaction to the forecast values stored in Ethereum Attestation Service (EAS). Reading a proof is free: no wallet, connection, signature, or account is needed.</p>
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-slate-800">
      <strong>Already on an EAS attestation page?</strong> Skip to step 3. A Forecast Library receipt&apos;s <strong>View attestation</strong> button opens the individual forecast directly. A ledger&apos;s <strong>See blockchain proof</strong> link opens the shared transaction.
    </div>
    <p>This worked example uses <a href={transaction} target="_blank" rel="noopener noreferrer" className="font-semibold underline">Alphabet / Google, Batch 6 on Base mainnet ↗</a>. Each asset and batch has its own transaction and forecast UIDs. Use the proof linked from the forecast you are checking; these example IDs are not its proof.</p>

    <section>
      <h3 className="text-xl font-bold">1. Open Logs and copy the forecast UID</h3>
      <p className="mt-2">On BaseScan, choose <strong>Logs</strong> beside Overview. In an <strong>Attested</strong> event, find <strong>Data → uid (bytes32)</strong> and copy the complete value. The example shows Logs (12); the number varies with the submission. Each event identifies one forecast, even when several forecasts share one transaction.</p>
      <Screenshot name="basescan-logs" height={480} alt="BaseScan Logs (12), with an Attested event and its forecast UID in the bottom Data row." caption="BaseScan: copy Data → uid, not the schema value under Topics." />
      <p>The <strong>transaction hash</strong> identifies the submission. The <strong>attestation UID</strong> identifies one forecast. The <strong>schema UID</strong> identifies the shared data format. They are different identifiers.</p>
    </section>

    <section>
      <h3 className="text-xl font-bold">2. Find that UID on Base EAS Scan</h3>
      <p className="mt-2">Open <a href="https://base.easscan.org/" target="_blank" rel="noopener noreferrer" className="font-semibold underline">Base EAS Scan ↗</a>, paste the UID into its search box, and open the matching attestation result. Add <code>0x</code> at the start if BaseScan omitted it. BaseScan&apos;s event log does not currently provide a direct EAS link.</p>
      <p className="mt-2">For this example, use:</p>
      <code className="mt-2 block break-all rounded-lg bg-slate-100 p-3 text-xs text-slate-800">{uid}</code>
      <a href={attestation} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block font-semibold underline">Open the matching Google forecast attestation ↗</a>
      <p className="mt-2">Check that its UID matches. Near the bottom, <strong>Transaction ID</strong> should link back to the transaction you started from. A NVIDIA UID will not appear in Google&apos;s transaction logs.</p>
    </section>

    <section>
      <h3 className="text-xl font-bold">3. Read Decoded Data</h3>
      <p className="mt-2">Scroll to <strong>Decoded Data</strong>. Confirm the subject, batch, revision, and forecaster before reading the prediction. In this example, <code>ticker:GOOG@XNAS</code> means Google on Nasdaq, Run Number is 6, and Run Revision is 1. The named forecaster is an AI advisor persona using Gemini 3.1 Pro, not a forecast or endorsement by the real person.</p>
      <Screenshot name="eas-decoded" height={820} alt="EAS attestation UID and Decoded Data showing Google subject, batch 6, revision 1, and AI forecaster identity." caption="EAS Scan: match the UID and forecast identity before interpreting the values." />
      <Screenshot name="eas-values" height={1000} alt="Decoded forecast fields including anchor value, USD unit, quarterly cadence, 20 return points, receipt digest, and transaction ID." caption="The onchain record includes compact forecast values and the receipt digest." />
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[480px] text-left text-sm">
          <caption className="sr-only">How to interpret this market forecast&apos;s decoded fields</caption>
          <thead className="bg-slate-100 text-slate-900"><tr><th scope="col" className="p-3">Field</th><th scope="col" className="p-3">How to read this example</th></tr></thead>
          <tbody className="divide-y divide-slate-200">
            <tr><th scope="row" className="p-3">Anchor Value Micros</th><td className="p-3">356180000 ÷ 1,000,000 = $356.18. Anchor Unit is USD.</td></tr>
            <tr><th scope="row" className="p-3">Cadence Months / Point Count</th><td className="p-3">3 months × 20 points = a five-year path.</td></tr>
            <tr><th scope="row" className="p-3">Step Return Bps</th><td className="p-3">Divide each value by 100 for a percentage. −800 means −8%, not −800%. Returns apply sequentially to the previous point.</td></tr>
            <tr><th scope="row" className="p-3">Forecast Created At / Anchor At</th><td className="p-3">Unix timestamps in seconds: forecast generation time and the starting market observation time. Neither is the blockchain publication time.</td></tr>
            <tr><th scope="row" className="p-3">Created / Retrospective</th><td className="p-3">The explorer&apos;s Created time is the onchain anchoring time (display timezone may vary). Retrospective = True means this anchor was published after the forecast.</td></tr>
            <tr><th scope="row" className="p-3">Receipt Digest</th><td className="p-3">The SHA-256 fingerprint linking this onchain projection to the complete receipt payload.</td></tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3">These units describe the current market receipt profile. Other forecasting domains or schema versions may use different fields; always read the linked schema.</p>
    </section>

    <section>
      <h3 className="text-xl font-bold">4. Compare it with the complete receipt</h3>
      <p className="mt-2">Open the corresponding Forecast Library receipt and download its JSON. The blockchain contains a compact forecast projection and digest; the receipt contains the fuller context and provenance. To verify the payload independently, canonicalize <code>receiptPayload</code> with RFC 8785 and compute SHA-256. Compare that digest with <strong>Receipt Digest</strong> on EAS (ignoring only the hexadecimal <code>0x</code> prefix). Hashing the entire JSON file, including its proof envelope, will not produce the same digest.</p>
      <p className="mt-2"><a href="https://forecastlibrary.com/forecasts/f-0yj8rsm58rz1esq1f6cz2z3d5c" target="_blank" rel="noopener noreferrer" className="font-semibold underline">Open this example&apos;s complete forecast receipt ↗</a></p>
      <p className="mt-2"><a href="https://forecastlibrary.com/standards/open-forecast-receipt/v0-1" target="_blank" rel="noopener noreferrer" className="font-semibold underline">Receipt format and verification procedure ↗</a></p>
    </section>
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-slate-800"><strong>What this establishes.</strong> A matching verified anchor provides evidence that the committed record existed by its blockchain anchoring time. It does not prove forecast accuracy, authorship, or that a retrospective forecast existed onchain on its original date. Check the network: this example is Base mainnet; Base Sepolia is a separate test network.</div>
    <p className="text-xs text-slate-500">Screenshots captured from public BaseScan and Base EAS Scan pages on 12 September 2026. Explorer layouts may change. This is a read-only tutorial.</p>
  </div>;
}
