import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "../../proxy";

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
});
