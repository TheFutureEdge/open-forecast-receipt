import { describe, expect, it } from "vitest";
import { addBasePath, normalizeBasePath, stripBasePath } from "../../lib/router";

describe("application base-path routing", () => {
  it("keeps Native root-hosted routes unchanged", () => {
    expect(normalizeBasePath("/")).toBe("");
    expect(addBasePath("/manifest/batch-6", "/")).toBe("/manifest/batch-6");
    expect(stripBasePath("/manifest/batch-6", "/")).toBe("/manifest/batch-6");
  });

  it("adds and strips the first-party iPulse tools prefix", () => {
    const basePath = "/tools/open-forecast-receipt/";
    const route = "/manifest/batch-6/assets/pepsi";

    expect(normalizeBasePath(basePath)).toBe("/tools/open-forecast-receipt");
    expect(addBasePath(route, basePath)).toBe(
      "/tools/open-forecast-receipt/manifest/batch-6/assets/pepsi",
    );
    expect(stripBasePath(addBasePath(route, basePath), basePath)).toBe(route);
  });
});
