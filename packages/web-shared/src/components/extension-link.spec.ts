import { describe, expect, it } from "vitest";

import { getExtensionInstallHref } from "./extension-link";

describe("getExtensionInstallHref", () => {
  it("uses the configured install page", () => {
    expect(
      getExtensionInstallHref(
        "https://chromewebstore.google.com/detail/gitiempo/abc",
      ),
    ).toBe("https://chromewebstore.google.com/detail/gitiempo/abc");
  });

  it("trims surrounding whitespace", () => {
    expect(
      getExtensionInstallHref("  https://chromewebstore.google.com/detail/x  "),
    ).toBe("https://chromewebstore.google.com/detail/x");
  });

  it("returns null when no install page is configured", () => {
    expect(getExtensionInstallHref(undefined)).toBeNull();
    expect(getExtensionInstallHref("")).toBeNull();
    expect(getExtensionInstallHref("   ")).toBeNull();
  });

  it("returns null for anything but an absolute http(s) address", () => {
    expect(getExtensionInstallHref("::not a url::")).toBeNull();
    // A relative path would otherwise resolve against our own origin and link
    // back into the app instead of the store.
    expect(getExtensionInstallHref("/extension")).toBeNull();
    expect(getExtensionInstallHref("javascript:alert(1)")).toBeNull();
  });
});
