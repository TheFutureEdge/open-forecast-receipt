import { useEffect, type ReactNode } from "react";
import { AppShell } from "./components/layout/AppShell";
import { ManifestPage } from "./components/manifest/ManifestPage";
import { AssetPage } from "./components/asset/AssetPage";
import { ReceiptDetail } from "./components/receipt/ReceiptDetail";
import { StandardsPage } from "./components/standards/StandardsPage";
import { NotFoundPage } from "./components/common/NotFoundPage";
import { navigate, useLocation } from "./lib/router";

function resolveRoute(pathname: string): ReactNode {
  if (pathname === "/" || pathname === "/manifest/batch-6") {
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

  return <NotFoundPage />;
}

export default function App() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname === "/") {
      navigate("/manifest/batch-6", { replace: true });
    }
  }, [pathname]);

  return (
    <AppShell>{resolveRoute(pathname)}</AppShell>
  );
}
