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
import { EntityCatalogPage } from "./components/entities/EntityCatalogPage";
import { EntityDetailPage } from "./components/entities/EntityDetailPage";

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
    return <EntityCatalogPage />;
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
    <AppShell landing={pathname === "/"}>{resolveRoute(pathname)}</AppShell>
  );
}
