"use client";

import {
  ArrowRight,
  CheckCircle,
  ClockCounterClockwise,
  Code,
  Database,
  EnvelopeSimple,
  Fingerprint,
  GlobeHemisphereWest,
  IdentificationCard,
  MagnifyingGlass,
  SealCheck,
  ShieldCheck,
  UsersThree,
  WarningCircle,
} from "@phosphor-icons/react";
import { Link } from "../../lib/router";
import type { PublicLibraryLandingMetrics } from "../../lib/library/types";
import { getPublicSiteOrigin } from "../../lib/siteOrigin";

const EXAMPLE_RECEIPT_DIGEST = "af9593e0922992eab5f6051a39e9576de4c9e638080c47c4960f37fd793e84c2";
const GITHUB_URL = "https://github.com/TheFutureEdge/open-forecast-receipt";

interface YoutubeVideo {
  id: string;
  embedUrl: string;
  watchUrl: string;
  thumbnailUrl: string;
}

function youtubeVideo(url: string | undefined): YoutubeVideo | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const id = parsed.hostname === "youtu.be"
      ? parsed.pathname.slice(1)
      : parsed.searchParams.get("v") || (parsed.pathname.startsWith("/embed/") ? parsed.pathname.split("/")[2] : null);
    return id ? {
      id,
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
      watchUrl: `https://www.youtube.com/watch?v=${id}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
    } : null;
  } catch {
    return null;
  }
}

// Public launch video: keep this independent of deployment environment files.
const video = youtubeVideo("https://www.youtube.com/watch?v=I8TClZk4j3E");
const videoUploadDate = "2026-08-15T09:37:01-07:00";

const principles = [
  {
    Icon: IdentificationCard,
    title: "Permanent identity",
    body: "A governed subject, target, forecaster, and receipt digest identify exactly which prediction is being discussed.",
  },
  {
    Icon: ClockCounterClockwise,
    title: "A complete time map",
    body: "Creation, knowledge boundaries, supplied context, publication, maturity, and evaluation remain separate dates.",
  },
  {
    Icon: Code,
    title: "Versioned provenance",
    body: "Model, prompt, tool, retrieval, output-schema, and code versions can be preserved without exposing hidden chain-of-thought.",
  },
  {
    Icon: Fingerprint,
    title: "Integrity and corrections",
    body: "Canonical JSON produces a deterministic digest. Corrections are append-only records instead of silent rewrites.",
  },
];

const audiences = [
  { Icon: UsersThree, title: "Forecast publishers", body: "Publish an inspectable record without building a provenance format from scratch." },
  { Icon: MagnifyingGlass, title: "Researchers and reviewers", body: "Reconstruct what was known, supplied, generated, and later evaluated." },
  { Icon: Code, title: "Developers", body: "Use the open schema, canonicalization rules, verifier, and publishing tools." },
  { Icon: GlobeHemisphereWest, title: "The public", body: "Browse forecasts without an account and independently check receipt integrity." },
];

const faqs = [
  {
    question: "How does Forecast Library relate to agentic workflows?",
    answer: "Forecast Library grew out of Open Forecast Receipt, an open-source initiative for portable, verifiable forecast records. Our ambition is for research agents to exchange receipts, preserve provenance across handoffs, and append evaluations when outcomes become known, including through Agent-to-Agent (A2A) workflows. The open schema, verifier, public library, and receipt JSON API are available today; automated agent integrations are a future direction.",
  },
  {
    question: "What is Forecast Library?",
    answer: "Forecast Library is a public, browsable library of forecast subjects, forecasters, forecasts, receipts, integrity checks, optional blockchain proofs, and later evaluations. It is built on the Open Forecast Receipt standard.",
  },
  {
    question: "What is an Open Forecast Receipt?",
    answer: "An Open Forecast Receipt is a portable, structured record of one forecast. It preserves what was predicted, who or what produced it, when it was generated, the relevant knowledge and input-context boundaries, provenance, and a deterministic integrity digest.",
  },
  {
    question: "What does blockchain proof establish?",
    answer: "An optional blockchain attestation can establish that a particular receipt digest existed by an anchoring time and has not changed. It does not prove that the forecast is accurate, truthful, unbiased, or based on good reasoning.",
  },
  {
    question: "Does every forecast need to be stored on a blockchain?",
    answer: "No. Every receipt can be verified locally from its canonical data. Blockchain anchoring is an optional, independent proof layer for selected receipts.",
  },
  {
    question: "Is this only for AI or financial forecasts?",
    answer: "No. Markets and AI forecasters are the first live use case. The subject–target–forecaster–forecast–receipt structure can also describe human, quantitative, ensemble, and hybrid forecasts in other domains.",
  },
  {
    question: "When is a forecast evaluated?",
    answer: "Only after its defined horizon or target has matured. Evaluation is appended as a separate record so the original forecast remains unchanged.",
  },
  {
    question: "Can a receipt be corrected?",
    answer: "Yes, but never silently. A correction receives its own identity and digest and references the record it corrects, preserving the audit trail.",
  },
  {
    question: "Who operates the Library and how can I submit?",
    answer: "Forecast Library is operated by Future Edge Group FZE and first used by iPulse AI. During this phase, public submissions are coordinated by email at support@ipulseai.com; no account or payment is required.",
  },
];

function formatted(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function buildStructuredData(metrics: PublicLibraryLandingMetrics) {
  const origin = getPublicSiteOrigin();
  const graph: Record<string, unknown>[] = [
    {
      "@type": "WebApplication",
      "@id": `${origin}/#application`,
      name: "Forecast Library",
      url: origin,
      applicationCategory: "ResearchApplication",
      operatingSystem: "Web",
      isAccessibleForFree: true,
      description: `Browse ${formatted(metrics.receiptCount)} public forecast receipts, inspect provenance, and verify integrity.`,
      creator: { "@id": "https://ftredge.com/#organization" },
    },
    {
      "@type": "FAQPage",
      "@id": `${origin}/#frequently-asked-questions`,
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ];
  if (video && videoUploadDate) {
    graph.push({
      "@type": "VideoObject",
      "@id": `${origin}/#product-video`,
      name: "Can AI Prove What It Predicted? | Open Forecast Receipt",
      description: "A 44-second demonstration of how a forecast becomes an inspectable receipt with deterministic integrity verification and optional blockchain proof.",
      thumbnailUrl: [video.thumbnailUrl],
      uploadDate: videoUploadDate,
      duration: "PT44S",
      embedUrl: video.embedUrl,
      contentUrl: video.watchUrl,
      publisher: { "@id": "https://ftredge.com/#organization" },
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

export function LandingPage({ metrics }: { metrics: PublicLibraryLandingMetrics }) {
  const evidence = [
    [formatted(metrics.forecastSubjectCount), "forecast subjects"],
    [formatted(metrics.receiptCount), "public receipts"],
    [formatted(metrics.forecasterCount), "forecaster profiles"],
    [`${formatted(metrics.verifiedProofCount)}/${formatted(metrics.selectedProofCount)}`, "verified proofs"],
  ];
  const structuredData = buildStructuredData(metrics);

  return (
    <div className="bg-white dark:bg-slate-950">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />

      <section className="relative overflow-hidden border-b border-slate-200 bg-[radial-gradient(circle_at_78%_12%,#dbeafe_0,transparent_34%),linear-gradient(180deg,#f8fbff_0%,#ffffff_75%)] dark:border-slate-800 dark:bg-[radial-gradient(circle_at_78%_12%,#172554_0,transparent_34%),linear-gradient(180deg,#020617_0%,#0f172a_75%)]">
        <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-14 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:py-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300">
              <Database size={15} weight="fill" /> Public infrastructure for verifiable forecasts
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.04] tracking-[-0.04em] text-slate-950 sm:text-6xl dark:text-white">
              Give forecasts a memory.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
              Forecast Library preserves what was predicted, by whom, when, and with which information—so the historical record can be inspected, verified, and evaluated instead of quietly overwritten.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link to="/forecasts" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-center text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 sm:w-auto">
                Browse public forecasts <ArrowRight size={17} weight="bold" />
              </Link>
              <Link to="/entities" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700 sm:w-auto dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                Explore forecast subjects
              </Link>
              <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-center text-sm font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700 sm:w-auto dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <Code size={17} weight="bold" /> Open-source project
              </a>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
              {["No account needed to browse", "One receipt per forecast", "Optional per-receipt blockchain proof"].map((item) => (
                <span key={item} className="flex items-center gap-1.5"><CheckCircle className="text-emerald-500" size={15} weight="fill" />{item}</span>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 shadow-2xl shadow-slate-300/50 dark:border-slate-700 dark:shadow-none">
            {video ? (
              <iframe
                className="aspect-video w-full"
                src={video.embedUrl}
                title="Can AI Prove What It Predicted? | Open Forecast Receipt"
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="bg-[radial-gradient(circle_at_75%_25%,#1e40af_0,#020617_65%)] p-7 text-white sm:p-9">
                <div className="flex items-center justify-between gap-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300">Real public receipt</div>
                  <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-[10px] font-bold text-emerald-300">Integrity verifiable</span>
                </div>
                <div className="mt-8 flex items-start gap-4">
                  <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-blue-500/15 text-blue-300"><Fingerprint size={28} weight="duotone" /></div>
                  <div>
                    <div className="text-xl font-black">PepsiCo forecast receipt</div>
                    <p className="mt-1 text-sm text-slate-300">One AI forecaster · one target · one sealed record</p>
                  </div>
                </div>
                <dl className="mt-7 grid gap-3 sm:grid-cols-2">
                  {[
                    ["Forecaster", "Ray Dalio AI on Gemini 3.1 Pro"],
                    ["Target", "Adjusted end-of-day close return"],
                    ["Created", "5 July 2026"],
                    ["Proof", "Selected · not yet issued"],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <dt className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">{label}</dt>
                      <dd className="mt-1 text-xs font-semibold text-white">{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-5 rounded-xl bg-black/25 p-3 font-mono text-[10px] leading-5 text-slate-300">
                  SHA-256 · {EXAMPLE_RECEIPT_DIGEST.slice(0, 18)}…{EXAMPLE_RECEIPT_DIGEST.slice(-10)}
                </div>
                <Link to={`/receipts/${EXAMPLE_RECEIPT_DIGEST}`} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-blue-300 hover:text-white">
                  Inspect the receipt <ArrowRight size={16} weight="bold" />
                </Link>
              </div>
            )}
            <div className="border-t border-white/10 px-5 py-4 text-white">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-300">Where Forecast Library began</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">The original Open Forecast Receipt demo: a forecast, a portable record, and an independent integrity check.</p>
              <a href="https://www.youtube.com/watch?v=I8TClZk4j3E" target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-blue-300 hover:text-white">Watch on YouTube <ArrowRight size={16} /></a>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[1240px] px-5 pb-10 lg:px-8">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 shadow-sm lg:grid-cols-4 dark:border-slate-800 dark:bg-slate-800">
            {evidence.map(([value, label]) => (
              <div key={label} className="bg-white px-4 py-4 dark:bg-slate-900 sm:px-5">
                <div className="text-2xl font-black tracking-tight text-slate-950 dark:text-white">{value}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-right text-[10px] text-slate-400">Live public catalog counts. Proof status is reported without implying accuracy.</p>
        </div>
      </section>

      <section id="vision" className="border-b border-slate-200 dark:border-slate-800">
        <div className="mx-auto grid max-w-[1240px] gap-8 px-5 py-14 lg:grid-cols-2 lg:px-8">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Open-source origins. A shared research record.</div>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">Forecast evidence that can travel between agents.</h2>
            <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">Forecast Library grew out of Open Forecast Receipt, an open-source initiative to make a prediction portable, inspectable, and independently verifiable. The Library gives those receipts a public home, with iPulse AI as its first publisher.</p>
          </div>
          <div>
            <p className="text-base leading-7 text-slate-600 dark:text-slate-300">Our ambition is for a research agent to hand a forecast to another agent with its source, timing, assumptions, and integrity evidence intact. A reviewer can check the record, a downstream workflow can reference it, and an evaluator can append the outcome without rewriting the original prediction.</p>
            <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">That vision includes Agent-to-Agent (A2A) collaboration and other agentic workflows. Today, developers can use the open receipt schema, deterministic verifier, and public receipt JSON API. Automated agent integrations and broader evaluation workflows are the next direction.</p>
            <div className="mt-5 flex flex-wrap gap-5 text-sm font-bold text-blue-700 dark:text-blue-300">
              <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2">Explore the open-source initiative <ArrowRight size={16} /></a>
              <Link to="/standards" className="inline-flex items-center gap-2">Read the receipt standard <ArrowRight size={16} /></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 py-16 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">The real-world problem</div>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">AI research has a memory problem.</h2>
            <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
              Live dashboards show what a system thinks now. They rarely preserve the exact model, inputs, evidence, timing, and configuration that shaped an earlier prediction.
            </p>
            <blockquote className="mt-6 border-l-4 border-blue-500 pl-5 text-lg font-bold leading-8 text-slate-800 dark:text-slate-100">
              “A live dashboard tells you what the system thinks now. A research record tells you what it knew then.”
            </blockquote>
            <p className="mt-4 text-sm leading-6 text-slate-500">
              Documentation does not make a forecast correct. It makes honest reconstruction, comparison, and evaluation possible.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {principles.map(({ Icon, title, body }) => (
              <article key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="grid size-10 place-items-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"><Icon size={21} weight="duotone" /></div>
                <h3 className="mt-4 text-sm font-bold text-slate-950 dark:text-white">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="mx-auto max-w-[1240px] px-5 py-16 lg:px-8">
          <div className="max-w-3xl">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">From prediction to evidence</div>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">One forecast. One receipt. A record that survives.</h2>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              ["1", "Create", "Map the subject, target, forecaster, predicted values, time map, and provenance into the open format."],
              ["2", "Seal and publish", "Canonicalize the receipt, compute its SHA-256 digest, and publish the browse projections."],
              ["3", "Prove (optional)", "Anchor that individual receipt digest onchain and link the returned attestation without rewriting it."],
              ["4", "Evaluate later", "After the horizon matures, append the governed outcome and evaluation while preserving the original."],
            ].map(([number, title, body]) => (
              <article key={number} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="grid size-9 place-items-center rounded-full bg-blue-600 text-sm font-black text-white">{number}</div>
                <h3 className="mt-4 text-sm font-bold text-slate-950 dark:text-white">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">{body}</p>
              </article>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/standards" className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300">See the full architecture <ArrowRight size={16} weight="bold" /></Link>
            <Link to="/integrity-test" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"><Fingerprint size={16} /> Try the integrity test</Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 py-16 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl bg-slate-950 px-6 py-9 text-white sm:px-9">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">Evidence, ownership, and limits</div>
            <h2 className="mt-3 text-3xl font-black">Built in public. Operated by a real organization.</h2>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">
              Future Edge Group FZE operates the Library and publishes the open-source receipt standard. iPulse AI is the first production client, contributing a real public collection rather than a hand-picked mock demonstration.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><ShieldCheck className="text-blue-300" size={22} weight="duotone" /><div className="mt-3 text-sm font-bold">Accountable operator</div><div className="mt-1 text-xs leading-5 text-slate-400">Future Edge Group FZE · Formation 4414073</div></div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><Code className="text-blue-300" size={22} weight="duotone" /><div className="mt-3 text-sm font-bold">Open implementation</div><div className="mt-1 text-xs leading-5 text-slate-400">Public schema, examples, verifier, and tests</div></div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><SealCheck className="text-blue-300" size={22} weight="duotone" /><div className="mt-3 text-sm font-bold">Explicit limitations</div><div className="mt-1 text-xs leading-5 text-slate-400">Integrity and timing are not accuracy or truth</div></div>
            </div>
          </div>
          <aside className="rounded-3xl border border-amber-200 bg-amber-50 p-7 dark:border-amber-900 dark:bg-amber-950/30">
            <WarningCircle className="text-amber-600 dark:text-amber-400" size={28} weight="duotone" />
            <h2 className="mt-4 text-xl font-black text-slate-950 dark:text-white">What proof does not mean</h2>
            <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-slate-300">
              A receipt can be perfectly documented and still be wrong. Blockchain proof can preserve a digest and anchoring time; it cannot certify truth, quality, independence, or investment merit.
            </p>
            <Link to={`/receipts/${EXAMPLE_RECEIPT_DIGEST}`} className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-amber-800 hover:text-amber-950 dark:text-amber-300">Inspect a real receipt <ArrowRight size={16} weight="bold" /></Link>
          </aside>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="mx-auto max-w-[1240px] px-5 py-16 lg:px-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Designed for inspection</div>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">Useful to publishers, reviewers, developers, and the public.</h2>
            </div>
            <Link to="/forecasters" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700 dark:text-blue-300">Browse forecaster profiles <ArrowRight size={16} weight="bold" /></Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {audiences.map(({ Icon, title, body }) => (
              <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-950">
                <Icon size={22} weight="duotone" className="text-blue-600" />
                <h3 className="mt-4 text-sm font-bold text-slate-950 dark:text-white">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="frequently-asked-questions" className="mx-auto max-w-[1000px] px-5 py-16 lg:px-8">
        <div className="text-center">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Frequently asked questions</div>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">Forecast Library, clearly explained.</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Direct answers about receipts, verification, blockchain proof, evaluation, and governance.</p>
        </div>
        <div className="mt-8 divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {faqs.map((faq, index) => (
            <details key={faq.question} className="group p-5" open={index === 0}>
              <summary className="cursor-pointer list-none pr-8 text-sm font-bold text-slate-950 marker:hidden dark:text-white">
                {faq.question}<span className="float-right text-blue-600 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 pb-8 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-br from-blue-700 to-indigo-950 px-6 py-10 text-white sm:px-10">
          <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-200">Start with the public record</div>
              <h2 className="mt-3 text-3xl font-black">Inspect the forecasts. Recompute the receipts. Judge the evidence.</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100">Public browsing needs no account. To propose a public submission during this phase, contact the Library team directly.</p>
            </div>
            <div className="flex flex-wrap gap-3 lg:flex-col">
              <Link to="/forecasts" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 hover:bg-blue-50">Browse forecasts <ArrowRight size={17} weight="bold" /></Link>
              <a href="mailto:support@ipulseai.com?subject=Forecast%20Library%20public%20submission" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-bold text-white hover:bg-white/15"><EnvelopeSimple size={17} weight="bold" /> Contact submissions</a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
