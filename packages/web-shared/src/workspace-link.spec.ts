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
        localhostPort: "5174",
      }),
    ).toBe("https://admin.example.test/login");
  });

  it("uses localhost port fallback for user-to-admin links", () => {
    vi.stubGlobal("window", {
      location: {
        hostname: "localhost",
        origin: "http://localhost:5173",
        protocol: "http:",
      },
    });

    expect(
      getCounterpartWorkspaceHref({
        fallbackPath: "/login",
        localhostPort: "5174",
      }),
    ).toBe("http://localhost:5174/login");
  });

  it("uses localhost port fallback for admin-to-user links", () => {
    vi.stubGlobal("window", {
      location: {
        hostname: "127.0.0.1",
        origin: "http://127.0.0.1:5174",
        protocol: "http:",
      },
    });

    expect(
      getCounterpartWorkspaceHref({
        fallbackPath: "/login",
        localhostPort: "5173",
      }),
    ).toBe("http://127.0.0.1:5173/login");
  });

  it("uses same-origin fallback for non-localhost hosts", () => {
    vi.stubGlobal("window", {
      location: {
        hostname: "app.example.test",
        origin: "https://app.example.test",
        protocol: "https:",
      },
    });

    expect(
      getCounterpartWorkspaceHref({
        fallbackPath: "/login",
        localhostPort: "5174",
      }),
    ).toBe("https://app.example.test/login");
  });

  it("uses fallback path when window is unavailable", () => {
    expect(
      getCounterpartWorkspaceHref({
        fallbackPath: "/login",
        localhostPort: "5174",
      }),
    ).toBe("/login");
  });
});
