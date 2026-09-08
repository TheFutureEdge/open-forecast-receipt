import type { ReactNode } from "react";
import { ArrowSquareOut, CheckCircle, Fingerprint, GitBranch, LockKey, Scales, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { Link } from "../../lib/router";

interface InformationSection {
  heading: string;
  body: ReactNode;
}

function InformationPage({ eyebrow, title, summary, sections, updated = "28 August 2026" }: {
  eyebrow: string;
  title: string;
  summary: string;
  sections: InformationSection[];
  updated?: string;
}) {
  return (
    <article className="mx-auto max-w-5xl space-y-5">
      <header className="overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-white via-white to-blue-50 p-7 shadow-sm dark:border-blue-950 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/30 sm:p-10">
        <div className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600">{eyebrow}</div>
        <h1 className="mt-4 max-w-4xl text-3xl font-black tracking-tight text-slate-950 sm:text-5xl dark:text-white">{title}</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 dark:text-slate-300">{summary}</p>
        <p className="mt-5 text-xs text-slate-400">Last updated {updated}</p>
      </header>
      <div className="grid gap-4">
        {sections.map((section) => (
          <section key={section.heading} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
            <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">{section.heading}</h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{section.body}</div>
          </section>
        ))}
      </div>
    </article>
  );
}

export function AboutPage() {
  return <InformationPage
    eyebrow="About Forecast Library"
    title="A public memory for forecasts"
    summary="Forecast Library makes forecasts durable, inspectable, and comparable without confusing a prediction, its evidence, its receipt, and its eventual outcome."
    sections={[
      { heading: "The problem", body: <p>Forecasts often disappear into reports, dashboards, and model outputs. Their original wording, timing, context, and assumptions become difficult to recover. That makes honest evaluation—and institutional learning—far harder than it should be.</p> },
      { heading: "The Library", body: <><p>Forecast Library organizes stable entities, approved targets, forecasters, forecasts, receipts, optional proofs, and later evaluations as separate linked records.</p><p>The first public publisher is <a href="https://ipulseai.com" className="font-semibold text-blue-600 hover:underline">iPulse AI</a>, the open agentic investment research platform built by Future Edge Group FZE.</p></> },
      { heading: "The open standard underneath", body: <p><a href="https://github.com/TheFutureEdge/open-forecast-receipt" className="font-semibold text-blue-600 hover:underline">Open Forecast Receipt</a> is the open-source receipt standard and verification toolkit. Forecast Library is the public product that indexes and presents records built on that standard.</p> },
    ]}
  />;
}

export function TrustPage() {
  return <InformationPage
    eyebrow="Trust center"
    title="What Forecast Library proves—and what it cannot"
    summary="Trust comes from precise claims. A receipt proves integrity of a sealed payload; an optional blockchain attestation adds public timing evidence. Neither proves that a forecast is true or accurate."
    sections={[
      { heading: "Integrity", body: <p className="flex gap-3"><Fingerprint className="mt-1 shrink-0 text-blue-600" size={22} /> The Library recomputes the canonical SHA-256 digest of a receipt payload. A match shows that the displayed payload has not changed since it was sealed.</p> },
      { heading: "Optional public proof", body: <p className="flex gap-3"><GitBranch className="mt-1 shrink-0 text-violet-600" size={22} /> A per-receipt blockchain attestation can independently anchor the receipt digest and publication timing. Proof is optional and is never presented as proof of accuracy.</p> },
      { heading: "Evaluation", body: <p className="flex gap-3"><CheckCircle className="mt-1 shrink-0 text-emerald-600" size={22} /> A forecast is evaluated only after its target horizon matures and the governed observed outcome is available. Corrections are append-only and never silently overwrite the original record.</p> },
      { heading: "Security and reporting", body: <><p className="flex gap-3"><ShieldCheck className="mt-1 shrink-0 text-slate-700 dark:text-slate-200" size={22} /> Public clients have read-only access to explicitly public Firestore namespaces. Publishing, proof issuance, signer state, and operational records remain server-controlled through Google Cloud IAM.</p><p>Report security or data-integrity concerns to <a href="mailto:support@ipulseai.com" className="font-semibold text-blue-600 hover:underline">support@ipulseai.com</a>.</p></> },
    ]}
  />;
}

export function PrivacyPage() {
  return <InformationPage
    eyebrow="Legal and trust"
    title="Privacy policy"
    summary="Forecast Library is designed as a public research library. During this publication phase it does not offer public accounts, payments, or self-service submissions."
    sections={[
      { heading: "Information we process", body: <p>Our hosting and security providers may process ordinary request data such as IP address, user agent, requested URL, timestamps, and diagnostic logs. If you email us, we process the information you provide so we can respond.</p> },
      { heading: "Public forecast records", body: <p>Published forecasts, forecaster profiles, entity records, receipts, and proofs are intentionally public. Do not submit confidential, personal, licensed, or restricted information for publication.</p> },
      { heading: "Service providers and retention", body: <p>The service uses Google Cloud and Firebase infrastructure. Operational logs are retained only as needed for security, reliability, abuse prevention, and legal obligations. Public research records may be retained indefinitely to preserve audit history.</p> },
      { heading: "Contact", body: <p>For privacy questions or requests, contact <a href="mailto:support@ipulseai.com" className="font-semibold text-blue-600 hover:underline">support@ipulseai.com</a>. Applicable rights depend on your location and the nature of the data.</p> },
    ]}
  />;
}

export function TermsPage() {
  return <InformationPage
    eyebrow="Legal and trust"
    title="Terms of service"
    summary="By using Forecast Library, you agree to use its public research records lawfully and to verify important information independently."
    sections={[
      { heading: "Permitted use", body: <p>You may browse, link to, and independently verify public records. Automated access must respect published technical controls, reasonable rate limits, intellectual-property rights, and applicable law.</p> },
      { heading: "No investment service", body: <p>Forecast Library provides experimental research records. It does not provide personalized investment advice, brokerage, execution, fiduciary services, or a recommendation to buy or sell any asset.</p> },
      { heading: "No warranty", body: <p>The service and records are provided on an “as available” basis. Forecasts may be wrong, incomplete, delayed, or based on imperfect evidence. To the extent permitted by law, Future Edge Group disclaims implied warranties and liability for decisions made from these records.</p> },
      { heading: "Responsible use", body: <p>Do not attempt to disrupt the service, bypass access controls, impersonate a publisher, submit unlawful material, or misrepresent what a receipt or blockchain proof establishes.</p> },
    ]}
  />;
}

export function DisclaimerPage() {
  return <InformationPage
    eyebrow="Legal and trust"
    title="Forecast and investment disclaimer"
    summary="Every forecast is uncertain. A well-preserved forecast can still be wrong."
    sections={[
      { heading: "Not investment advice", body: <p>Nothing in Forecast Library is personalized financial, investment, legal, tax, or accounting advice. Historical and prospective information may not suit your objectives, circumstances, or risk tolerance.</p> },
      { heading: "Proof limitations", body: <p>Receipt verification can establish payload integrity. Blockchain attestation can establish an independently inspectable anchor and timing. Neither establishes truth, accuracy, authorship quality, legality, or sound reasoning.</p> },
      { heading: "Independent judgment", body: <p>Use primary sources, qualified professional advice, and your own due diligence before making consequential decisions. Past accuracy is not a guarantee of future performance.</p> },
    ]}
  />;
}

export function ReceiptStandardPage() {
  return <InformationPage
    eyebrow="Open standard"
    title="Open Forecast Receipt v0.1"
    summary="A machine-verifiable JSON receipt that preserves one forecast, its timing, target, forecaster, provenance, and integrity envelope without storing hidden chain-of-thought."
    sections={[
      { heading: "One forecast, one receipt", body: <p>Each individual forecast is sealed independently. Publisher collections are browsing aids and never replace the identity or digest of an individual receipt.</p> },
      { heading: "Canonical verification", body: <p>Verifiers validate the JSON Schema, canonicalize <code>receiptPayload</code> using RFC 8785, compute SHA-256, and compare it with <code>proofEnvelope.payloadDigestSha256</code>.</p> },
      { heading: "Open-source toolkit", body: <p><a href="https://github.com/TheFutureEdge/open-forecast-receipt" className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline">View the schema, encoder, decoder, and verifier on GitHub <ArrowSquareOut size={14} /></a></p> },
    ]}
  />;
}

export function StandardsOverviewPage() {
  return <InformationPage
    eyebrow="Standards directory"
    title="Open structures for durable forecasts"
    summary="Forecast Library separates the identity of a subject, the definition of a target, the forecast itself, its receipt, optional proof, and eventual evaluation."
    sections={[
      { heading: "Knowledge Graph and lifecycle", body: <p><Link to="/how-it-works" className="font-semibold text-blue-600 hover:underline">Explore how entities, targets, forecasters, forecasts, receipts, proofs, and evaluations connect.</Link></p> },
      { heading: "Open Forecast Receipt v0.1", body: <p><Link to="/standards/open-forecast-receipt/v0-1" className="font-semibold text-blue-600 hover:underline">Read the current receipt contract and verification procedure.</Link></p> },
      { heading: "Public implementation", body: <p>The Library publishes governed read models for people and crawlers while immutable receipt payloads remain independently verifiable. Public URL identities are deliberately separate from receipt digests and mutable market symbols.</p> },
    ]}
  />;
}

export function SubmissionPage() {
  return <InformationPage
    eyebrow="Public submissions"
    title="Submit a public forecast"
    summary="Self-service publishing is intentionally disabled while the public contract is stabilized. We review submissions manually during this phase."
    sections={[
      { heading: "How to request publication", body: <p>Email <a href="mailto:support@ipulseai.com?subject=Forecast%20Library%20submission" className="font-semibold text-blue-600 hover:underline">support@ipulseai.com</a> with the forecast subject, target, horizon, forecaster identity, forecast values, and evidence or provenance you can disclose.</p> },
      { heading: "What happens next", body: <p className="flex gap-3"><LockKey className="mt-1 shrink-0 text-blue-600" size={22} /> We validate the subject and target, prepare an Open Forecast Receipt, confirm publication rights, and agree whether an optional blockchain proof is requested. No payment or public account is required in this phase.</p> },
      { heading: "Editorial control", body: <p className="flex gap-3"><Scales className="mt-1 shrink-0 text-slate-700 dark:text-slate-200" size={22} /> Submission does not guarantee publication. Forecast Library may reject incomplete, unlawful, misleading, duplicated, or unverifiable material.</p> },
    ]}
  />;
}

export function NotYetPublishedPage({ title, description, backTo = "/" }: { title: string; description: string; backTo?: string }) {
  return (
    <section className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white px-7 py-16 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white">{title}</h1>
      <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300">{description}</p>
      <Link to={backTo} className="mt-7 inline-flex rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700">Return to the Library</Link>
    </section>
  );
}
