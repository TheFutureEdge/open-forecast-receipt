import type { MetadataRoute } from "next";
import { getPublicSiteOrigin } from "../src/lib/siteOrigin";

export default function robots(): MetadataRoute.Robots {
  const production = process.env.NEXT_PUBLIC_OFL_ENVIRONMENT === "production"
    || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID === "oflapp-prod";
  return production
    ? { rules: { userAgent: "*", allow: "/" }, sitemap: `${getPublicSiteOrigin()}/sitemap.xml` }
    : { rules: { userAgent: "*", disallow: "/" } };
}
