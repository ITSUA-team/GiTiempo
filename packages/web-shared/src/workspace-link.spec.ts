import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getCounterpartWorkspaceAppHref,
  getCounterpartWorkspaceHref,
} from "./workspace-link";

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
    vi.stubGlobal("window", undefined);

    expect(
      getCounterpartWorkspaceHref({
        fallbackPath: "/login",
      }),
    ).toBe("/login");
  });
});

describe("getCounterpartWorkspaceAppHref", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("normalizes configured app URLs to the application root", () => {
    expect(
      getCounterpartWorkspaceAppHref({
        configuredUrl: " https://admin.example.test/login?next=%2Freports ",
        fallbackPath: "/",
      }),
    ).toBe("https://admin.example.test/");
  });

  it("uses same-origin root fallback when no configured URL is present", () => {
    vi.stubGlobal("window", {
      location: {
        origin: "https://app.example.test",
      },
    });

    expect(
      getCounterpartWorkspaceAppHref({
        fallbackPath: "/",
      }),
    ).toBe("https://app.example.test/");
  });

  it("returns the fallback path when window is unavailable", () => {
    vi.stubGlobal("window", undefined);

    expect(
      getCounterpartWorkspaceAppHref({
        fallbackPath: "/",
      }),
    ).toBe("/");
  });
});
