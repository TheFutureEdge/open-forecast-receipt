import { afterEach, expect, it, vi } from "vitest";
import { getPublicSiteOrigin, CANONICAL_PRODUCTION_ORIGIN, CANONICAL_STAGING_ORIGIN, VERCEL_STAGING_ORIGIN } from "../../lib/siteOrigin";
afterEach(() => vi.unstubAllEnvs());
it.each([CANONICAL_STAGING_ORIGIN, VERCEL_STAGING_ORIGIN])("preserves the isolated staging origin %s", origin => {
  vi.stubEnv("NEXT_PUBLIC_OFL_ENVIRONMENT", "staging");
  vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "oflapp-staging");
  vi.stubEnv("NEXT_PUBLIC_SITE_ORIGIN", origin);
  expect(getPublicSiteOrigin()).toBe(origin);
});
it("rejects an arbitrary staging host and a provider-owned production canonical", () => {
  vi.stubEnv("NEXT_PUBLIC_OFL_ENVIRONMENT", "staging");
  vi.stubEnv("NEXT_PUBLIC_SITE_ORIGIN", "https://unrelated.vercel.app");
  expect(getPublicSiteOrigin).toThrow("Staging requires");
  vi.stubEnv("NEXT_PUBLIC_OFL_ENVIRONMENT", "production");
  vi.stubEnv("NEXT_PUBLIC_SITE_ORIGIN", VERCEL_STAGING_ORIGIN);
  expect(getPublicSiteOrigin).toThrow("Production requires");
  vi.stubEnv("NEXT_PUBLIC_SITE_ORIGIN", CANONICAL_PRODUCTION_ORIGIN);
  expect(getPublicSiteOrigin()).toBe(CANONICAL_PRODUCTION_ORIGIN);
});
