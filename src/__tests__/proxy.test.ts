import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "../../proxy";
import profiles from "../../deployment-profiles.json";

afterEach(() => vi.unstubAllEnvs());

describe("production canonical host behind App Hosting", () => {
  it("serves the canonical domain despite an internal HTTP origin", () => {
    vi.stubEnv("NEXT_PUBLIC_OFL_ENVIRONMENT", "production");
    const response = proxy(new NextRequest("http://0.0.0.0:8080/forecasts", {
      headers: { host: "0.0.0.0:8080", "x-forwarded-host": "forecastlibrary.com" },
    }));
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it.each(["www.forecastlibrary.com", "ofl-prod--oflapp-prod.us-central1.hosted.app"])(
    "redirects %s once, preserving path and query", (host) => {
      vi.stubEnv("NEXT_PUBLIC_OFL_ENVIRONMENT", "production");
      const response = proxy(new NextRequest("http://0.0.0.0:8080/forecasts?launch=1", {
        headers: { host: "0.0.0.0:8080", "x-forwarded-host": host },
      }));
      expect(response.status).toBe(308);
      expect(response.headers.get("location")).toBe("https://forecastlibrary.com/forecasts?launch=1");
    },
  );

  it("keeps staging browseable and excluded from indexing", () => {
    vi.stubEnv("NEXT_PUBLIC_OFL_ENVIRONMENT", "staging");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "oflapp-staging");
    const response = proxy(new NextRequest("https://ofl-staging--oflapp-staging.us-central1.hosted.app/"));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
  });

  it("serves only this production project's provider-assigned candidate host with noindex", () => {
    vi.stubEnv("NEXT_PUBLIC_OFL_ENVIRONMENT", "production");
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_PROJECT_ID", profiles.production.vercelProjectId);
    vi.stubEnv("VERCEL_URL", "forecast-library-production-reviewed-ipulseai.vercel.app");
    const url = "https://forecast-library-production-reviewed-ipulseai.vercel.app/forecasts";
    expect(proxy(new NextRequest(url)).status).toBe(200);
    expect(proxy(new NextRequest(url)).headers.get("x-robots-tag")).toContain("noindex");
    expect(proxy(new NextRequest("https://unrelated.vercel.app/forecasts")).status).toBe(308);
    vi.stubEnv("VERCEL_PROJECT_ID", profiles.staging.vercelProjectId);
    expect(proxy(new NextRequest(url)).status).toBe(308);
  });
});
