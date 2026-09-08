"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ChartLineUp,
  Database,
  Fingerprint,
  Receipt,
  SealCheck,
  Target,
  UserCircle,
} from "@phosphor-icons/react";
import config from "../../data/eas-base-sepolia.json";
import { getLibraryManifest } from "../../lib/library/repository";
import { useLocation } from "../../lib/router";
import { KnowledgeGraphConceptDiagram, KnowledgeGraphExamples } from "../knowledge/KnowledgeGraphArchitecture";

const InteractiveKnowledgeGraph = lazy(() =>
  import("../knowledge/InteractiveKnowledgeGraph").then((module) => ({
    default: module.InteractiveKnowledgeGraph,
  })),
);

export function StandardsPage() {
  const { hash } = useLocation();
  const [proofCounts, setProofCounts] = useState({ selected: 0, verified: 0 });

  useEffect(() => {
    if (!hash) return;
    const targetId = decodeURIComponent(hash.slice(1));
    window.requestAnimationFrame(() => {
      document.getElementById(targetId)?.scrollIntoView({ block: "start", behavior: "auto" });
    });
  }, [hash]);

  useEffect(() => {
    getLibraryManifest("batch-6")
      .then((manifest) => {
        if (manifest) {
          setProofCounts({
            selected: manifest.selectedProofCount,
            verified: manifest.verifiedProofCount,
          });
        }
      })
      .catch(() => undefined);
  }, []);

  const selectedCount = proofCounts.selected;
  const verifiedCount = proofCounts.verified;
  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="overflow-hidden rounded-3xl border border-blue-100 bg-gradient-to-br from-white via-white to-blue-50 px-6 py-9 shadow-sm dark:border-blue-950 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/40 sm:px-9">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-600">Concept · Architecture · Standard</div>
        <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-5xl">
          How Forecast Library works
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base sm:leading-7">
          The Knowledge Graph identifies what a forecast is about. The target defines exactly what is being predicted. The Open Forecast Receipt preserves the forecast, its forecaster, timing, context, and evidence as one verifiable record.
        </p>
        <nav className="mt-7 flex flex-wrap gap-2" aria-label="How it works sections">
          <SectionLink href="#concept" label="Concept" />
          <SectionLink href="#knowledge-graph" label="Knowledge Graph" />
          <SectionLink href="#receipt-lifecycle" label="Receipt lifecycle" />
          <SectionLink href="#technical-standard" label="Technical standard" />
        </nav>
      </section>

      <section id="concept" className="scroll-mt-24">
        <SectionHeading
          eyebrow="The concept"
          title="A shared memory for forecasts"
          description="The Library answers four different questions without mixing them together."
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ConceptCard Icon={Database} question="What is it about?" answer="A governed entity and its relationships in the Knowledge Graph." />
          <ConceptCard Icon={Target} question="What is being predicted?" answer="A precise target, dimension, unit, cadence, and horizon." />
          <ConceptCard Icon={Receipt} question="What was forecast?" answer="A forecast sealed with its forecaster, timing, context, and provenance." />
          <ConceptCard Icon={Fingerprint} question="Can we trust the record?" answer="Integrity proof now; accuracy evaluation only after the target matures." />
        </div>
      </section>

      <section id="knowledge-graph" className="scroll-mt-24 space-y-4">
        <SectionHeading
          eyebrow="Knowledge Graph"
          title="Entity, target, and forecast are different objects"
          description="An entity is a stable real-world or conceptual thing. A target is a measurable property or outcome applied to that entity. A forecast is one forecaster's prediction for that approved subject-target binding."
        />
        <Suspense
          fallback={(
            <div className="grid h-80 place-items-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              Loading interactive knowledge graph…
            </div>
          )}
        >
          <InteractiveKnowledgeGraph />
        </Suspense>
        <KnowledgeGraphConceptDiagram />
        <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm dark:border-slate-800">
          <div className="border-b border-slate-200 bg-white px-6 py-5 dark:border-slate-800 dark:bg-slate-900 sm:px-7">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-600">Concrete examples</div>
            <h3 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">The same structure works across domains</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">Market securities and macroeconomic forecasts use the same entity-plus-target contract.</p>
          </div>
          <KnowledgeGraphExamples />
        </div>
      </section>

      <section id="receipt-lifecycle" className="scroll-mt-24">
        <SectionHeading
          eyebrow="Receipt lifecycle"
          title="From prediction to permanent, inspectable record"
          description="The forecaster produces the forecast. The receipt seals it. A blockchain proof may anchor its digest, and evaluation happens only when the target can be resolved."
        />
        <ReceiptLifecycleDiagram />
      </section>

      <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-900 dark:bg-blue-950/30">
        <h2 className="text-base font-semibold text-blue-950 dark:text-blue-100">Public submissions are reviewed manually</h2>
        <p className="mt-2 text-sm leading-6 text-blue-800 dark:text-blue-300">
          The current platform is focused on selected iPulse AI showcase assets. There are no public accounts, payment plans, or automated uploads. To propose a public forecast receipt, email{" "}
          <a className="font-semibold underline" href="mailto:support@ipulseai.com?subject=Public%20forecast%20submission">support@ipulseai.com</a>.
        </p>
      </section>

      <section id="technical-standard" className="scroll-mt-24 border-t border-slate-200 pt-8 dark:border-slate-800">
        <SectionHeading
          eyebrow="Technical standard"
          title="Open Forecast Receipt v0.1.0"
          description="The sections below define the portable JSON contract, deterministic digest, optional blockchain attestation, and current reference implementation."
        />
      </section>

      {/* What is an OFR */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">What is an Open Forecast Receipt?</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          An Open Forecast Receipt (OFR) is a structured, provenance-aware forecast record defined by the
          <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded"> ofr-core-v0.1.0</code>,
          <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded"> ofr-market-v0.1.0</code>, and
          <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded"> ofr-ai-v0.1.0</code> profiles.
          It binds a market prediction (anchor price, cadence, step returns) to cryptographic integrity verification
          and, when published, to an Ethereum Attestation Service (EAS) record on Base Sepolia.
          The goal is transparent, verifiable, and portable forecast data while making the limits of each proof explicit.
        </p>
      </section>

      {/* OFR Schema */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">OFR Schema v0.1.0</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-2">
          Every OFR follows the JSON Schema at <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">https://ipulseai.com/schemas/open-forecast-receipt/v0.1.0/schema.json</code>.
          The schema defines five required top-level sections: <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">$schema</code>,
          <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">specVersion</code>,
          <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">profiles</code>,
          <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">receiptPayload</code>, and
          <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">proofEnvelope</code>.
          The immutable payload contains receipt identity, issuer, forecast, temporal and generation provenance,
          evidence, and disclosure. The proof envelope contains the payload digest and independently mutable proofs.
          The schema uses <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">additionalProperties: false</code> to reject unknown fields.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Stable identity when tickers change</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          A ticker is a point-in-time market identifier, not the permanent identity of a company or instrument.
          Each receipt therefore binds an issuer-stable <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">subject.id</code>
          and snapshots the ticker, MIC, ISIN, and other available identifiers that applied to that forecast.
          Public asset URLs use a stable navigation slug with optional aliases. If a company changes its ticker,
          the current subject registry and URL aliases may be updated, while historical receipts, identifiers,
          digests, and attestations remain untouched.
        </p>
      </section>

      {/* Digest Computation */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Digest Computation (RFC 8785 + SHA-256)</h2>
        <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed space-y-2">
          <p>The sealed payload digest is computed as follows:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Select exactly <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">receiptPayload</code>. The proof envelope is never part of its own digest.</li>
            <li>Canonicalize the payload using the RFC 8785 JSON Canonicalization Scheme (<code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">json-canonicalize</code> v2).</li>
            <li>Compute the SHA-256 hash of the canonical UTF-8 bytes via the Web Crypto API.</li>
            <li>Compare the hex-encoded digest to <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">proofEnvelope.payloadDigestSha256</code>.</li>
          </ol>
        </div>
      </section>

      {/* EAS Attestation */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">EAS Attestation (Base Sepolia)</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          When published, an OFR's key fields (17 fields covering market identity, prediction parameters, and the
          receipt digest) are encoded as an EAS attestation on Base Sepolia (chain ID 84532) at contract
          <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded"> 0x4200...0021</code>.
          The EAS schema uses <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">bytes32 receiptDigest</code> and is non-revocable.
          Its deterministic schema UID is <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">{config.schemaUid}</code>.
          The initial retrospective showcase selects {selectedCount} receipts across all five public assets; {verifiedCount} currently have verified attestations.
        </p>
      </section>

      {/* Blockchain Status */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Blockchain Status</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          The blockchain status axis shows whether the receipt's digest has been attested onchain.
          A selected but unissued receipt remains explicitly labeled <strong>not_issued</strong>.
          When a real UID is available, the app reads the Base Sepolia EAS contract, ABI-decodes all 17 fields, and compares the onchain digest against the locally computed
          digest and reports one of: verified, revoked, pending, or unavailable.
        </p>
      </section>

      {/* Canonical Fixture Info */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Canonical Fixture: PepsiCo Batch 6 / Ray Dalio</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          The PepsiCo/Ray Dalio fixture is the canonical data source for this explorer. It represents Batch 6,
          run 6, revision 2 of the iPulse AI forecast pipeline for PepsiCo, Inc. (PEP:XNAS). The fixture is a
          <strong> retrospective</strong> receipt — created after the original forecast was published — and carries
          <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded"> issuanceMode: "retrospective"</code>.
          The forecast was generated by the <strong>Gemini 3.1 Pro</strong> AI model (Google DeepMind), using the
          <strong>Ray Dalio / The Strategist / RESEARCHER</strong> advisor persona. The 20-step forecast starts with
          <strong> -4.00%</strong> and <strong>-3.00%</strong> step returns. The compact onchain projection stores those
          same values internally as -400 and -300 basis points so it can use deterministic integers. The terminal reconstructed price is approximately <strong>$180.61</strong>
          (anchor $144.22 × compound 25.23% return). Its researcher response was generated at
          <strong> 2026-07-05 14:48:47 UTC</strong>. The canonical payload digest is
          <code className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded"> 85e82d4748...60ea4a5</code>.
        </p>
      </section>

      {/* Data Sources */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Data Sources</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          The public Library reads published collections, subjects, forecast indexes, receipts, and proof metadata
          from Cloud Firestore. The original reviewed Batch 6 JSON examples remain only as immutable test vectors
          and as the one-time source for the controlled Firestore import; the running application does not use them
          as its database. A Base Sepolia RPC read occurs only when a receipt has a non-null attestation UID.
        </p>
      </section>

      {/* Limitations */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-400 mb-3">Limitations</h2>
        <ul className="list-disc list-inside text-sm text-gray-500 dark:text-gray-400 space-y-1">
          <li><strong>The receipt proves integrity and publication timing, not correctness.</strong> A valid digest confirms the document has not been tampered with; it does not validate the forecast's accuracy.</li>
          <li>{verifiedCount} of the {selectedCount} selected showcase receipts currently verify on Base Sepolia; unselected receipts make no onchain-proof claim.</li>
          <li>All 60 Phase 1 advisor receipts are retrospective examples. Blockchain time must remain distinct from the original forecast time.</li>
          <li><strong>Named forecasters are software advisor personas.</strong> The receipt does not claim endorsement by or affiliation with the named person.</li>
          <li>This is an example retrospective receipt. The blockchain timestamp (when issued) must not be presented as the forecast creation time.</li>
          <li>The Batch 6 context snapshot is a reconstructed backfill and is labeled accordingly.</li>
          <li>Researcher web search was configured, but result-level grounding was not retained; actual execution and retrieved evidence remain unknown.</li>
          <li>No real-time market data — the Library preserves published forecast snapshots.</li>
          <li>Public browsing is anonymous and read-only. Publishing and blockchain issuance are restricted server-side operator workflows.</li>
          <li>This is experimental educational content. Not investment advice.</li>
        </ul>
      </section>

      {/* Origin */}
      <section className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900">
        <p className="text-sm text-blue-700 dark:text-blue-400">
          The first reference implementation began during the <strong>AI Factory Hackathon</strong> with <strong>builder.nativelyai.com</strong>. It is now maintained by Future Edge Group as the public iPulse AI forecast showcase and open-source verification toolkit.
        </p>
      </section>
    </div>
  );
}

function SectionLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-white px-3 py-2 text-xs font-semibold text-blue-700 shadow-sm hover:border-blue-300 dark:border-blue-900 dark:bg-slate-900 dark:text-blue-300">
      {label} <ArrowRight size={13} />
    </a>
  );
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="max-w-4xl">
      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">{eyebrow}</div>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
    </div>
  );
}

function ConceptCard({ Icon, question, answer }: { Icon: typeof Database; question: string; answer: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"><Icon size={21} weight="duotone" /></div>
      <h3 className="mt-4 text-sm font-bold text-slate-950 dark:text-white">{question}</h3>
      <p className="mt-1.5 text-xs leading-5 text-slate-500 dark:text-slate-400">{answer}</p>
    </article>
  );
}

const receiptLifecycle = [
  {
    Icon: UserCircle,
    step: "1",
    title: "Forecaster",
    text: "A human, AI model, algorithm, ensemble, hybrid, or organization produces a forecast.",
  },
  {
    Icon: ChartLineUp,
    step: "2",
    title: "Forecast",
    text: "Predicted values are tied to one approved entity-target binding and horizon.",
  },
  {
    Icon: Receipt,
    step: "3",
    title: "Receipt",
    text: "The forecast, timing, context boundaries, evidence, and provenance are sealed together.",
  },
  {
    Icon: SealCheck,
    step: "4",
    title: "Proof",
    text: "An optional blockchain attestation anchors the receipt digest without claiming accuracy.",
  },
  {
    Icon: ChartLineUp,
    step: "5",
    title: "Evaluation",
    text: "After maturity, the forecast is compared with the governed observed outcome.",
  },
] as const;

function ReceiptLifecycleDiagram() {
  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40 sm:p-5">
      <div className="grid gap-2 xl:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr] xl:items-stretch">
        {receiptLifecycle.map(({ Icon, step, title, text }, index) => (
          <div key={title} className="contents">
            <article className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between gap-3">
                <div className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"><Icon size={19} weight="duotone" /></div>
                <div className="text-[10px] font-black text-slate-300 dark:text-slate-700">{step}</div>
              </div>
              <h3 className="mt-3 text-sm font-bold text-slate-950 dark:text-white">{title}</h3>
              <p className="mt-1 text-[10px] leading-4 text-slate-500">{text}</p>
            </article>
            {index < receiptLifecycle.length - 1 && (
              <div className="flex items-center justify-center text-blue-400" aria-hidden="true">
                <ArrowDown className="xl:hidden" size={18} />
                <ArrowRight className="hidden xl:block" size={18} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
