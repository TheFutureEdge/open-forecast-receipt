import {
  ArrowRight,
  CheckCircle,
  Database,
  EnvelopeSimple,
  Fingerprint,
  GlobeHemisphereWest,
  Receipt,
} from "@phosphor-icons/react";
import { Link } from "../../lib/router";

function youtubeEmbedUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const videoId = parsed.hostname === "youtu.be"
      ? parsed.pathname.slice(1)
      : parsed.searchParams.get("v") || (parsed.pathname.startsWith("/embed/") ? parsed.pathname.split("/")[2] : null);
    return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}` : null;
  } catch {
    return null;
  }
}

const videoUrl = youtubeEmbedUrl(import.meta.env.VITE_OFL_YOUTUBE_VIDEO_URL);

const principles = [
  {
    Icon: Receipt,
    title: "One forecast, one receipt",
    body: "The prediction, forecaster, target, timing, context boundaries, and review status stay together as one inspectable record.",
  },
  {
    Icon: Fingerprint,
    title: "Integrity without hype",
    body: "Anyone can recompute the receipt digest. Optional blockchain proof confirms integrity and anchoring time—not truth or accuracy.",
  },
  {
    Icon: GlobeHemisphereWest,
    title: "Built for any domain",
    body: "Markets are the first showcase. The same structure can support weather, sports, policy, science, operations, and human forecasts.",
  },
];

export function LandingPage() {
  return (
    <div className="bg-white dark:bg-slate-950">
      <section className="relative overflow-hidden border-b border-slate-200 bg-[radial-gradient(circle_at_75%_20%,#dbeafe_0,transparent_38%),linear-gradient(180deg,#f8fbff_0%,#ffffff_72%)] dark:border-slate-800 dark:bg-[radial-gradient(circle_at_75%_20%,#172554_0,transparent_36%),linear-gradient(180deg,#020617_0%,#0f172a_72%)]">
        <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300">
              <Database size={15} weight="fill" /> Public forecast infrastructure
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.05] tracking-[-0.04em] text-slate-950 sm:text-6xl dark:text-white">
              Give forecasts a memory.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
              Open Forecast Library is a public, browsable record of what was forecast, by whom, using which information, and when. Every entry is stored as an Open Forecast Receipt that people can inspect and verify.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/showcase" className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">
                Explore the iPulse AI showcase <ArrowRight size={17} weight="bold" />
              </Link>
              <a href="mailto:support@ipulseai.com?subject=Public%20forecast%20submission" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                <EnvelopeSimple size={17} weight="bold" /> Submit a public forecast
              </a>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
              {["Public browsing needs no account", "Per-receipt blockchain proof", "Open-source receipt standard"].map((item) => (
                <span key={item} className="flex items-center gap-1.5"><CheckCircle className="text-emerald-500" size={15} weight="fill" />{item}</span>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 shadow-2xl shadow-slate-300/50 dark:border-slate-700 dark:shadow-none">
            {videoUrl ? (
              <iframe
                className="aspect-video w-full"
                src={videoUrl}
                title="Open Forecast Library product overview"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="grid aspect-video place-items-center bg-[radial-gradient(circle_at_center,#1e3a8a_0,#020617_70%)] p-8 text-center text-white">
                <div>
                  <Fingerprint className="mx-auto text-blue-300" size={44} weight="duotone" />
                  <div className="mt-4 text-xl font-bold">Forecast → Receipt → Proof → Evaluation</div>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-300">The product video will appear here after its YouTube URL is added to the staging configuration.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 py-16 lg:px-8">
        <div className="max-w-3xl">
          <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Why this exists</div>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 dark:text-white">A forecast is more useful when its history survives.</h2>
          <p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">Screenshots, dashboards, and overwritten model outputs make it hard to reconstruct what was actually known at prediction time. A receipt preserves the forecast and its boundaries without exposing private chain-of-thought.</p>
        </div>
        <div className="mt-9 grid gap-4 md:grid-cols-3">
          {principles.map(({ Icon, title, body }) => (
            <article key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900">
              <div className="grid size-11 place-items-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"><Icon size={23} weight="duotone" /></div>
              <h3 className="mt-4 text-base font-bold text-slate-950 dark:text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="mx-auto max-w-[1240px] px-5 py-16 lg:px-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              ["1", "Create", "A publisher maps a forecast into the open receipt format."],
              ["2", "Publish", "A controlled backend writes the public receipt and browse indexes to Firestore."],
              ["3", "Prove (optional)", "A dedicated signer anchors that individual receipt on Base and stores the returned proof."],
              ["4", "Evaluate later", "After the horizon matures, an append-only evaluation records what happened."],
            ].map(([number, title, body]) => (
              <div key={number} className="rounded-2xl bg-white p-5 shadow-sm dark:bg-slate-950">
                <div className="text-2xl font-black text-blue-600">{number}</div>
                <h3 className="mt-2 text-sm font-bold text-slate-950 dark:text-white">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 py-16 lg:px-8">
        <div className="rounded-3xl bg-slate-950 px-6 py-10 text-white sm:px-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">First publisher</div>
              <h2 className="mt-3 text-3xl font-black">Built with real iPulse AI forecasts.</h2>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">The public showcase begins with five market subjects and 60 individual AI forecasts. It is the first working client of the standard—not a special schema that locks the Library to finance or AI.</p>
            </div>
            <Link to="/showcase" className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 hover:bg-blue-50">Open the showcase <ArrowRight size={17} weight="bold" /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
