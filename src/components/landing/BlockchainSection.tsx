import { ArrowRight, Fingerprint } from "@phosphor-icons/react";
import { Link } from "../../lib/router";

export function BlockchainSection() {
  return <section id="blockchain-proof" className="border-y border-slate-800 bg-slate-950 text-white">
    <div className="mx-auto grid max-w-[1240px] gap-8 px-5 py-16 lg:grid-cols-2 lg:items-center lg:px-8">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#071425]">
        <img src="/images/forecast-blockchain-proof.webp" width={1200} height={800} loading="lazy" alt="Illustration of a forecast receipt linked by its fingerprint to a public blockchain ledger" className="h-auto w-full" />
        <p className="border-t border-white/10 px-5 py-3 text-xs text-slate-400">One forecast. One digest. An independently inspectable anchor.</p>
      </div>
      <div>
        <h2 className="flex items-center gap-3 text-3xl font-black uppercase tracking-tight text-blue-300 sm:text-4xl"><Fingerprint size={32} className="shrink-0" aria-hidden="true" /> BLOCKCHAIN PROOF</h2>
        <p className="mt-4 text-xl font-semibold leading-snug sm:text-2xl">Evidence your audience can check beyond this website.</p>
        <p className="mt-4 text-base leading-7 text-slate-300">Choose an optional public blockchain anchor when submitting your forecast receipt. Anyone can compare the downloaded record with its onchain digest and inspect the attestation, issuing address, transaction, and anchoring time.</p>
        <ol className="mt-6 space-y-4 text-sm leading-6 text-slate-300">
          <li><strong className="text-white">Seal the record.</strong> Canonical JSON and SHA-256 produce a fingerprint of the forecast payload.</li>
          <li><strong className="text-white">Anchor the fingerprint.</strong> Ethereum Attestation Service (EAS) records a compact forecast projection and digest. For each iPulse AI Showcase asset and batch, all included advisor forecasts are submitted together in one transaction. The number of forecasts can vary by asset and batch. Each receives an individual attestation ID within that submission.</li>
          <li><strong className="text-white">Verify independently.</strong> Download the full receipt, recompute its digest, and compare it with the public chain record.</li>
        </ol>
        <p className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4 text-xs leading-6 text-slate-300">The integration supports Base mainnet and Base Sepolia testnet; every issued proof identifies its actual network. A receipt is only labelled verified when its onchain proof has been checked. Retrospective anchoring proves existence by the later anchoring time, not by the original forecast date. It does not prove accuracy or authorship.</p>
        <Link to="/submit" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-500">Request blockchain proof with your submission <ArrowRight size={17} /></Link>
      </div>
    </div>
  </section>;
}

export function ReceiptFormatSection() {
  return <section id="receipt-format" className="mx-auto max-w-[1240px] px-5 py-16 lg:px-8">
    <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Open format. Independent verification.</div>
    <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">A structured forecast record you can keep and reuse.</h2>
    <div className="mt-7 grid gap-6 md:grid-cols-3">
      {[
        ["What to send", "Contact support with your forecast values, subject, target, dates, method, and public evidence. Use our submission checklist or provide an OFR JSON receipt. Support reviews publication rights and format compatibility before listing."],
        ["The current receipt format", "Open Forecast Receipt v0.1.0 uses JSON Schema, RFC 8785 canonicalization, and a SHA-256 payload digest. The live profile covers financial forecasts; human and statistical submissions are welcome for review, while other domains may require a new versioned profile."],
        ["What is preserved", "The receipt contains one forecast and its declared provenance. It is not an AI chat-history, agent-memory, or hidden chain-of-thought upload. Permanent forecast IDs and digest-addressed JSON remain stable when navigation or presentation changes."],
      ].map(([title, body]) => <article key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900"><h3 className="font-bold text-slate-950 dark:text-white">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{body}</p></article>)}
    </div>
    <div className="mt-6 flex flex-wrap gap-5 text-sm font-bold text-blue-700 dark:text-blue-300">
      <a href="/forecast-submission-template.txt" download>Submission checklist ↓</a>
      <a href="/schemas/open-forecast-receipt/v0.1.0/schema.json">JSON Schema ↗</a>
      <Link to="/standards/open-forecast-receipt/v0-1">Technical format and API →</Link>
    </div>
  </section>;
}
