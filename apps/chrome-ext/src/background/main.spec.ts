import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RuntimeSnapshot } from "@/lib/runtime";

const backgroundApiMocks = vi.hoisted(() => ({
  exitSession: vi.fn(),
  getCurrentTimer: vi.fn(),
  loginWithFirebaseToken: vi.fn(),
  startTimerFromGitHub: vi.fn(),
  stopTimer: vi.fn(),
}));

const sessionMocks = vi.hoisted(() => ({
  clearPendingProviderCleanup: vi.fn(),
  getStoredSession: vi.fn(),
  hasPendingProviderCleanup: vi.fn(),
  setPendingProviderCleanup: vi.fn(),
}));

const firebaseMocks = vi.hoisted(() => ({
  signOutFromFirebase: vi.fn(),
}));

vi.mock("@/lib/config", () => ({
  getExtensionConfig: () => ({
    apiBaseUrl: "http://localhost:3000",
    firebase: null,
    googleOAuthClientId: "test-google-client-id.apps.googleusercontent.com",
    userSpaUrl: "http://localhost:5173/login",
  }),
}));

vi.mock("@/lib/api", () => ({
  createExtensionApiClient: () => backgroundApiMocks,
}));

vi.mock("@/lib/firebase", () => ({
  signInWithGoogle: vi.fn(async () => "firebase-google-token"),
  signOutFromFirebase: firebaseMocks.signOutFromFirebase,
}));

vi.mock("@/lib/github-signin", () => ({
  signInWithGithub: vi.fn(async () => ({ code: "code", verifier: "verifier" })),
}));

vi.mock("@/lib/session", () => ({
  clearPendingProviderCleanup: sessionMocks.clearPendingProviderCleanup,
  getStoredSession: sessionMocks.getStoredSession,
  hasPendingProviderCleanup: sessionMocks.hasPendingProviderCleanup,
  setPendingProviderCleanup: sessionMocks.setPendingProviderCleanup,
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

function makeAccessToken(payload: Record<string, unknown>): string {
  const encode = (value: object): string =>
    btoa(JSON.stringify(value))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.signature`;
}

describe("background snapshot broadcast", () => {
  let chromeStub: ChromeStub;

  beforeEach(() => {
    vi.resetModules();
    chromeStub = createChromeStub();
    vi.stubGlobal("chrome", chromeStub);
    vi.clearAllMocks();
    sessionMocks.getStoredSession.mockResolvedValue(null);
    sessionMocks.hasPendingProviderCleanup.mockResolvedValue(false);
    firebaseMocks.signOutFromFirebase.mockResolvedValue(undefined);
    backgroundApiMocks.exitSession.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("broadcasts snapshot updates to runtime listeners and GitHub content-script tabs", async () => {
    chromeStub.tabs.query.mockResolvedValue([
      { id: 11, url: "https://github.com/octo/repo/issues/184" },
      { id: 12, url: "https://github.com/orgs/octo/projects/7?pane=issue" },
      { url: "https://github.com/octo/repo/issues/201" },
    ]);

    const { broadcastSnapshot } = await import("./main");
    const snapshot: RuntimeSnapshot = {
      authenticated: true,
      currentTimer: null,
      errorMessage: null,
      user: null,
    };

    await broadcastSnapshot(snapshot);

    expect(chromeStub.runtime.sendMessage).toHaveBeenCalledWith({
      type: "runtime/snapshot-updated",
      snapshot,
    });
    expect(chromeStub.tabs.query).toHaveBeenCalledWith({
      url: [
        "https://github.com/*/*/issues/*",
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
        providerCleanupPending: false,
        user: null,
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
        user: null,
      }),
    ).resolves.toBeUndefined();

    expect(chromeStub.tabs.sendMessage).toHaveBeenCalledTimes(2);
  });

  it("returns a structured auth error result instead of rejecting the message", async () => {
    backgroundApiMocks.loginWithFirebaseToken.mockRejectedValueOnce(
      new Error("GiTiempo API is temporarily unavailable. Please try again in a moment."),
    );

    await import("./main");

    const onMessage = chromeStub.runtime.onMessage.addListener.mock.calls[0]?.[0];
    const sendResponse = vi.fn();

    expect(onMessage).toBeTypeOf("function");
    expect(
      onMessage(
        {
          type: "auth/exchange-firebase-token",
          firebaseIdToken: "firebase-id-token",
        },
        {},
        sendResponse,
      ),
    ).toBe(true);

    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledWith({
        errorMessage: "GiTiempo API is temporarily unavailable. Please try again in a moment.",
        ok: false,
        snapshot: {
          authenticated: false,
          currentTimer: null,
          errorMessage: null,
          providerCleanupPending: false,
          user: null,
        },
      });
    });
    expect(chromeStub.runtime.sendMessage).toHaveBeenCalledWith({
      type: "runtime/snapshot-updated",
      snapshot: {
        authenticated: false,
        currentTimer: null,
        errorMessage: null,
        providerCleanupPending: false,
        user: null,
      },
    });
  });

  it("stops only the timer identity supplied by the caller", async () => {
    backgroundApiMocks.stopTimer.mockResolvedValue({});

    await import("./main");

    const onMessage = chromeStub.runtime.onMessage.addListener.mock.calls[0]?.[0];
    const sendResponse = vi.fn();

    expect(onMessage).toBeTypeOf("function");
    expect(
      onMessage(
        {
          type: "timer/stop",
          expectedTimerId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002",
        },
        {},
        sendResponse,
      ),
    ).toBe(true);

    await vi.waitFor(() => {
      expect(backgroundApiMocks.stopTimer).toHaveBeenCalledWith({
        expectedTimerId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002",
      });
    });
    expect(backgroundApiMocks.getCurrentTimer).not.toHaveBeenCalled();
  });

  it("includes the signed-in user decoded from the session token", async () => {
    sessionMocks.getStoredSession.mockResolvedValue({
      accessToken: makeAccessToken({ sub: "user-1", email: "alexey@example.com" }),
      refreshToken: "refresh-token",
    });
    backgroundApiMocks.getCurrentTimer.mockResolvedValue({ timeEntry: null });

    await import("./main");

    const onMessage = chromeStub.runtime.onMessage.addListener.mock.calls[0]?.[0];
    const sendResponse = vi.fn();

    expect(onMessage).toBeTypeOf("function");
    onMessage({ type: "runtime/get-snapshot" }, {}, sendResponse);

    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledWith({
        authenticated: true,
        currentTimer: null,
        errorMessage: null,
        providerCleanupPending: false,
        user: { displayName: null, email: "alexey@example.com" },
      });
    });
  });

  it("starts Firebase cleanup without waiting for backend revoke and clears its marker on success", async () => {
    let releaseRevoke: (() => void) | undefined;
    backgroundApiMocks.exitSession.mockImplementation(
      () => new Promise<void>((resolve) => {
        releaseRevoke = resolve;
      }),
    );

    await import("./main");
    const onMessage = chromeStub.runtime.onMessage.addListener.mock.calls[0]?.[0];
    const sendResponse = vi.fn();

    onMessage({ type: "auth/sign-out" }, {}, sendResponse);

    await vi.waitFor(() => {
      expect(sessionMocks.setPendingProviderCleanup).toHaveBeenCalledOnce();
      expect(firebaseMocks.signOutFromFirebase).toHaveBeenCalledOnce();
    });
    await vi.waitFor(() => {
      expect(sessionMocks.clearPendingProviderCleanup).toHaveBeenCalledOnce();
    });
    expect(sendResponse).not.toHaveBeenCalled();

    releaseRevoke?.();

    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({ ok: true }),
      );
    });
  });

  it("keeps a credential-free pending marker and exposes a retry after Firebase cleanup fails", async () => {
    firebaseMocks.signOutFromFirebase.mockRejectedValueOnce(new Error("indexeddb unavailable"));
    sessionMocks.hasPendingProviderCleanup.mockResolvedValue(true);

    await import("./main");
    const onMessage = chromeStub.runtime.onMessage.addListener.mock.calls[0]?.[0];
    const firstResponse = vi.fn();

    onMessage({ type: "auth/sign-out" }, {}, firstResponse);

    await vi.waitFor(() => {
      expect(firstResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          errorMessage: "Sign-out was incomplete. Retry to remove the remaining provider session.",
          ok: false,
          snapshot: expect.objectContaining({
            authenticated: false,
            providerCleanupPending: true,
          }),
        }),
      );
    });
    expect(backgroundApiMocks.exitSession).toHaveBeenCalledOnce();
    expect(sessionMocks.clearPendingProviderCleanup).not.toHaveBeenCalled();

    // A new service-worker module reads the persisted boolean, rather than
    // relying on the previous worker's in-memory state.
    vi.resetModules();
    await import("./main");
    const restartedOnMessage = chromeStub.runtime.onMessage.addListener.mock.calls.at(-1)?.[0];
    const restoredSnapshot = vi.fn();
    restartedOnMessage({ type: "runtime/get-snapshot" }, {}, restoredSnapshot);

    await vi.waitFor(() => {
      expect(restoredSnapshot).toHaveBeenCalledWith(
        expect.objectContaining({ providerCleanupPending: true }),
      );
    });

    const retryResponse = vi.fn();
    restartedOnMessage({ type: "auth/retry-provider-cleanup" }, {}, retryResponse);

    await vi.waitFor(() => {
      expect(firebaseMocks.signOutFromFirebase).toHaveBeenCalledTimes(2);
      expect(sessionMocks.clearPendingProviderCleanup).toHaveBeenCalledOnce();
      expect(retryResponse).toHaveBeenCalledWith(
        expect.objectContaining({ ok: true }),
      );
    });
    expect(backgroundApiMocks.exitSession).toHaveBeenCalledOnce();
  });

  it("waits for a pending revoke after Firebase fails without leaving an unhandled cleanup rejection", async () => {
    let releaseRevoke: (() => void) | undefined;
    backgroundApiMocks.exitSession.mockImplementation(
      () => new Promise<void>((resolve) => {
        releaseRevoke = resolve;
      }),
    );
    firebaseMocks.signOutFromFirebase.mockRejectedValueOnce(new Error("indexeddb unavailable"));
    sessionMocks.hasPendingProviderCleanup.mockResolvedValue(true);

    await import("./main");
    const onMessage = chromeStub.runtime.onMessage.addListener.mock.calls[0]?.[0];
    const sendResponse = vi.fn();

    onMessage({ type: "auth/sign-out" }, {}, sendResponse);

    await vi.waitFor(() => {
      expect(sessionMocks.setPendingProviderCleanup).toHaveBeenCalledOnce();
      expect(firebaseMocks.signOutFromFirebase).toHaveBeenCalledOnce();
    });
    expect(sendResponse).not.toHaveBeenCalled();

    releaseRevoke?.();

    await vi.waitFor(() => {
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          errorMessage: "Sign-out was incomplete. Retry to remove the remaining provider session.",
          ok: false,
          snapshot: expect.objectContaining({ providerCleanupPending: true }),
        }),
      );
    });
  });

  it("keeps the retry reachable in memory when both Firebase and marker persistence fail", async () => {
    sessionMocks.setPendingProviderCleanup.mockRejectedValueOnce(
      new Error("storage unavailable"),
    );
    firebaseMocks.signOutFromFirebase.mockRejectedValueOnce(new Error("indexeddb unavailable"));

    await import("./main");
    const onMessage = chromeStub.runtime.onMessage.addListener.mock.calls[0]?.[0];
    const signOutResponse = vi.fn();

    onMessage({ type: "auth/sign-out" }, {}, signOutResponse);

    await vi.waitFor(() => {
      expect(signOutResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          errorMessage: "Sign-out was incomplete. Retry to remove the remaining provider session. Recovery status could not be stored.",
          ok: false,
          snapshot: expect.objectContaining({ providerCleanupPending: true }),
        }),
      );
    });

    const retryResponse = vi.fn();
    onMessage({ type: "auth/retry-provider-cleanup" }, {}, retryResponse);

    await vi.waitFor(() => {
      expect(retryResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          snapshot: expect.objectContaining({ providerCleanupPending: false }),
        }),
      );
    });
  });

  it("retains the retry state when clearing its persisted marker fails", async () => {
    sessionMocks.clearPendingProviderCleanup.mockRejectedValueOnce(
      new Error("storage unavailable"),
    );

    await import("./main");
    const onMessage = chromeStub.runtime.onMessage.addListener.mock.calls[0]?.[0];
    const retryResponse = vi.fn();

    onMessage({ type: "auth/retry-provider-cleanup" }, {}, retryResponse);

    await vi.waitFor(() => {
      expect(retryResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          errorMessage: "Sign-out completed, but its recovery status could not be stored.",
          ok: false,
          snapshot: expect.objectContaining({ providerCleanupPending: true }),
        }),
      );
    });
  });

  it("continues GiTiempo and Firebase cleanup when writing the recovery marker fails", async () => {
    sessionMocks.setPendingProviderCleanup.mockRejectedValueOnce(
      new Error("storage unavailable"),
    );

    await import("./main");
    const onMessage = chromeStub.runtime.onMessage.addListener.mock.calls[0]?.[0];
    const sendResponse = vi.fn();

    onMessage({ type: "auth/sign-out" }, {}, sendResponse);

    await vi.waitFor(() => {
      expect(backgroundApiMocks.exitSession).toHaveBeenCalledOnce();
      expect(firebaseMocks.signOutFromFirebase).toHaveBeenCalledOnce();
      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          errorMessage: "Sign-out completed, but its recovery status could not be stored.",
          ok: false,
          snapshot: expect.objectContaining({ providerCleanupPending: false }),
        }),
      );
    });
  });
});
