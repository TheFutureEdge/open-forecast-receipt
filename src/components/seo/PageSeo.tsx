export interface PageSeoProps {
  title: string;
  description: string;
  canonicalPath: string;
  pageType?: "website" | "article" | "profile";
}
/**
 * Compatibility shim for components shared with the first client-routed build.
 * Next.js generateMetadata is now the sole authority for titles, canonicals,
 * robots, Open Graph, and Twitter metadata. Client-side head mutation would
 * create contradictory crawler signals, so this component intentionally emits
 * no markup and performs no effects.
 */
export function PageSeo(_props: PageSeoProps) {
  return null;
}
