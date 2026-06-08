import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RuntimeSnapshot } from "@/lib/runtime";

vi.mock("@/lib/config", () => ({
  getExtensionConfig: () => ({
    apiBaseUrl: "http://localhost:3000",
    firebase: null,
    googleOAuthClientId: "test-google-client-id.apps.googleusercontent.com",
    userSpaUrl: "http://localhost:5173/login",
  }),
}));

vi.mock("@/lib/api", () => ({
  createExtensionApiClient: () => ({
    getCurrentTimer: vi.fn(),
    loginWithFirebaseToken: vi.fn(),
    startTimerFromGitHub: vi.fn(),
    stopTimer: vi.fn(),
  }),
}));

vi.mock("@/lib/session", () => ({
  getStoredSession: vi.fn(),
}));

type ChromeStub = {
  runtime: {
    onMessage: { addListener: ReturnType<typeof vi.fn> };
    sendMessage: ReturnType<typeof vi.fn>;
  };
  tabs: {
    query: ReturnType<typeof vi.fn>;
    sendMessage: ReturnType<typeof vi.fn>;
  };
};

function createChromeStub(): ChromeStub {
  return {
    runtime: {
      onMessage: { addListener: vi.fn() },
      sendMessage: vi.fn(async () => undefined),
    },
    tabs: {
      query: vi.fn(async () => []),
      sendMessage: vi.fn(async () => undefined),
    },
  };
}

describe("background snapshot broadcast", () => {
  let chromeStub: ChromeStub;

  beforeEach(() => {
    vi.resetModules();
    chromeStub = createChromeStub();
    vi.stubGlobal("chrome", chromeStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("broadcasts snapshot updates to runtime listeners and GitHub content-script tabs", async () => {
    chromeStub.tabs.query.mockResolvedValue([
      { id: 11, url: "https://github.com/octo/repo/issues/184" },
      { id: 12, url: "https://github.com/octo/repo/pull/200" },
      { url: "https://github.com/octo/repo/issues/201" },
    ]);

    const { broadcastSnapshot } = await import("./main");
    const snapshot: RuntimeSnapshot = {
      authenticated: true,
      currentTimer: null,
      errorMessage: null,
    };

    await broadcastSnapshot(snapshot);

    expect(chromeStub.runtime.sendMessage).toHaveBeenCalledWith({
      type: "runtime/snapshot-updated",
      snapshot,
    });
    expect(chromeStub.tabs.query).toHaveBeenCalledWith({
      url: [
        "https://github.com/*/*/issues/*",
        "https://github.com/*/*/pull/*",
        "https://github.com/orgs/*/projects/*",
      ],
    });
    expect(chromeStub.tabs.sendMessage).toHaveBeenCalledTimes(2);
    expect(chromeStub.tabs.sendMessage).toHaveBeenNthCalledWith(1, 11, {
      type: "runtime/snapshot-updated",
      snapshot,
    });
    expect(chromeStub.tabs.sendMessage).toHaveBeenNthCalledWith(2, 12, {
      type: "runtime/snapshot-updated",
      snapshot,
    });
  });

  it("still attempts tab delivery when runtime broadcast rejects", async () => {
    chromeStub.runtime.sendMessage.mockRejectedValueOnce(new Error("no popup"));
    chromeStub.tabs.query.mockResolvedValue([{ id: 11 }]);

    const { broadcastSnapshot } = await import("./main");

    await expect(
      broadcastSnapshot({
        authenticated: false,
        currentTimer: null,
        errorMessage: null,
      }),
    ).resolves.toBeUndefined();

    expect(chromeStub.tabs.sendMessage).toHaveBeenCalledOnce();
  });

  it("ignores per-tab delivery failures so other content scripts still receive updates", async () => {
    chromeStub.tabs.query.mockResolvedValue([{ id: 11 }, { id: 12 }]);
    chromeStub.tabs.sendMessage
      .mockRejectedValueOnce(new Error("receiver missing"))
      .mockResolvedValueOnce(undefined);

    const { broadcastSnapshot } = await import("./main");

    await expect(
      broadcastSnapshot({
        authenticated: true,
        currentTimer: null,
        errorMessage: null,
      }),
    ).resolves.toBeUndefined();

    expect(chromeStub.tabs.sendMessage).toHaveBeenCalledTimes(2);
  });
});
