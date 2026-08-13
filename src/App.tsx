import type { ReactNode } from "react";
import { AppShell } from "./components/layout/AppShell";
import { ManifestPage } from "./components/manifest/ManifestPage";
import { AssetPage } from "./components/asset/AssetPage";
import { ReceiptDetail } from "./components/receipt/ReceiptDetail";
import { IntegrityDemoPage } from "./components/receipt/IntegrityDemoPage";
import { StandardsPage } from "./components/standards/StandardsPage";
import { NotFoundPage } from "./components/common/NotFoundPage";
import { useLocation } from "./lib/router";
import { LandingPage } from "./components/landing/LandingPage";
import { EntityCatalogPage, ENTITY_CATALOG_PRESETS } from "./components/entities/EntityCatalogPage";
import { EntityDetailPage } from "./components/entities/EntityDetailPage";
import { EntityCategoryComingSoonPage } from "./components/entities/EntityCategoryComingSoonPage";
import { ForecasterCatalogPage } from "./components/forecasters/ForecasterCatalogPage";
import { RouteSeo } from "./components/seo/RouteSeo";

function resolveRoute(pathname: string): ReactNode {
  if (
    pathname === "/showcase"
    || pathname === "/showcase/"
    || pathname === "/forecasts"
    || pathname === "/forecasts/"
    || pathname === "/manifest/batch-6"
  ) {
    return <ManifestPage batchId="batch-6" />;
  }

  if (pathname === "/") {
    return <LandingPage />;
  }

  if (pathname === "/entities" || pathname === "/entities/") {
    return <EntityCatalogPage preset={ENTITY_CATALOG_PRESETS["all-forecast-subjects"]} />;
  }

  if (pathname === "/entities/directory" || pathname === "/entities/directory/") {
    return <EntityCatalogPage preset={ENTITY_CATALOG_PRESETS.directory} />;
  }

  const subjectCatalogMatch = pathname.match(/^\/entities\/subjects\/(listed-securities|funds-etfs|cryptoassets|commodities|currency-pairs|market-indices)\/?$/);
  if (subjectCatalogMatch) {
    return <EntityCatalogPage preset={ENTITY_CATALOG_PRESETS[subjectCatalogMatch[1]]} />;
  }

  if (pathname === "/entities/subjects/macroeconomics" || pathname === "/entities/subjects/macroeconomics/") {
    return <EntityCategoryComingSoonPage categoryKey="macroeconomics" />;
  }

  const contextCatalogMatch = pathname.match(/^\/entities\/context\/(corporations|investment-funds)\/?$/);
  if (contextCatalogMatch) {
    return <EntityCatalogPage preset={ENTITY_CATALOG_PRESETS[contextCatalogMatch[1]]} />;
  }

  const contextComingSoonMatch = pathname.match(/^\/entities\/context\/(countries|markets-venues|networks-protocols)\/?$/);
  if (contextComingSoonMatch) {
    return <EntityCategoryComingSoonPage categoryKey={contextComingSoonMatch[1]} />;
  }

  if (pathname === "/entities/organizations" || pathname === "/entities/organizations/") {
    return <EntityCatalogPage preset={ENTITY_CATALOG_PRESETS.corporations} />;
  }

  if (
    pathname === "/forecasters"
    || pathname === "/forecasters/"
    || pathname === "/entities/forecasters"
    || pathname === "/entities/forecasters/"
  ) {
    return <ForecasterCatalogPage />;
  }

  const entityMatch = pathname.match(/^\/entities\/([^/]+)\/?$/);
  if (entityMatch) {
    return <EntityDetailPage routeKey={decodeURIComponent(entityMatch[1])} />;
  }

  if (pathname === "/receipts" || pathname === "/receipts/") {
    return <ManifestPage batchId="batch-6" />;
  }

  const manifestMatch = pathname.match(/^\/manifest\/([^/]+)\/?$/);
  if (manifestMatch) {
    return <ManifestPage batchId={decodeURIComponent(manifestMatch[1])} />;
  }

  const canonicalAssetMatch = pathname.match(/^\/manifest\/([^/]+)\/assets\/([^/]+)\/?$/);
  if (canonicalAssetMatch) {
    return (
      <AssetPage
        batchId={decodeURIComponent(canonicalAssetMatch[1])}
        routeSlug={decodeURIComponent(canonicalAssetMatch[2])}
      />
    );
  }

  const showcaseAssetMatch = pathname.match(/^\/showcase\/([^/]+)\/?$/);
  if (showcaseAssetMatch) {
    return <AssetPage batchId="batch-6" routeSlug={decodeURIComponent(showcaseAssetMatch[1])} />;
  }

  const assetMatch = pathname.match(/^\/assets\/([^/]+)\/?$/);
  if (assetMatch) {
    return <AssetPage batchId="batch-6" routeSlug={decodeURIComponent(assetMatch[1])} />;
  }

  const receiptMatch = pathname.match(/^\/receipts\/([0-9a-fA-F]{64})\/?$/);
  if (receiptMatch) {
    return <ReceiptDetail receiptDigest={receiptMatch[1].toLowerCase()} />;
  }

  if (pathname === "/standards" || pathname === "/standards/") {
    return <StandardsPage />;
  }

  if (pathname === "/test" || pathname === "/test/") {
    return <IntegrityDemoPage />;
  }

  return <NotFoundPage />;
}

export default function App() {
  const { pathname } = useLocation();

  return (
    <>
      <RouteSeo pathname={pathname} />
      <AppShell landing={pathname === "/"}>{resolveRoute(pathname)}</AppShell>
    </>
  );
}
