import { describe, expect, it } from "vitest";
import { sitemapLastModified } from "../../lib/library/sitemapDate";

describe("sitemap lastmod dates", () => {
  it("normalizes BigQuery timestamps to W3C datetime format", () => {
    expect(sitemapLastModified("2026-09-22 03:07:27.444232+00")).toBe("2026-09-22T03:07:27.444Z");
    expect(sitemapLastModified("2026-09-08 03:08:00.987817+00")).toBe("2026-09-08T03:08:00.987Z");
    expect(sitemapLastModified("2026-09-22T08:37:27.444+05:30")).toBe("2026-09-22T03:07:27.444Z");
  });

  it("keeps valid dates and omits unavailable or unzoned timestamps", () => {
    expect(sitemapLastModified("2026-09-22")).toBe("2026-09-22");
    expect(sitemapLastModified("2026-09-22T03:07:27Z")).toBe("2026-09-22T03:07:27.000Z");
    for (const value of [undefined, "", "unknown", "2026-09-22 03:07:27", "2026-99-99", "2026-02-30"]) {
      expect(sitemapLastModified(value)).toBeUndefined();
    }
  });
});
