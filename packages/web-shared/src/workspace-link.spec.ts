import { afterEach, describe, expect, it, vi } from "vitest";

import { getCounterpartWorkspaceHref } from "./workspace-link";

describe("getCounterpartWorkspaceHref", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses configured app URLs when present", () => {
    expect(
      getCounterpartWorkspaceHref({
        configuredUrl: " https://admin.example.test/login ",
        fallbackPath: "/login",
      }),
    ).toBe("https://admin.example.test/login");
  });

  it("uses same-origin fallback when no configured URL is present", () => {
    vi.stubGlobal("window", {
      location: {
        origin: "https://app.example.test",
      },
    });

    expect(
      getCounterpartWorkspaceHref({
        fallbackPath: "/login",
      }),
    ).toBe("https://app.example.test/login");
  });

  it("uses fallback path when window is unavailable", () => {
    expect(
      getCounterpartWorkspaceHref({
        fallbackPath: "/login",
      }),
    ).toBe("/login");
  });
});
