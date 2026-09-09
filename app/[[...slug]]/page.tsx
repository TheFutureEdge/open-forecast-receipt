import type { Metadata } from "next";
import { cache, type ReactNode } from "react";
import { notFound, permanentRedirect } from "next/navigation";
import { AppShell } from "../../src/components/layout/AppShell";
import { LandingPage } from "../../src/components/landing/LandingPage";
import { EntityCatalogPage } from "../../src/components/entities/EntityCatalogPage";
import { EntityDetailPage } from "../../src/components/entities/EntityDetailPage";
import { EntityCategoryComingSoonPage } from "../../src/components/entities/EntityCategoryComingSoonPage";
import { ForecasterCatalogPage } from "../../src/components/forecasters/ForecasterCatalogPage";
import { EntityForecastLedgerPage } from "../../src/components/forecasts/EntityForecastLedgerPage";
import { IndividualForecastPage } from "../../src/components/forecasts/IndividualForecastPage";
import { ManifestPage } from "../../src/components/manifest/ManifestPage";
import { AssetPage } from "../../src/components/asset/AssetPage";
import { StandardsPage } from "../../src/components/standards/StandardsPage";
import { IntegrityDemoPage } from "../../src/components/receipt/IntegrityDemoPage";
import {
  AboutPage,
  DisclaimerPage,
  PrivacyPage,
  ReceiptStandardPage,
  StandardsOverviewPage,
  SubmissionPage,
  TermsPage,
  TrustPage,
} from "../../src/components/information/InformationPages";
import {
  ForecastDirectoryPage,
  ForecasterDetailPage,
  PublisherDetailPage,
  PublisherDirectoryPage,
  TargetDetailPage,
  TargetDirectoryPage,
} from "../../src/components/directories/PublicDirectories";
import {
  parseEntityDetailPath,
  parseEntityForecastCollectionPath,
  parseEntityForecastLedgerPath,
  parseEntityForecastSetPath,
  parseLegacyPublicForecastPath,
  parsePublicForecastPath,
  publicCollectionEntityPath,
  publicCollectionPath,
  publicEntityForecastLedgerPath,
  publicEntityPath,
  publicEntitySlug,
  publicForecastKeyMatches,
  publicForecastPath,
} from "../../src/lib/library/entityRoutes";
import {
  getPublicCollectionServer,
  getPublicForecastByPublicIdServer,
  getPublicForecasterServer,
  getPublicPublisherServer,
  getPublicReceiptResolverServer,
  getPublicTargetServer,
  getLibraryEntityServer,
  getLibraryManifestServer,
  getLibraryReceiptServer,
  getPublicLibraryLandingMetricsServer,
  getPublicForecasterCatalogServer,
  getPublicEntityServer,
  listEntityCollectionsServer,
  listLibraryForecastLedgerPageServer,
  listLibraryForecastsServer,
  listPublicForecastableEntitiesServer,
  listPublicCollectionsServer,
  listPublicPublishersServer,
  listPublicTargetsServer,
  listPublicForecastStatsByEntityServer,
  listPublicOrganizationsServer,
} from "../../src/lib/library/server-repository";
import { ENTITY_CATALOG_PRESETS } from "../../src/lib/library/catalog-presets";
import type { PublicEntityRecord } from "../../src/lib/library/types";

export const revalidate = 300;

interface RouteParams {
  slug?: string[];
}

interface PageProps {
  params: Promise<RouteParams>;
}

const getPublicEntityCached = cache(getPublicEntityServer);
const getLibraryReceiptCached = cache(getLibraryReceiptServer);
const getPublicForecastCached = cache(getPublicForecastByPublicIdServer);
const getPublicForecasterCached = cache(getPublicForecasterServer);
const getPublicTargetCached = cache(getPublicTargetServer);
const getPublicPublisherCached = cache(getPublicPublisherServer);
const getPublicCollectionCached = cache(getPublicCollectionServer);

function pathnameFrom(params: RouteParams): string {
  return params.slug?.length ? `/${params.slug.map(decodeURIComponent).join("/")}` : "/";
}

function staticMetadata(pathname: string): { title: string; description: string } {
  const exact: Record<string, { title: string; description: string }> = {
    "/": {
      title: "Forecast Library | Verifiable Public Forecasts",
      description: "Browse public forecasts, inspect their Open Forecast Receipts, verify integrity, and follow optional per-receipt blockchain proofs and later evaluations.",
    },
    "/entities": {
      title: "Semantic Entity Catalog for Verifiable Forecasts",
      description: "Browse governed forecast subjects, stable identifiers, measurable targets, and connected context entities.",
    },
    "/entities/directory": {
      title: "Knowledge Graph Entity Directory",
      description: "Explore forecast subjects and context entities connected through the Forecast Library Knowledge Graph.",
    },
    "/forecasts": {
      title: "Public Forecast Directory",
      description: "Browse individual public forecasts by publisher, collection, subject, target, generation date, and forecaster.",
    },
    "/forecasters": {
      title: "AI, Human, and Quantitative Forecaster Profiles",
      description: "Browse governed forecaster identities, implementations, specializations, coverage, and review status.",
    },
    "/how-it-works": {
      title: "How the Forecast Knowledge Graph and Receipt Standard Work",
      description: "Understand entities, targets, forecasts, receipts, integrity verification, evaluation, and optional blockchain proofs.",
    },
    "/standards": { title: "Forecast Standards Directory", description: "Browse the open structures used by Forecast Library." },
    "/integrity-test": {
      title: "Forecast Receipt Integrity Test",
      description: "Change one forecast value and see deterministic receipt verification detect tampering.",
    },
    "/about": { title: "About Forecast Library", description: "Learn why Forecast Library gives public forecasts durable, inspectable memory." },
    "/trust": { title: "Forecast Integrity and Trust Center", description: "Understand receipt integrity, blockchain proof limitations, security, corrections, and forecast evaluation." },
    "/privacy": { title: "Privacy Policy", description: "Read the Forecast Library privacy policy." },
    "/terms": { title: "Terms of Service", description: "Read the Forecast Library terms of service." },
    "/disclaimer": { title: "Forecast and Investment Disclaimer", description: "Understand the limits and risks of public forecast records." },
    "/targets": { title: "Governed Forecast Targets", description: "Browse the measurable target definitions used by public forecasts." },
    "/publishers": { title: "Public Forecast Publishers", description: "Browse the accountable publishers of public forecast records." },
    "/collections": { title: "Public Forecast Collections", description: "Browse optional publisher collections while preserving one identity per forecast." },
    "/submit": { title: "Submit a Public Forecast", description: "Contact support to submit a forecast for manual review and public receipt publication." },
  };
  if (exact[pathname]) return exact[pathname];
  if (pathname.includes("/subjects/listed-securities")) return { title: "Listed Security Forecast Subjects", description: "Browse governed listed securities, market identifiers, issuer relationships, targets, and public forecasts." };
  if (pathname.includes("/subjects/funds-etfs")) return { title: "Fund and ETF Forecast Subjects", description: "Browse forecastable fund and ETF market representations and their governed identities." };
  if (pathname.includes("/subjects/cryptoassets")) return { title: "Cryptoasset Forecast Subjects", description: "Browse governed cryptoasset subjects, identifiers, and forecast targets." };
  if (pathname.includes("/subjects/commodities")) return { title: "Commodity Forecast Subjects", description: "Browse governed commodity subjects and measurable forecast targets." };
  if (pathname.includes("/subjects/currency-pairs")) return { title: "Currency Pair Forecast Subjects", description: "Browse governed currency-pair subjects with explicit base and quote identities." };
  if (pathname.includes("/subjects/market-indices")) return { title: "Market Index Forecast Subjects", description: "Browse governed market indices and their measurable forecast targets." };
  if (pathname.includes("/context/corporations")) return { title: "Corporations in the Forecast Knowledge Graph", description: "Browse corporations separately from the listed securities they issue." };
  if (pathname.includes("/context/investment-funds")) return { title: "Investment Funds in the Forecast Knowledge Graph", description: "Browse investment-fund entities separately from their listed market representations." };
  return { title: "Verifiable Public Forecasts", description: "A governed public library of forecasts, entities, receipts, integrity checks, and optional blockchain proofs." };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const pathname = pathnameFrom(await params);
  const entityMatch = parseEntityDetailPath(pathname);
  const ledgerMatch = parseEntityForecastLedgerPath(pathname);
  const permanentId = pathname.match(/^\/forecasts\/(f-[0-9a-hjkmnp-tv-z]{26})$/)?.[1];
  const individualMatch = parsePublicForecastPath(pathname);
  const forecasterMatch = pathname.match(/^\/forecasters\/([^/]+)$/);
  const targetMatch = pathname.match(/^\/targets\/([^/]+)$/);
  const publisherMatch = pathname.match(/^\/publishers\/([^/]+)$/);
  const collectionMatch = pathname.match(/^\/collections\/([^/]+)\/([^/]+)$/);
  const entity = entityMatch
    ? await getPublicEntityCached(entityMatch.routeKey, entityMatch.routeKind).catch(() => null)
    : ledgerMatch
      ? await getPublicEntityCached(ledgerMatch.routeSlug, "listed-securities").catch(() => null)
      : individualMatch
        ? await getPublicEntityCached(individualMatch.routeSlug, "listed-securities").catch(() => null)
        : null;
  const fallback = staticMetadata(pathname);
  const individualForecast = individualMatch || permanentId
    ? await getPublicForecastCached(permanentId || individualMatch!.forecastPublicId).catch(() => null)
    : null;
  const [forecaster, target, publisher, collection] = await Promise.all([
    forecasterMatch ? getPublicForecasterCached(decodeURIComponent(forecasterMatch[1])).catch(() => null) : null,
    targetMatch ? getPublicTargetCached(decodeURIComponent(targetMatch[1])).catch(() => null) : null,
    publisherMatch ? getPublicPublisherCached(decodeURIComponent(publisherMatch[1])).catch(() => null) : null,
    collectionMatch
      ? getPublicCollectionCached(decodeURIComponent(collectionMatch[1]), decodeURIComponent(collectionMatch[2])).catch(() => null)
      : null,
  ]);
  const canonicalPath = individualForecast
    ? publicForecastPath(individualForecast.entitySlug, individualForecast)
    : entity && entityMatch
      ? publicEntityPath(entity)
      : pathname;
  const receiptSubject = individualForecast
    ? (await getLibraryReceiptCached(individualForecast.receiptDigest).catch(() => null))?.document.receiptPayload.forecast.entity.name
    : undefined;
  const subjectName = receiptSubject || entity?.canonicalName || "Public";
  const title = individualForecast
    ? `${individualForecast.forecaster?.displayName || individualForecast.forecasterLabel} ${subjectName} Forecast`
    : entity
      ? `${entity.canonicalName}${ledgerMatch ? " Forecast Ledger" : entity.entityClasses.includes("forecastable_entity") ? " Forecast Subject" : " Profile"}`
      : forecaster
        ? `${forecaster.displayName} Forecaster Profile`
        : target
          ? `${target.name} Forecast Target`
          : publisher
            ? `${publisher.name} Forecast Publisher`
            : collection
              ? `${collection.batchLabel} Forecast Collection`
      : fallback.title;
  const description = individualForecast
    ? `Inspect this ${subjectName} forecast, its original publication, sealed receipt, provenance, integrity, and optional blockchain proof.`
    : entity?.description
      || forecaster?.description
      || target?.description
      || publisher?.description
      || collection?.description
      || fallback.description;
  return {
    title: pathname === "/" ? { absolute: title } : title,
    description,
    alternates: { canonical: canonicalPath },
    openGraph: { title, description, url: canonicalPath },
    twitter: { title, description },
  };
}

async function entityCatalog(presetKey: string): Promise<ReactNode> {
  const preset = ENTITY_CATALOG_PRESETS[presetKey];
  if (!preset) return null;
  const entityRequest = preset.view === "forecastable"
    ? listPublicForecastableEntitiesServer()
    : preset.view === "context"
      ? listPublicOrganizationsServer()
      : Promise.all([listPublicForecastableEntitiesServer(), listPublicOrganizationsServer()]).then(([forecastable, context]) => [...forecastable, ...context]);
  const [entities, forecastStats] = await Promise.all([entityRequest, listPublicForecastStatsByEntityServer()]);
  return <EntityCatalogPage preset={preset} initialData={{ entities, forecastStats: [...forecastStats] }} />;
}

async function entityDetail(routeKey: string, routeKind?: Parameters<typeof getPublicEntityServer>[1]): Promise<ReactNode> {
  const entity = await getPublicEntityCached(routeKey, routeKind);
  if (!entity) return null;
  if (routeKey !== publicEntitySlug(entity)) permanentRedirect(publicEntityPath(entity));
  const related = (entity.relatedEntities || []).filter((record) => record.predicate === "has_market_representation");
  const [collections, relatedCollections] = await Promise.all([
    listEntityCollectionsServer(entity.entityId),
    Promise.all(related.map(async (record) => [record.entityId, await listEntityCollectionsServer(record.entityId)] as const)),
  ]);
  const relatedForecastCounts = relatedCollections.map(([entityId, records]) => [
    entityId,
    records.reduce((total, record) => total + (record.loadedCount ?? record.advisorCount ?? 0), 0),
  ] as [string, number]);
  return <EntityDetailPage routeKey={routeKey} routeKind={routeKind} initialData={{ entity, collections, relatedForecastCounts }} />;
}

async function resolveRoute(pathname: string): Promise<ReactNode> {
  if (pathname === "/") {
    const metrics = await getPublicLibraryLandingMetricsServer();
    return <LandingPage metrics={metrics} />;
  }
  if (pathname === "/about") return <AboutPage />;
  if (pathname === "/trust") return <TrustPage />;
  if (pathname === "/privacy") return <PrivacyPage />;
  if (pathname === "/terms") return <TermsPage />;
  if (pathname === "/disclaimer") return <DisclaimerPage />;
  if (pathname === "/submit") return <SubmissionPage />;
  if (pathname === "/standards/open-forecast-receipt/v0-1") return <ReceiptStandardPage />;
  if (pathname === "/forecasts") {
    return <ForecastDirectoryPage collections={await listPublicCollectionsServer()} />;
  }
  if (pathname === "/collections") return <ForecastDirectoryPage collections={await listPublicCollectionsServer()} />;
  if (pathname === "/receipts") permanentRedirect("/forecasts");
  if (pathname === "/entities") return entityCatalog("all-forecast-subjects");
  if (pathname === "/entities/directory") return entityCatalog("directory");

  const oldSubjectCatalog = pathname.match(/^\/entities\/subjects\/(listed-securities|funds-etfs|cryptoassets|commodities|currency-pairs|market-indices)$/);
  if (oldSubjectCatalog) permanentRedirect(`/entities/${oldSubjectCatalog[1]}`);
  const subjectCatalog = pathname.match(/^\/entities\/(listed-securities|funds-etfs|cryptoassets|commodities|currency-pairs|market-indices)$/);
  if (subjectCatalog) return entityCatalog(subjectCatalog[1]);
  if (pathname === "/entities/subjects/macroeconomics") permanentRedirect("/entities/macroeconomics");
  if (pathname === "/entities/macroeconomics") return <EntityCategoryComingSoonPage categoryKey="macroeconomics" />;

  const oldContextCatalog = pathname.match(/^\/entities\/context\/(corporations|investment-funds)$/);
  if (oldContextCatalog) permanentRedirect(`/entities/${oldContextCatalog[1]}`);
  const contextCatalog = pathname.match(/^\/entities\/(corporations|investment-funds)$/);
  if (contextCatalog) return entityCatalog(contextCatalog[1]);
  const contextSoon = pathname.match(/^\/entities\/context\/(countries|markets-venues|networks-protocols)$/);
  if (contextSoon) permanentRedirect(`/entities/${contextSoon[1]}`);
  const canonicalContextSoon = pathname.match(/^\/entities\/(countries|markets-venues|networks-protocols)$/);
  if (canonicalContextSoon) return <EntityCategoryComingSoonPage categoryKey={canonicalContextSoon[1]} />;
  if (pathname === "/entities/organizations") permanentRedirect("/entities/corporations");

  if (pathname === "/forecasters") {
    const catalog = await getPublicForecasterCatalogServer();
    return <ForecasterCatalogPage initialData={{
      forecasters: catalog.forecasters,
      coverage: Object.entries(catalog.coverage),
      totals: catalog.totals,
    }} />;
  }
  if (pathname === "/entities/forecasters") permanentRedirect("/forecasters");
  const forecasterDetail = pathname.match(/^\/forecasters\/([^/]+)$/);
  if (forecasterDetail) {
    const routeKey = decodeURIComponent(forecasterDetail[1]);
    const [forecaster, catalog] = await Promise.all([
      getPublicForecasterServer(routeKey),
      getPublicForecasterCatalogServer(),
    ]);
    if (!forecaster) return null;
    const canonicalSlug = forecaster.publicSlug || routeKey;
    if (canonicalSlug !== routeKey) permanentRedirect(`/forecasters/${encodeURIComponent(canonicalSlug)}`);
    return <ForecasterDetailPage forecaster={forecaster} coverage={catalog.coverage[forecaster.forecasterId]} />;
  }

  if (pathname === "/targets") return <TargetDirectoryPage targets={await listPublicTargetsServer()} />;
  const targetDetail = pathname.match(/^\/targets\/([^/]+)$/);
  if (targetDetail) {
    const target = await getPublicTargetServer(decodeURIComponent(targetDetail[1]));
    return target ? <TargetDetailPage target={target} /> : null;
  }

  if (pathname === "/publishers") return <PublisherDirectoryPage publishers={await listPublicPublishersServer()} />;
  const publisherDetail = pathname.match(/^\/publishers\/([^/]+)$/);
  if (publisherDetail) {
    const publisherSlug = decodeURIComponent(publisherDetail[1]);
    const [publisher, collections] = await Promise.all([
      getPublicPublisherServer(publisherSlug),
      listPublicCollectionsServer(),
    ]);
    return publisher ? <PublisherDetailPage publisher={publisher} collections={collections.filter((collection) => collection.publisherSlug === publisher.publicSlug)} /> : null;
  }

  const collectionDetail = pathname.match(/^\/collections\/([^/]+)\/([^/]+)$/);
  if (collectionDetail) {
    const publisherSlug = decodeURIComponent(collectionDetail[1]);
    const collectionSlug = decodeURIComponent(collectionDetail[2]);
    const collection = await getPublicCollectionServer(publisherSlug, collectionSlug);
    if (!collection) return null;
    return <ManifestPage
      batchId={collection.collectionId}
      initialManifest={await getLibraryManifestServer(collection.collectionId)}
      canonicalPath={publicCollectionPath(publisherSlug, collection.publicSlug || collectionSlug)}
    />;
  }

  const collectionEntity = pathname.match(/^\/collections\/([^/]+)\/([^/]+)\/entities\/([^/]+)$/);
  if (collectionEntity) {
    const publisherSlug = decodeURIComponent(collectionEntity[1]);
    const collectionSlug = decodeURIComponent(collectionEntity[2]);
    const routeSlug = decodeURIComponent(collectionEntity[3]);
    const collection = await getPublicCollectionServer(publisherSlug, collectionSlug);
    if (!collection) return null;
    const asset = await getLibraryEntityServer(collection.collectionId, routeSlug);
    const forecasts = asset ? await listLibraryForecastsServer(collection.collectionId, asset.entityId) : [];
    const [publicEntity, selectedReceipt] = await Promise.all([
      asset ? getPublicEntityCached(asset.entityId) : null,
      forecasts[0] ? getLibraryReceiptCached(forecasts[0].receiptDigest) : null,
    ]);
    return <AssetPage
      batchId={collection.collectionId}
      routeSlug={routeSlug}
      setSlug={collection.publicSlug || collectionSlug}
      initialData={{ asset, forecasts, selectedReceipt, logo: { url: publicEntity?.logo?.url, alt: publicEntity?.logo?.alt } }}
    />;
  }

  const permanentId = pathname.match(/^\/forecasts\/(f-[0-9a-hjkmnp-tv-z]{26})$/)?.[1];
  const individual = parsePublicForecastPath(pathname) || (permanentId ? {
    routeSlug: "", generatedDate: "", targetSlug: "", forecasterSlug: "", forecastPublicId: permanentId,
  } : null);
  if (individual) {
    const forecast = await getPublicForecastCached(individual.forecastPublicId);
    if (!forecast) return null;
    const receipt = await getLibraryReceiptCached(forecast.receiptDigest);
    if (!receipt) return null;
    const originalEntity = receipt.document.receiptPayload.forecast.entity;
    const entity: PublicEntityRecord = await getPublicEntityCached(forecast.entityId, "listed-securities").catch(() => null) || {
      entityId: forecast.entityId, currentVersionId: "receipt-snapshot", entityType: originalEntity.type,
      entityClasses: ["forecastable_entity"], canonicalName: originalEntity.name, stableSlug: forecast.entitySlug,
      aliases: [], classifications: [], schemaOrgTypes: ["Thing"], externalIdentifiers: [], sameAs: [],
      publicationStatus: "published", visibility: "public",
    };
    const canonicalPath = publicForecastPath(publicEntitySlug(entity), forecast);
    // Frozen published paths and ID-only permalinks render directly. Do not
    // manufacture redirect chains when names, taxonomy or the UI change.
    if (!permanentId && pathname !== canonicalPath) return null;
    const ledger = await listLibraryForecastLedgerPageServer(entity.entityId).catch(() => ({ forecasts: [forecast], totalForecastCount: 1 }));
    const sidebarForecasts = ledger.forecasts.some((candidate) => candidate.forecastId === forecast.forecastId)
      ? ledger.forecasts
      : [forecast, ...ledger.forecasts];
    const initialData = forecast && receipt
      ? { entity, forecasts: sidebarForecasts, totalForecastCount: ledger.totalForecastCount, forecast, receipt }
      : null;
    return <IndividualForecastPage {...individual} routeSlug={forecast.entitySlug} initialData={initialData} />;
  }

  const legacyIndividual = parseLegacyPublicForecastPath(pathname);
  if (legacyIndividual) {
    const entity = await getPublicEntityCached(legacyIndividual.routeSlug, "listed-securities");
    if (!entity) return null;
    const ledger = await listLibraryForecastLedgerPageServer(entity.entityId);
    const forecast = ledger.forecasts.find((candidate) => publicForecastKeyMatches(candidate, legacyIndividual.forecastKey));
    if (!forecast) return null;
    permanentRedirect(publicForecastPath(publicEntitySlug(entity), forecast));
  }

  const forecastSet = parseEntityForecastSetPath(pathname);
  if (forecastSet?.collectionId) {
    const collection = (await listPublicCollectionsServer()).find((record) => record.collectionId === forecastSet.collectionId);
    if (!collection) return null;
    permanentRedirect(publicCollectionEntityPath(collection.publisherSlug || "ipulse-ai", collection.publicSlug || forecastSet.setSlug, forecastSet.routeSlug));
  }

  const ledgerMatch = parseEntityForecastLedgerPath(pathname);
  if (ledgerMatch) {
    const entity = await getPublicEntityCached(ledgerMatch.routeSlug, "listed-securities");
    if (!entity) return null;
    if (ledgerMatch.routeSlug !== publicEntitySlug(entity)) permanentRedirect(publicEntityForecastLedgerPath(publicEntitySlug(entity)));
    const [memberships, ledger] = await Promise.all([
      listEntityCollectionsServer(entity.entityId),
      listLibraryForecastLedgerPageServer(entity.entityId),
    ]);
    return <EntityForecastLedgerPage routeSlug={ledgerMatch.routeSlug} initialData={{
      entity,
      memberships,
      forecasts: ledger.forecasts,
      totalForecastCount: ledger.totalForecastCount,
      nextBeforePartNumber: ledger.nextBeforePartNumber,
      hasOlderParts: ledger.hasOlderParts,
    }} />;
  }

  const legacyCollection = parseEntityForecastCollectionPath(pathname);
  if (legacyCollection) {
    const collection = (await listPublicCollectionsServer()).find((record) => record.collectionId === legacyCollection.collectionId);
    if (!collection) return null;
    permanentRedirect(publicCollectionEntityPath(collection.publisherSlug || "ipulse-ai", collection.publicSlug || legacyCollection.collectionId, legacyCollection.routeSlug));
  }

  const entityMatch = parseEntityDetailPath(pathname);
  if (entityMatch) return entityDetail(entityMatch.routeKey, entityMatch.routeKind);

  const legacyAsset = pathname.match(/^\/assets\/([^/]+)$/);
  if (legacyAsset) permanentRedirect(publicEntityForecastLedgerPath(decodeURIComponent(legacyAsset[1])));
  const canonicalAsset = pathname.match(/^\/manifest\/([^/]+)\/assets\/([^/]+)$/);
  if (canonicalAsset) permanentRedirect(publicEntityForecastLedgerPath(decodeURIComponent(canonicalAsset[2])));

  const receipt = pathname.match(/^\/receipts\/([0-9a-fA-F]{64})$/);
  if (receipt) {
    const digest = receipt[1].toLowerCase();
    const resolver = await getPublicReceiptResolverServer(digest);
    if (resolver?.canonicalPath) permanentRedirect(resolver.canonicalPath);
    if (resolver?.forecastPublicId) {
      const forecast = await getPublicForecastCached(resolver.forecastPublicId);
      const entity = forecast ? await getPublicEntityCached(forecast.entityId, "listed-securities") : null;
      if (forecast && entity) permanentRedirect(publicForecastPath(publicEntitySlug(entity), forecast));
    }
    return null;
  }
  const manifest = pathname.match(/^\/manifest\/([^/]+)$/);
  if (manifest) {
    const collectionId = decodeURIComponent(manifest[1]);
    const collection = (await listPublicCollectionsServer()).find((record) => record.collectionId === collectionId);
    if (!collection) return null;
    permanentRedirect(publicCollectionPath(collection.publisherSlug || "ipulse-ai", collection.publicSlug || collection.collectionId));
  }
  if (pathname === "/how-it-works") return <StandardsPage />;
  if (pathname === "/standards") return <StandardsOverviewPage />;
  if (pathname === "/integrity-test") return <IntegrityDemoPage />;
  if (pathname === "/test") permanentRedirect("/integrity-test");
  return null;
}

export default async function PublicRoutePage({ params }: PageProps) {
  const pathname = pathnameFrom(await params);
  const content = await resolveRoute(pathname);
  if (!content) notFound();
  return <AppShell landing={pathname === "/"}>{content}</AppShell>;
}
