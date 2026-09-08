import { ArrowRight, Buildings, IdentificationCard, Stack, Target, UsersThree } from "@phosphor-icons/react/dist/ssr";
import { Link } from "../../lib/router";
import { publicCollectionPath, publicForecasterPath, publicPublisherPath, publicTargetPath } from "../../lib/library/entityRoutes";
import type {
  PublicCollectionRecord,
  PublicForecasterCoverage,
  PublicForecasterRecord,
  PublicPublisherRecord,
  PublicTargetRecord,
} from "../../lib/library/types";

function Hero({ eyebrow, title, description, metrics = [] }: { eyebrow: string; title: string; description: string; metrics?: Array<[string | number, string]> }) {
  return (
    <header className="overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-white via-white to-blue-50 p-7 shadow-sm dark:border-blue-950 dark:from-slate-900 dark:via-slate-900 dark:to-blue-950/30 sm:p-9">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <div className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600">{eyebrow}</div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
        </div>
        {metrics.length > 0 && <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{metrics.map(([value, label]) => <div key={label} className="min-w-24 rounded-xl border border-white bg-white px-4 py-3 text-center shadow-sm dark:border-slate-800 dark:bg-slate-950"><div className="text-xl font-black">{value}</div><div className="mt-1 text-[8px] font-black uppercase tracking-wider text-slate-400">{label}</div></div>)}</div>}
      </div>
    </header>
  );
}

export function ForecastDirectoryPage({ collections }: { collections: PublicCollectionRecord[] }) {
  const receipts = collections.reduce((sum, collection) => sum + collection.receiptCount, 0);
  return (
    <div className="space-y-5">
      <Hero eyebrow="Public forecast directory" title="Browse public forecasts" description="Start with a publisher collection or a governed forecast subject. Every forecast remains an independent record with its own forecaster, target, horizon, receipt, and optional proof." metrics={[[receipts, "Forecasts"], [collections.length, "Collections"], [new Set(collections.map((item) => item.publisherSlug || "ipulse-ai")).size, "Publishers"]]} />
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800"><h2 className="text-xl font-black">Published collections</h2><p className="mt-1 text-xs text-slate-500">Collections are browsing and publication groupings; they do not replace individual forecast identities.</p></div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {collections.map((collection) => {
            const publisherSlug = collection.publisherSlug || "ipulse-ai";
            const collectionSlug = collection.publicSlug || collection.collectionId;
            return <Link key={collection.collectionId} to={publicCollectionPath(publisherSlug, collectionSlug)} className="group grid gap-4 px-6 py-5 transition hover:bg-blue-50/60 dark:hover:bg-blue-950/20 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-blue-600"><Stack size={15} /> {publisherSlug === "ipulse-ai" ? "iPulse AI" : publisherSlug}</div><h3 className="mt-1 text-base font-black text-slate-950 dark:text-white">{collection.batchLabel}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{collection.description}</p></div>
              <div className="flex items-center gap-5 text-xs"><span><strong className="block text-base text-slate-900 dark:text-white">{collection.receiptCount}</strong> forecasts</span><span><strong className="block text-base text-slate-900 dark:text-white">{collection.entityCount}</strong> subjects</span><ArrowRight className="text-blue-600 transition-transform group-hover:translate-x-1" size={18} /></div>
            </Link>;
          })}
        </div>
      </section>
    </div>
  );
}

export function TargetDirectoryPage({ targets }: { targets: PublicTargetRecord[] }) {
  return <div className="space-y-5"><Hero eyebrow="Governed target directory" title="Forecast targets" description="A target defines exactly what is predicted about an entity: the measurable dimension, unit, cadence, and horizon semantics." metrics={[[targets.length, "Targets"]]} /><section className="grid gap-4 md:grid-cols-2">{targets.map((target) => <Link key={target.targetId} to={publicTargetPath(target.publicSlug)} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900"><Target size={24} className="text-blue-600" /><h2 className="mt-4 text-lg font-black">{target.name}</h2><p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">{target.description}</p><div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold"><span className="rounded-full bg-slate-100 px-2 py-1 dark:bg-slate-800">{target.dimension || "Dimension governed in receipt"}</span><span className="rounded-full bg-violet-50 px-2 py-1 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">{target.unit || "Unit governed in receipt"}</span></div></Link>)}</section></div>;
}

export function TargetDetailPage({ target }: { target: PublicTargetRecord }) {
  return <div className="space-y-5"><Hero eyebrow="Governed forecast target" title={target.name} description={target.description || "A governed measurable outcome used by public forecasts."} metrics={[[target.dimension || "—", "Dimension"], [target.unit || "—", "Unit"]]} /><section className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 className="text-xl font-black">Stable target identity</h2><dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-xs text-slate-400">Target ID</dt><dd className="mt-1 break-all font-mono">{target.targetId}</dd></div><div><dt className="text-xs text-slate-400">Public slug</dt><dd className="mt-1 font-mono">{target.publicSlug}</dd></div></dl></section></div>;
}

export function PublisherDirectoryPage({ publishers }: { publishers: PublicPublisherRecord[] }) {
  return <div className="space-y-5"><Hero eyebrow="Accountable publishers" title="Forecast publishers" description="Publishers are accountable organizations or teams that submit forecasts, define public provenance, and maintain correction and evaluation responsibilities." metrics={[[publishers.length, "Publishers"]]} /><section className="grid gap-4 md:grid-cols-2">{publishers.map((publisher) => <Link key={publisher.publisherId} to={publicPublisherPath(publisher.publicSlug)} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900"><Buildings size={25} className="text-blue-600" /><h2 className="mt-4 text-xl font-black">{publisher.name}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{publisher.description}</p></Link>)}</section></div>;
}

export function PublisherDetailPage({ publisher, collections }: { publisher: PublicPublisherRecord; collections: PublicCollectionRecord[] }) {
  return <div className="space-y-5"><Hero eyebrow="Forecast publisher" title={publisher.name} description={publisher.description || "An accountable public forecast publisher."} metrics={[[collections.length, "Collections"], [collections.reduce((sum, item) => sum + item.receiptCount, 0), "Forecasts"]]} /><section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 className="text-xl font-black">Published collections</h2><div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">{collections.map((collection) => <Link key={collection.collectionId} to={publicCollectionPath(publisher.publicSlug, collection.publicSlug || collection.collectionId)} className="flex items-center justify-between py-4 text-sm font-bold hover:text-blue-600"><span>{collection.batchLabel}</span><span className="inline-flex items-center gap-2 text-xs text-slate-500">{collection.receiptCount} forecasts <ArrowRight /></span></Link>)}</div>{publisher.websiteUrl && <a href={publisher.websiteUrl} className="mt-5 inline-flex text-sm font-bold text-blue-600 hover:underline">Visit publisher website</a>}</section></div>;
}

export function ForecasterDetailPage({ forecaster, coverage }: { forecaster: PublicForecasterRecord; coverage?: PublicForecasterCoverage }) {
  return <div className="space-y-5"><Hero eyebrow="Governed forecaster profile" title={forecaster.displayName} description={forecaster.description} metrics={[[coverage?.forecasts || 0, "Forecasts"], [coverage?.entities || 0, "Subjects"], [coverage?.proofVerified || 0, "Proofs"]]} /><section className="grid gap-5 lg:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 className="flex items-center gap-2 text-lg font-black"><IdentificationCard className="text-blue-600" /> Identity</h2><dl className="mt-5 space-y-4 text-sm"><Row label="Forecaster ID" value={forecaster.forecasterId} mono /><Row label="Public slug" value={forecaster.publicSlug || publicForecasterPath(forecaster.displayName).split("/").at(-1) || ""} mono /><Row label="Type" value={forecaster.forecasterKind || forecaster.typeLabel} /><Row label="Publisher" value={forecaster.publisherOrganization?.name || "Not recorded"} /></dl></div><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 className="flex items-center gap-2 text-lg font-black"><UsersThree className="text-violet-600" /> Implementation</h2><dl className="mt-5 space-y-4 text-sm"><Row label="Implementation kind" value={forecaster.implementationKind || "Not recorded"} /><Row label="Model" value={forecaster.model?.name || "Not applicable"} /><Row label="Provider" value={forecaster.model?.provider || "Not applicable"} /><Row label="Modes" value={forecaster.modes?.join(", ") || "Not recorded"} /></dl></div></section></div>;
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return <div><dt className="text-xs text-slate-400">{label}</dt><dd className={`mt-1 break-all font-semibold text-slate-800 dark:text-slate-100 ${mono ? "font-mono text-xs" : ""}`}>{value}</dd></div>;
}
