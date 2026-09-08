export const CANONICAL_PRODUCTION_ORIGIN = "https://forecastlibrary.com";
export const CANONICAL_STAGING_ORIGIN = "https://ofl-staging--oflapp-staging.us-central1.hosted.app";

/** Keep metadata, canonical tags, robots, and sitemaps on one configured origin. */
export function getPublicSiteOrigin(): string {
  const configured = String(process.env.NEXT_PUBLIC_SITE_ORIGIN || "").trim().replace(/\/$/, "");
  let configuredOrigin: string | null = null;
  if (configured) {
    try {
      const parsed = new URL(configured);
      if (parsed.protocol === "https:" && parsed.hostname && !parsed.username && !parsed.password) configuredOrigin = parsed.origin;
    } catch {
      throw new Error("NEXT_PUBLIC_SITE_ORIGIN must be a credential-free HTTPS origin");
    }
  }

  const deploymentEnvironment = String(process.env.NEXT_PUBLIC_OFL_ENVIRONMENT || "").trim();
  const projectId = String(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "").trim();
  if (deploymentEnvironment === "production" || projectId === "oflapp-prod") {
    if (configuredOrigin !== CANONICAL_PRODUCTION_ORIGIN) {
      throw new Error(`Production requires NEXT_PUBLIC_SITE_ORIGIN=${CANONICAL_PRODUCTION_ORIGIN}`);
    }
    return CANONICAL_PRODUCTION_ORIGIN;
  }
  if (deploymentEnvironment === "staging" || projectId === "oflapp-staging") {
    if (configuredOrigin && configuredOrigin !== CANONICAL_STAGING_ORIGIN) {
      throw new Error(`Staging requires NEXT_PUBLIC_SITE_ORIGIN=${CANONICAL_STAGING_ORIGIN}`);
    }
    return CANONICAL_STAGING_ORIGIN;
  }
  if (configuredOrigin) return configuredOrigin;
  return typeof window === "undefined" ? "http://127.0.0.1:4178" : window.location.origin;
}
