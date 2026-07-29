import { describe, expect, it } from "vitest";

import { getLandingExtensionHref } from "./landing";

describe("getLandingExtensionHref", () => {
  it("points a configured origin at the extension section", () => {
    expect(getLandingExtensionHref("https://landing.example.test")).toBe(
      "https://landing.example.test/#github-workflow",
    );
  });

  it("keeps a trailing-slash origin from doubling the separator", () => {
    expect(getLandingExtensionHref("https://landing.example.test/")).toBe(
      "https://landing.example.test/#github-workflow",
    );
  });

  it("keeps a configured subpath", () => {
    expect(getLandingExtensionHref("https://example.test/landing")).toBe(
      "https://example.test/landing#github-workflow",
    );
  });

  it("replaces an anchor the configured value already carries", () => {
    expect(getLandingExtensionHref("https://landing.example.test/#faq")).toBe(
      "https://landing.example.test/#github-workflow",
    );
  });

  it("returns null when the landing is not configured", () => {
    expect(getLandingExtensionHref(undefined)).toBeNull();
    expect(getLandingExtensionHref("")).toBeNull();
    expect(getLandingExtensionHref("   ")).toBeNull();
  });
});
