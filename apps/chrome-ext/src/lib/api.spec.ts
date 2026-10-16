import { describe, expect, it, vi } from "vitest";

import { createExtensionApiClient } from "./api";
import { getExtensionConfig } from "./config";
import { EXTENSION_SESSION_STORAGE_KEY } from "./session";
import type { StorageAreaLike } from "./session";

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function createStorage(initialData?: Record<string, unknown>): {
  data: Record<string, unknown>;
  storage: StorageAreaLike;
} {
  const data = { ...(initialData ?? {}) };

  return {
    data,
    storage: {
      async get() {
        return data;
      },
      async remove(keys) {
        const values = Array.isArray(keys) ? keys : [keys];

        for (const key of values) {
          delete data[key];
        }
      },
      async set(items) {
        Object.assign(data, items);
      },
    },
  };
}

function createStorageWithDeferredFirstSet(initialData: Record<string, unknown>): {
  data: Record<string, unknown>;
  releaseFirstSet(): void;
  storage: StorageAreaLike;
  waitForFirstSet(): Promise<void>;
} {
  const data = { ...initialData };
  let firstSet = true;
  let releaseFirstSet: (() => void) | null = null;
  let notifyFirstSet: (() => void) | null = null;
  const firstSetStarted = new Promise<void>((resolve) => {
    notifyFirstSet = resolve;
  });

  return {
    data,
    releaseFirstSet() {
      releaseFirstSet?.();
    },
    waitForFirstSet() {
      return firstSetStarted;
    },
    storage: {
      async get() {
        return data;
      },
      async remove(keys) {
        const values = Array.isArray(keys) ? keys : [keys];
        for (const key of values) delete data[key];
      },
      async set(items) {
        if (firstSet) {
          firstSet = false;
          notifyFirstSet?.();
          await new Promise<void>((resolve) => {
            releaseFirstSet = resolve;
          });
        }
        Object.assign(data, items);
      },
    },
  };
}

function createStorageWithDeferredFirstGet(initialData: Record<string, unknown>): {
  data: Record<string, unknown>;
  releaseFirstGet(): void;
  storage: StorageAreaLike;
  waitForFirstGet(): Promise<void>;
} {
  const data = { ...initialData };
  let firstGet = true;
  let releaseFirstGet: (() => void) | null = null;
  let notifyFirstGet: (() => void) | null = null;
  const firstGetStarted = new Promise<void>((resolve) => {
    notifyFirstGet = resolve;
  });

  return {
    data,
    releaseFirstGet() {
      releaseFirstGet?.();
    },
    waitForFirstGet() {
      return firstGetStarted;
    },
    storage: {
      async get() {
        if (firstGet) {
          firstGet = false;
          notifyFirstGet?.();
          await new Promise<void>((resolve) => {
            releaseFirstGet = resolve;
          });
        }
        return data;
      },
      async remove(keys) {
        const values = Array.isArray(keys) ? keys : [keys];
        for (const key of values) delete data[key];
      },
      async set(items) {
        Object.assign(data, items);
      },
    },
  };
}

const VERIFIER = "v".repeat(64);
const WORKSPACE_A = "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9000";
const WORKSPACE_B = "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001";

function accessTokenForWorkspace(workspaceId: string): string {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=/g, "");

  return `${encode({ alg: "HS256" })}.${encode({
    email: "alexey@example.com",
    sub: "user-1",
    workspaceId,
  })}.signature`;
}

function sessionForWorkspace(workspaceId: string, refreshToken = "refresh-token") {
  return {
    accessToken: accessTokenForWorkspace(workspaceId),
    accessTokenExpiresIn: 900,
    refreshToken,
  };
}

function createTestConfig() {
  return getExtensionConfig({
    MODE: "test",
    VITE_EXTENSION_API_BASE_URL: "http://localhost:3000",
    VITE_EXTENSION_FIREBASE_API_KEY: "test-firebase-api-key",
    VITE_EXTENSION_FIREBASE_AUTH_DOMAIN: "test-project.firebaseapp.com",
    VITE_EXTENSION_FIREBASE_PROJECT_ID: "test-project",
    VITE_EXTENSION_USER_SPA_URL: "http://localhost:5173/login",
  });
}

describe("createExtensionApiClient", () => {
  it.each(["getWorkspace", "getCurrentTimer", "loginWithFirebaseToken"] as const)(
    "bounds a stalled %s request and allows retry",
    async (method) => {
      const timeout = vi.spyOn(AbortSignal, "timeout").mockImplementation(() => {
        const controller = new AbortController();
        setTimeout(() => controller.abort(), 0);
        return controller.signal;
      });
      const { storage } = createStorage({
        [EXTENSION_SESSION_STORAGE_KEY]: {
          accessToken: "access-token",
          accessTokenExpiresIn: 900,
          refreshToken: "refresh-token",
        },
      });
      const fetchFn = vi.fn<typeof fetch>(async (_url, options) => {
        if (!options?.signal) throw new Error("Missing timeout signal");
        return new Promise<Response>((_resolve, reject) => {
          options.signal!.addEventListener("abort", () => reject(new Error("Timed out")), { once: true });
        });
      });
      const client = createExtensionApiClient({ config: createTestConfig(), fetchFn, storage });
      try {
        const pending = method === "loginWithFirebaseToken"
          ? client.loginWithFirebaseToken("firebase-id-token")
          : client[method]();
        await expect(pending).rejects.toThrow("Unable to reach GiTiempo API");
        expect(timeout).toHaveBeenCalledWith(15_000);
        await expect(storage.get()).resolves.toHaveProperty(EXTENSION_SESSION_STORAGE_KEY);
        fetchFn.mockResolvedValueOnce(jsonResponse({ timeEntry: null }));
        await expect(client.getCurrentTimer()).resolves.toEqual({ timeEntry: null });
      } finally {
        timeout.mockRestore();
      }
    },
  );

  it("preserves safe GitHub tracking failure codes without treating them as session expiry", async () => {
    const { storage } = createStorage({
      [EXTENSION_SESSION_STORAGE_KEY]: {
        accessToken: "access-token",
        accessTokenExpiresIn: 900,
        refreshToken: "refresh-token",
      },
    });
    const client = createExtensionApiClient({
      config: createTestConfig(),
      fetchFn: vi.fn(async () =>
        jsonResponse(
          {
            code: "project_assignment_required",
            error: "Forbidden",
            message:
              "You are not assigned to this project. Contact your workspace administrator or project manager to get access and start tracking time.",
          },
          { status: 403 },
        ),
      ),
      storage,
    });

    await expect(
      client.startTimerFromGitHub({
        githubRepo: "octo/private-repo",
        issueNumber: 184,
        issueTitle: "Private issue",
        issueUrl: "https://github.com/octo/private-repo/issues/184",
        kind: "supported",
        surface: "issue-page",
      }),
    ).rejects.toMatchObject({ code: "project_assignment_required" });
    await expect(storage.get()).resolves.toHaveProperty(EXTENSION_SESSION_STORAGE_KEY);
  });
  it("posts Firebase token exchange requests and stores the returned session", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        accessToken: "access-token",
        accessTokenExpiresIn: 900,
        refreshToken: "refresh-token",
      }),
    );
    const { data, storage } = createStorage();
    const client = createExtensionApiClient({
      config: createTestConfig(),
      fetchFn,
      storage,
    });

    await expect(client.loginWithFirebaseToken("firebase-id-token")).resolves.toEqual(
      {
        accessToken: "access-token",
        accessTokenExpiresIn: 900,
        refreshToken: "refresh-token",
      },
    );
    expect(fetchFn).toHaveBeenCalledWith("http://localhost:3000/auth/login", {
      body: JSON.stringify({ firebaseIdToken: "firebase-id-token" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
      signal: expect.any(AbortSignal),
    });
    expect(data).toEqual({
      [EXTENSION_SESSION_STORAGE_KEY]: {
        accessToken: "access-token",
        accessTokenExpiresIn: 900,
        refreshToken: "refresh-token",
      },
    });
  });

  it("posts the GitHub handoff code and stores the returned session", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        accessToken: "access-token",
        accessTokenExpiresIn: 900,
        refreshToken: "refresh-token",
      }),
    );
    const { data, storage } = createStorage();
    const client = createExtensionApiClient({
      config: createTestConfig(),
      fetchFn,
      storage,
    });

    await expect(client.exchangeGithubSession("handoff-code", VERIFIER)).resolves.toEqual({
      accessToken: "access-token",
      accessTokenExpiresIn: 900,
      refreshToken: "refresh-token",
    });
    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/auth/github/session",
      {
        body: JSON.stringify({ code: "handoff-code", verifier: VERIFIER }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
        signal: expect.any(AbortSignal),
      },
    );
    // The stored session is indistinguishable from one established through
    // Firebase, so refresh, authorization headers, and the runtime snapshot all
    // behave identically afterwards.
    expect(data).toEqual({
      [EXTENSION_SESSION_STORAGE_KEY]: {
        accessToken: "access-token",
        accessTokenExpiresIn: 900,
        refreshToken: "refresh-token",
      },
    });
  });

  it("surfaces a rejected GitHub handoff code through the API error mapping", async () => {
    const { data, storage } = createStorage();
    const client = createExtensionApiClient({
      config: createTestConfig(),
      fetchFn: vi.fn(async () =>
        jsonResponse({ message: "Unauthorized" }, { status: 401 }),
      ),
      storage,
    });

    await expect(client.exchangeGithubSession("stale-code", VERIFIER)).rejects.toThrow(
      "Unauthorized",
    );
    expect(data).toEqual({});
  });

  it("clears the session locally and revokes it with the backend", async () => {
    const fetchFn = vi.fn(
      async (..._args: Parameters<typeof fetch>) =>
        new Response(null, { status: 204 }),
    );
    const { data, storage } = createStorage({
      [EXTENSION_SESSION_STORAGE_KEY]: {
        accessToken: "access-token",
        accessTokenExpiresIn: 900,
        refreshToken: "refresh-token",
      },
    });
    const client = createExtensionApiClient({
      config: createTestConfig(),
      fetchFn,
      storage,
    });

    await client.exitSession();

    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/auth/logout",
      expect.objectContaining({
        body: JSON.stringify({ refreshToken: "refresh-token" }),
        headers: {
          Authorization: "Bearer access-token",
          "Content-Type": "application/json",
        },
        method: "POST",
        signal: expect.any(AbortSignal),
      }),
    );
    // Bounded, because nothing downstream waits on it and an MV3 worker can be
    // terminated mid-request.
    expect(fetchFn.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
    // A 204 with no body is the endpoint's success shape, not a failure.
    expect(data).toEqual({});
  });

  it("clears the local session even when the revoke fails", async () => {
    const { data, storage } = createStorage({
      [EXTENSION_SESSION_STORAGE_KEY]: {
        accessToken: "access-token",
        accessTokenExpiresIn: 900,
        refreshToken: "refresh-token",
      },
    });
    const client = createExtensionApiClient({
      config: createTestConfig(),
      fetchFn: vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
      storage,
    });

    // Leaving a session the user asked to end is worse than leaving a refresh
    // token to expire on its own, so an unreachable revoke must not throw here.
    await expect(client.exitSession()).resolves.toBeUndefined();
    expect(data).toEqual({});
  });

  it("clears the local session when the backend refuses the revoke", async () => {
    const { data, storage } = createStorage({
      [EXTENSION_SESSION_STORAGE_KEY]: {
        accessToken: "access-token",
        accessTokenExpiresIn: 900,
        refreshToken: "refresh-token",
      },
    });
    const client = createExtensionApiClient({
      config: createTestConfig(),
      fetchFn: vi.fn(async () => jsonResponse({ message: "Unauthorized" }, { status: 401 })),
      storage,
    });

    await client.exitSession();

    expect(data).toEqual({});
  });

  it("clears locally without waiting for a revoke that never settles", async () => {
    const { data, storage } = createStorage({
      [EXTENSION_SESSION_STORAGE_KEY]: {
        accessToken: "access-token",
        accessTokenExpiresIn: 900,
        refreshToken: "refresh-token",
      },
    });
    const client = createExtensionApiClient({
      config: createTestConfig(),
      // Never settles: a stalled network, or an MV3 worker about to be terminated.
      fetchFn: vi.fn(() => new Promise<Response>(() => {})),
      storage,
    });

    const pending = client.exitSession();
    await Promise.resolve();
    await Promise.resolve();

    // The session is gone before the revoke resolves, so a hang cannot leave the
    // user signed in against an explicit request.
    await vi.waitFor(() => expect(data).toEqual({}));
    void pending;
  });

  it("does not let a refresh that resolves after sign-out restore the session", async () => {
    const rotated = {
      accessToken: "rotated-access",
      accessTokenExpiresIn: 900,
      refreshToken: "rotated-refresh",
    };
    let releaseRefresh: (() => void) | null = null;
    const fetchFn = vi.fn(async (url: string) => {
      if (String(url).includes("/auth/refresh")) {
        await new Promise<void>((resolve) => {
          releaseRefresh = resolve;
        });
        return jsonResponse(rotated);
      }

      if (String(url).includes("/auth/logout")) {
        return new Response(null, { status: 204 });
      }

      return jsonResponse({ timeEntry: null }, { status: 401 });
    });
    const { data, storage } = createStorage({
      [EXTENSION_SESSION_STORAGE_KEY]: {
        accessToken: "expired-access",
        accessTokenExpiresIn: 900,
        refreshToken: "refresh-token",
      },
    });
    const client = createExtensionApiClient({
      config: createTestConfig(),
      fetchFn: fetchFn as unknown as typeof fetch,
      storage,
    });

    // A request that 401s starts a refresh, which is left in flight.
    const inFlight = client.getCurrentTimer().catch(() => null);
    await vi.waitFor(() => expect(releaseRefresh).not.toBeNull());

    await client.exitSession();
    expect(data).toEqual({});

    releaseRefresh!();
    await inFlight;

    // The backend rotates on refresh, so the logout revoked the row this refresh
    // had already replaced and the rotated pair is still valid. Storing it would
    // hand the session back after the user ended it.
    expect(data).toEqual({});
    expect(
      fetchFn.mock.calls.filter(([url]) => String(url).includes("/auth/logout")),
    ).toHaveLength(2);
  });

  it("refreshes a newer login instead of sharing its predecessor's in-flight refresh", async () => {
    const previousSession = sessionForWorkspace(WORKSPACE_A, "previous-refresh-token");
    const previousRefresh = sessionForWorkspace(WORKSPACE_A, "previous-refresh-next");
    const newerLogin = sessionForWorkspace(WORKSPACE_B, "newer-login-refresh-token");
    const newerRefresh = {
      ...sessionForWorkspace(WORKSPACE_B, "newer-refresh-token"),
      accessToken: "newer-refreshed-access-token",
    };
    let releasePreviousRefresh: (() => void) | null = null;
    const fetchFn = vi.fn(async (url: string, options?: Parameters<typeof fetch>[1]) => {
      const requestUrl = String(url);
      const authorization = new Headers(options?.headers).get("Authorization");

      if (requestUrl.endsWith("/auth/login")) {
        return jsonResponse(newerLogin);
      }

      if (requestUrl.endsWith("/auth/refresh")) {
        const { refreshToken } = JSON.parse(String(options?.body)) as {
          refreshToken: string;
        };

        if (refreshToken === previousSession.refreshToken) {
          await new Promise<void>((resolve) => {
            releasePreviousRefresh = resolve;
          });
          return jsonResponse(previousRefresh);
        }

        if (refreshToken === newerLogin.refreshToken) {
          return jsonResponse(newerRefresh);
        }
      }

      if (requestUrl.endsWith("/time-entries/current")) {
        if (authorization === `Bearer ${newerRefresh.accessToken}`) {
          return jsonResponse({ timeEntry: null });
        }

        return jsonResponse({ message: "Unauthorized" }, { status: 401 });
      }

      if (requestUrl.endsWith("/auth/logout")) {
        return new Response(null, { status: 204 });
      }

      throw new Error(`Unexpected request: ${requestUrl}`);
    });
    const { data, storage } = createStorage({
      [EXTENSION_SESSION_STORAGE_KEY]: previousSession,
    });
    const client = createExtensionApiClient({
      config: createTestConfig(),
      fetchFn: fetchFn as unknown as typeof fetch,
      storage,
    });

    const staleRequest = client.getCurrentTimer();
    await vi.waitFor(() => expect(releasePreviousRefresh).not.toBeNull());

    await expect(client.loginWithFirebaseToken("new-login-token")).resolves.toEqual(newerLogin);

    const newerRequest = client.getCurrentTimer();
    await vi.waitFor(() =>
      expect(
        fetchFn.mock.calls.filter(
          ([url]) => String(url) === "http://localhost:3000/time-entries/current",
        ),
      ).toHaveLength(2),
    );
    expect(
      fetchFn.mock.calls.filter(([url]) => String(url).endsWith("/auth/refresh")),
    ).toHaveLength(1);

    releasePreviousRefresh!();

    await expect(staleRequest).rejects.toThrow("Your session has expired");
    await expect(newerRequest).resolves.toEqual({ timeEntry: null });
    expect(
      fetchFn.mock.calls.filter(([url]) => String(url).endsWith("/auth/refresh")),
    ).toHaveLength(2);
    expect(data).toEqual({ [EXTENSION_SESSION_STORAGE_KEY]: newerRefresh });
  });

  it("does not call the backend when there is no stored session", async () => {
    const fetchFn = vi.fn(async () => new Response(null, { status: 204 }));
    const client = createExtensionApiClient({
      config: createTestConfig(),
      fetchFn,
      storage: createStorage().storage,
    });

    await client.exitSession();

    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("maps login gateway failures to a temporary API outage message", async () => {
    const client = createExtensionApiClient({
      config: createTestConfig(),
      fetchFn: vi.fn(async () =>
        new Response("<html>bad gateway</html>", { status: 502 }),
      ),
      storage: createStorage().storage,
    });

    await expect(client.loginWithFirebaseToken("firebase-id-token")).rejects.toThrow(
      "GiTiempo API is temporarily unavailable. Please try again in a moment.",
    );
  });

  it("maps login fetch failures to an API connectivity message", async () => {
    const client = createExtensionApiClient({
      config: createTestConfig(),
      fetchFn: vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
      storage: createStorage().storage,
    });

    await expect(client.loginWithFirebaseToken("firebase-id-token")).rejects.toThrow(
      "Unable to reach GiTiempo API. Check your connection and try again.",
    );
  });

  it("requests the current timer with an authorization header", async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ timeEntry: null }));
    const { storage } = createStorage({
      [EXTENSION_SESSION_STORAGE_KEY]: {
        accessToken: "access-token",
        accessTokenExpiresIn: 900,
        refreshToken: "refresh-token",
      },
    });
    const client = createExtensionApiClient({
      config: createTestConfig(),
      fetchFn,
      storage,
    });

    await client.getCurrentTimer();

    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/time-entries/current",
      {
        body: undefined,
        headers: {
          Authorization: "Bearer access-token",
        },
        method: "GET",
        signal: expect.any(AbortSignal),
      },
    );
  });

  it("loads and validates current workspace memberships", async () => {
    const session = sessionForWorkspace(WORKSPACE_A);
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        items: [
          {
            isCurrent: true,
            role: "member",
            workspaceId: WORKSPACE_A,
            workspaceName: "Workspace Alpha",
          },
          {
            isCurrent: false,
            role: "pm",
            workspaceId: WORKSPACE_B,
            workspaceName: "Workspace Beta",
          },
        ],
      }),
    );
    const { storage } = createStorage({ [EXTENSION_SESSION_STORAGE_KEY]: session });
    const client = createExtensionApiClient({
      config: createTestConfig(),
      fetchFn,
      storage,
    });

    await expect(client.getWorkspaceMemberships()).resolves.toEqual({
      items: [
        {
          isCurrent: true,
          role: "member",
          workspaceId: WORKSPACE_A,
          workspaceName: "Workspace Alpha",
        },
        {
          isCurrent: false,
          role: "pm",
          workspaceId: WORKSPACE_B,
          workspaceName: "Workspace Beta",
        },
      ],
    });
    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/users/me/workspaces",
      expect.objectContaining({
        headers: { Authorization: `Bearer ${session.accessToken}` },
        method: "GET",
      }),
    );
  });

  it("does not rotate the session when choosing its current workspace", async () => {
    const session = sessionForWorkspace(WORKSPACE_A);
    const fetchFn = vi.fn<typeof fetch>();
    const { data, storage } = createStorage({ [EXTENSION_SESSION_STORAGE_KEY]: session });
    const client = createExtensionApiClient({
      config: createTestConfig(),
      fetchFn,
      storage,
    });

    await expect(client.switchWorkspace(WORKSPACE_A)).resolves.toEqual(session);
    expect(fetchFn).not.toHaveBeenCalled();
    expect(data).toEqual({ [EXTENSION_SESSION_STORAGE_KEY]: session });
  });

  it("keeps a valid session when membership access is denied during a switch", async () => {
    const session = sessionForWorkspace(WORKSPACE_A);
    const { data, storage } = createStorage({ [EXTENSION_SESSION_STORAGE_KEY]: session });
    const client = createExtensionApiClient({
      config: createTestConfig(),
      fetchFn: vi.fn(async () =>
        jsonResponse(
          { message: "You are no longer a member of this workspace." },
          { status: 403 },
        ),
      ),
      storage,
    });

    await expect(client.switchWorkspace(WORKSPACE_B)).rejects.toThrow(
      "You are no longer a member of this workspace.",
    );
    expect(data).toEqual({ [EXTENSION_SESSION_STORAGE_KEY]: session });
  });

  it("refreshes once and retries a switch after a pre-dispatch 401", async () => {
    const initialSession = sessionForWorkspace(WORKSPACE_A, "initial-refresh-token");
    const refreshedSession = sessionForWorkspace(WORKSPACE_A, "refreshed-refresh-token");
    const switchedSession = sessionForWorkspace(WORKSPACE_B, "switched-refresh-token");
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ message: "Unauthorized" }, { status: 401 }))
      .mockResolvedValueOnce(jsonResponse(refreshedSession))
      .mockResolvedValueOnce(jsonResponse(switchedSession));
    const { data, storage } = createStorage({
      [EXTENSION_SESSION_STORAGE_KEY]: initialSession,
    });
    const client = createExtensionApiClient({
      config: createTestConfig(),
      fetchFn,
      storage,
    });

    await expect(client.switchWorkspace(WORKSPACE_B)).resolves.toEqual(switchedSession);
    expect(fetchFn).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3000/auth/refresh",
      expect.objectContaining({
        body: JSON.stringify({ refreshToken: "initial-refresh-token" }),
      }),
    );
    expect(fetchFn).toHaveBeenNthCalledWith(
      3,
      "http://localhost:3000/auth/switch-workspace",
      expect.objectContaining({
        body: JSON.stringify({
          refreshToken: "refreshed-refresh-token",
          workspaceId: WORKSPACE_B,
        }),
        headers: expect.objectContaining({
          Authorization: `Bearer ${refreshedSession.accessToken}`,
        }),
      }),
    );
    expect(data).toEqual({ [EXTENSION_SESSION_STORAGE_KEY]: switchedSession });
  });

  it("clears the session when the initial workspace switch request cannot reach the API", async () => {
    const session = sessionForWorkspace(WORKSPACE_A, "initial-refresh-token");
    const fetchFn = vi.fn<typeof fetch>().mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const { data, storage } = createStorage({
      [EXTENSION_SESSION_STORAGE_KEY]: session,
    });
    const client = createExtensionApiClient({
      config: createTestConfig(),
      fetchFn,
      storage,
    });

    await expect(client.switchWorkspace(WORKSPACE_B)).rejects.toThrow(
      "Unable to reach GiTiempo API. Check your connection and try again.",
    );
    expect(data).toEqual({});
    await expect(client.switchWorkspace(WORKSPACE_B)).rejects.toThrow(
      "Your session has expired. Please sign in again.",
    );
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it("clears the refreshed session when the retry workspace switch request cannot reach the API", async () => {
    const initialSession = sessionForWorkspace(WORKSPACE_A, "initial-refresh-token");
    const refreshedSession = sessionForWorkspace(WORKSPACE_A, "refreshed-refresh-token");
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ message: "Unauthorized" }, { status: 401 }))
      .mockResolvedValueOnce(jsonResponse(refreshedSession))
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const { data, storage } = createStorage({
      [EXTENSION_SESSION_STORAGE_KEY]: initialSession,
    });
    const client = createExtensionApiClient({
      config: createTestConfig(),
      fetchFn,
      storage,
    });

    await expect(client.switchWorkspace(WORKSPACE_B)).rejects.toThrow(
      "Unable to reach GiTiempo API. Check your connection and try again.",
    );
    expect(data).toEqual({});
    await expect(client.switchWorkspace(WORKSPACE_B)).rejects.toThrow(
      "Your session has expired. Please sign in again.",
    );
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it("never restores a late switch after sign-out and revokes its returned pair", async () => {
    const session = sessionForWorkspace(WORKSPACE_A);
    const rotated = sessionForWorkspace(WORKSPACE_B, "rotated-refresh-token");
    let releaseSwitch: (() => void) | null = null;
    const fetchFn = vi.fn(async (url: string) => {
      if (url.endsWith("/auth/switch-workspace")) {
        await new Promise<void>((resolve) => {
          releaseSwitch = resolve;
        });
        return jsonResponse(rotated);
      }

      return new Response(null, { status: 204 });
    });
    const { data, storage } = createStorage({ [EXTENSION_SESSION_STORAGE_KEY]: session });
    const client = createExtensionApiClient({
      config: createTestConfig(),
      fetchFn: fetchFn as unknown as typeof fetch,
      storage,
    });

    const pendingSwitch = client.switchWorkspace(WORKSPACE_B);
    await vi.waitFor(() => expect(releaseSwitch).not.toBeNull());

    await client.exitSession();
    releaseSwitch!();

    await expect(pendingSwitch).rejects.toThrow("session or workspace changed");
    expect(data).toEqual({});
    expect(
      fetchFn.mock.calls.filter(([url]) => String(url).endsWith("/auth/logout")),
    ).toHaveLength(2);
  });

  it("does not let a newer login be replaced by an in-flight switch", async () => {
    const session = sessionForWorkspace(WORKSPACE_A);
    const rotated = sessionForWorkspace(WORKSPACE_B, "rotated-refresh-token");
    const newerLogin = sessionForWorkspace(WORKSPACE_A, "new-login-refresh-token");
    let releaseSwitch: (() => void) | null = null;
    const fetchFn = vi.fn(async (url: string) => {
      if (url.endsWith("/auth/switch-workspace")) {
        await new Promise<void>((resolve) => {
          releaseSwitch = resolve;
        });
        return jsonResponse(rotated);
      }

      if (url.endsWith("/auth/login")) {
        return jsonResponse(newerLogin);
      }

      return new Response(null, { status: 204 });
    });
    const { data, storage } = createStorage({ [EXTENSION_SESSION_STORAGE_KEY]: session });
    const client = createExtensionApiClient({
      config: createTestConfig(),
      fetchFn: fetchFn as unknown as typeof fetch,
      storage,
    });

    const pendingSwitch = client.switchWorkspace(WORKSPACE_B);
    await vi.waitFor(() => expect(releaseSwitch).not.toBeNull());
    await expect(client.loginWithFirebaseToken("new-login-token")).resolves.toEqual(newerLogin);
    releaseSwitch!();

    await expect(pendingSwitch).rejects.toThrow("session or workspace changed");
    expect(data).toEqual({ [EXTENSION_SESSION_STORAGE_KEY]: newerLogin });
    expect(
      fetchFn.mock.calls.filter(([url]) => String(url).endsWith("/auth/logout")),
    ).toHaveLength(1);
  });

  it("does not overwrite a newer login when a switch storage write completes late", async () => {
    const session = sessionForWorkspace(WORKSPACE_A);
    const rotated = sessionForWorkspace(WORKSPACE_B, "rotated-refresh-token");
    const newerLogin = sessionForWorkspace(WORKSPACE_A, "new-login-refresh-token");
    const fetchFn = vi.fn(async (url: string) => {
      if (url.endsWith("/auth/switch-workspace")) {
        return jsonResponse(rotated);
      }

      if (url.endsWith("/auth/login")) {
        return jsonResponse(newerLogin);
      }

      return new Response(null, { status: 204 });
    });
    const { data, releaseFirstSet, storage, waitForFirstSet } =
      createStorageWithDeferredFirstSet({
        [EXTENSION_SESSION_STORAGE_KEY]: session,
      });
    const client = createExtensionApiClient({
      config: createTestConfig(),
      fetchFn: fetchFn as unknown as typeof fetch,
      storage,
    });

    const pendingSwitch = client.switchWorkspace(WORKSPACE_B);
    await waitForFirstSet();
    const pendingLogin = client.loginWithFirebaseToken("new-login-token");

    releaseFirstSet();

    await expect(pendingSwitch).rejects.toThrow("session or workspace changed");
    await expect(pendingLogin).resolves.toEqual(newerLogin);
    expect(data).toEqual({ [EXTENSION_SESSION_STORAGE_KEY]: newerLogin });
    expect(
      fetchFn.mock.calls.filter(([url]) => String(url).endsWith("/auth/logout")),
    ).toHaveLength(1);
  });

  it("does not clear a newer login when a sign-out storage read completes late", async () => {
    const session = sessionForWorkspace(WORKSPACE_A);
    const newerLogin = sessionForWorkspace(WORKSPACE_B, "new-login-refresh-token");
    const fetchFn = vi.fn(async (url: string) => {
      if (url.endsWith("/auth/login")) {
        return jsonResponse(newerLogin);
      }

      return new Response(null, { status: 204 });
    });
    const { data, releaseFirstGet, storage, waitForFirstGet } =
      createStorageWithDeferredFirstGet({
        [EXTENSION_SESSION_STORAGE_KEY]: session,
      });
    const client = createExtensionApiClient({
      config: createTestConfig(),
      fetchFn: fetchFn as unknown as typeof fetch,
      storage,
    });

    const pendingSignOut = client.exitSession();
    await waitForFirstGet();
    const pendingLogin = client.loginWithFirebaseToken("new-login-token");

    releaseFirstGet();

    await Promise.all([pendingSignOut, pendingLogin]);
    expect(data).toEqual({ [EXTENSION_SESSION_STORAGE_KEY]: newerLogin });
    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/auth/logout",
      expect.objectContaining({
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      }),
    );
  });

  it("clears and revokes the prior session when a newer login fails during sign-out", async () => {
    const session = sessionForWorkspace(WORKSPACE_A);
    const fetchFn = vi.fn(async (url: string) => {
      if (url.endsWith("/auth/login")) {
        return jsonResponse({ message: "Unauthorized" }, { status: 401 });
      }

      return new Response(null, { status: 204 });
    });
    const { data, releaseFirstGet, storage, waitForFirstGet } =
      createStorageWithDeferredFirstGet({
        [EXTENSION_SESSION_STORAGE_KEY]: session,
      });
    const client = createExtensionApiClient({
      config: createTestConfig(),
      fetchFn: fetchFn as unknown as typeof fetch,
      storage,
    });

    const pendingSignOut = client.exitSession();
    await waitForFirstGet();
    const pendingLogin = client.loginWithFirebaseToken("new-login-token");

    releaseFirstGet();

    await expect(pendingLogin).rejects.toThrow("Unauthorized");
    await pendingSignOut;
    expect(data).toEqual({});
    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/auth/logout",
      expect.objectContaining({
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      }),
    );
  });

  it("switches with the token pair accepted by an earlier refresh", async () => {
    const initialSession = sessionForWorkspace(WORKSPACE_A, "initial-refresh-token");
    const refreshedSession = sessionForWorkspace(WORKSPACE_A, "refreshed-refresh-token");
    const switchedSession = sessionForWorkspace(WORKSPACE_B, "switched-refresh-token");
    let releaseRefresh: (() => void) | null = null;
    const fetchFn = vi.fn<typeof fetch>(async (...args) => {
      const [url, options] = args;
      const requestUrl = String(url);

      if (requestUrl.endsWith("/time-entries/current")) {
        const authorization = new Headers(options?.headers).get("Authorization");
        return authorization === `Bearer ${initialSession.accessToken}`
          ? jsonResponse({ message: "Unauthorized" }, { status: 401 })
          : jsonResponse({ timeEntry: null });
      }

      if (requestUrl.endsWith("/auth/refresh")) {
        await new Promise<void>((resolve) => {
          releaseRefresh = resolve;
        });
        return jsonResponse(refreshedSession);
      }

      if (requestUrl.endsWith("/auth/switch-workspace")) {
        expect(JSON.parse(String(options?.body))).toEqual({
          refreshToken: "refreshed-refresh-token",
          workspaceId: WORKSPACE_B,
        });
        return jsonResponse(switchedSession);
      }

      throw new Error(`Unexpected request: ${requestUrl}`);
    });
    const { data, storage } = createStorage({
      [EXTENSION_SESSION_STORAGE_KEY]: initialSession,
    });
    const client = createExtensionApiClient({
      config: createTestConfig(),
      fetchFn,
      storage,
    });

    const pendingRefresh = client.getCurrentTimer();
    await vi.waitFor(() => expect(releaseRefresh).not.toBeNull());
    const pendingSwitch = client.switchWorkspace(WORKSPACE_B);
    releaseRefresh!();

    await expect(pendingSwitch).resolves.toEqual(switchedSession);
    await pendingRefresh.catch(() => null);
    expect(data).toEqual({ [EXTENSION_SESSION_STORAGE_KEY]: switchedSession });
  });

  it("maps authenticated fetch failures to an API connectivity message", async () => {
    const { storage } = createStorage({
      [EXTENSION_SESSION_STORAGE_KEY]: {
        accessToken: "access-token",
        accessTokenExpiresIn: 900,
        refreshToken: "refresh-token",
      },
    });
    const client = createExtensionApiClient({
      config: createTestConfig(),
      fetchFn: vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
      storage,
    });

    await expect(client.getCurrentTimer()).rejects.toThrow(
      "Unable to reach GiTiempo API. Check your connection and try again.",
    );
  });

  it("posts GitHub timer start payloads with the shared contract shape", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        createdAt: "2026-04-21T09:00:00.000Z",
        description: null,
        durationSeconds: null,
        endedAt: null,
        id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002",
        isBillable: true,
        invoiceId: null,
        project: { id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f", name: "Project Orion" },
        projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
        source: "extension",
        startedAt: "2026-04-21T09:00:00.000Z",
        githubIssue: { githubRepo: "octo/repo", issueNumber: 184 },
        task: { id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001", title: "Improve reports filters" },
        taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
        updatedAt: "2026-04-21T09:00:00.000Z",
        workspace: {
          id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9000",
          name: "Workspace Alpha",
        },
        user: {
          avatarUrl: null,
          displayName: "Alexey Tsukanov",
          email: "alexey@example.com",
          id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9003",
        },
        userId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9003",
        workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9000",
      }),
    );
    const { storage } = createStorage({
      [EXTENSION_SESSION_STORAGE_KEY]: {
        accessToken: "access-token",
        accessTokenExpiresIn: 900,
        refreshToken: "refresh-token",
      },
    });
    const client = createExtensionApiClient({
      config: createTestConfig(),
      fetchFn,
      storage,
    });

    await client.startTimerFromGitHub({
      githubRepo: "octo/repo",
      issueNumber: 184,
      issueTitle: "Improve reports filters",
      issueUrl: "https://github.com/octo/repo/issues/184",
      kind: "supported",
      surface: "issue-page",
    });

    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/time-entries/timer/start-from-github-reference",
      {
        body: JSON.stringify({
          githubRepo: "octo/repo",
          issueNumber: 184,
          issueTitle: "Improve reports filters",
          issueUrl: "https://github.com/octo/repo/issues/184",
        }),
        headers: {
          Authorization: "Bearer access-token",
          "Content-Type": "application/json",
        },
        method: "POST",
        signal: expect.any(AbortSignal),
      },
    );
  });

  it("requests an issue-bound tracking capability before a reference start", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        accessScope: "project",
        canStartTracking: true,
        reason: null,
      }),
    );
    const { storage } = createStorage({
      [EXTENSION_SESSION_STORAGE_KEY]: {
        accessToken: "access-token",
        accessTokenExpiresIn: 900,
        refreshToken: "refresh-token",
      },
    });
    const client = createExtensionApiClient({
      config: createTestConfig(),
      fetchFn,
      storage,
    });
    const context = {
      githubRepo: "octo/repo",
      issueNumber: 184,
      issueTitle: "Improve reports filters",
      issueUrl: "https://github.com/octo/repo/issues/184",
      kind: "supported" as const,
      surface: "issue-page" as const,
    };

    await expect(client.getTrackingCapability(context)).resolves.toEqual({
      accessScope: "project",
      canStartTracking: true,
      reason: null,
    });
    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/time-entries/timer/capability",
      expect.objectContaining({
        body: JSON.stringify({
          githubRepo: "octo/repo",
          issueNumber: 184,
          issueTitle: "Improve reports filters",
          issueUrl: "https://github.com/octo/repo/issues/184",
        }),
        method: "POST",
      }),
    );
  });

  it("posts the authoritative timer identity when stopping a timer", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({ message: "Running timer changed" }, { status: 409 }),
    );
    const { storage } = createStorage({
      [EXTENSION_SESSION_STORAGE_KEY]: {
        accessToken: "access-token",
        accessTokenExpiresIn: 900,
        refreshToken: "refresh-token",
      },
    });
    const client = createExtensionApiClient({
      config: createTestConfig(),
      fetchFn,
      storage,
    });

    await expect(
      client.stopTimer({
        expectedTimerId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002",
      }),
    ).rejects.toThrow("Running timer changed");

    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/time-entries/timer/stop",
      {
        body: JSON.stringify({
          expectedTimerId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002",
        }),
        headers: {
          Authorization: "Bearer access-token",
          "Content-Type": "application/json",
        },
        method: "POST",
        signal: expect.any(AbortSignal),
      },
    );
  });

  it("refreshes the session once after a 401 and retries the original request", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ message: "Unauthorized" }, { status: 401 }))
      .mockResolvedValueOnce(
        jsonResponse({
          accessToken: "access-token-next",
          accessTokenExpiresIn: 900,
          refreshToken: "refresh-token-next",
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ timeEntry: null }));
    const { data, storage } = createStorage({
      [EXTENSION_SESSION_STORAGE_KEY]: {
        accessToken: "access-token",
        accessTokenExpiresIn: 900,
        refreshToken: "refresh-token",
      },
    });
    const client = createExtensionApiClient({
      config: createTestConfig(),
      fetchFn,
      storage,
    });

    await expect(client.getCurrentTimer()).resolves.toEqual({ timeEntry: null });
    expect(fetchFn).toHaveBeenNthCalledWith(
      2,
      "http://localhost:3000/auth/refresh",
      {
        body: JSON.stringify({ refreshToken: "refresh-token" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
        signal: expect.any(AbortSignal),
      },
    );
    expect(fetchFn).toHaveBeenNthCalledWith(
      3,
      "http://localhost:3000/time-entries/current",
      {
        body: undefined,
        headers: {
          Authorization: "Bearer access-token-next",
        },
        method: "GET",
        signal: expect.any(AbortSignal),
      },
    );
    expect(data).toEqual({
      [EXTENSION_SESSION_STORAGE_KEY]: {
        accessToken: "access-token-next",
        accessTokenExpiresIn: 900,
        refreshToken: "refresh-token-next",
      },
    });
  });

  it("shares one refresh request across concurrent 401 retries", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ message: "Unauthorized" }, { status: 401 }))
      .mockResolvedValueOnce(jsonResponse({ message: "Unauthorized" }, { status: 401 }))
      .mockResolvedValueOnce(
        jsonResponse({
          accessToken: "access-token-next",
          accessTokenExpiresIn: 900,
          refreshToken: "refresh-token-next",
        }),
      )
      .mockResolvedValueOnce(jsonResponse({ timeEntry: null }))
      .mockResolvedValueOnce(
        jsonResponse({
          createdAt: "2026-04-21T09:00:00.000Z",
          description: null,
          durationSeconds: null,
          endedAt: null,
          id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002",
          isBillable: true,
          invoiceId: null,
          project: { id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f", name: "Project Orion" },
          projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
          source: "extension",
          startedAt: "2026-04-21T09:00:00.000Z",
          githubIssue: { githubRepo: "octo/repo", issueNumber: 184 },
          task: { id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001", title: "Improve reports filters" },
          taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
          updatedAt: "2026-04-21T09:00:00.000Z",
          workspace: {
            id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9000",
            name: "Workspace Alpha",
          },
          user: {
            avatarUrl: null,
            displayName: "Alexey Tsukanov",
            email: "alexey@example.com",
            id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9003",
          },
          userId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9003",
          workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9000",
        }),
      );
    const { data, storage } = createStorage({
      [EXTENSION_SESSION_STORAGE_KEY]: {
        accessToken: "access-token",
        accessTokenExpiresIn: 900,
        refreshToken: "refresh-token",
      },
    });
    const client = createExtensionApiClient({
      config: createTestConfig(),
      fetchFn,
      storage,
    });

    const results = await Promise.all([
      client.getCurrentTimer(),
      client.startTimerFromGitHub({
        githubRepo: "octo/repo",
        issueNumber: 184,
        issueTitle: "Improve reports filters",
        issueUrl: "https://github.com/octo/repo/issues/184",
        kind: "supported",
        surface: "issue-page",
      }),
    ]);

    expect(results[0]).toEqual({ timeEntry: null });
    expect(
      fetchFn.mock.calls.filter(
        ([url]) => url === "http://localhost:3000/auth/refresh",
      ),
    ).toHaveLength(1);
    expect(fetchFn).toHaveBeenNthCalledWith(
      4,
      "http://localhost:3000/time-entries/current",
      {
        body: undefined,
        headers: {
          Authorization: "Bearer access-token-next",
        },
        method: "GET",
        signal: expect.any(AbortSignal),
      },
    );
    expect(fetchFn).toHaveBeenNthCalledWith(
      5,
      "http://localhost:3000/time-entries/timer/start-from-github-reference",
      {
        body: JSON.stringify({
          githubRepo: "octo/repo",
          issueNumber: 184,
          issueTitle: "Improve reports filters",
          issueUrl: "https://github.com/octo/repo/issues/184",
        }),
        headers: {
          Authorization: "Bearer access-token-next",
          "Content-Type": "application/json",
        },
        method: "POST",
        signal: expect.any(AbortSignal),
      },
    );
    expect(data).toEqual({
      [EXTENSION_SESSION_STORAGE_KEY]: {
        accessToken: "access-token-next",
        accessTokenExpiresIn: 900,
        refreshToken: "refresh-token-next",
      },
    });
  });

  it("clears the local session when refresh fails", async () => {
    const { storage } = createStorage({
      [EXTENSION_SESSION_STORAGE_KEY]: {
        accessToken: "access-token",
        accessTokenExpiresIn: 900,
        refreshToken: "refresh-token",
      },
    });
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ message: "Unauthorized" }, { status: 401 }))
      .mockResolvedValueOnce(jsonResponse({ message: "Expired refresh" }, { status: 401 }));
    const client = createExtensionApiClient({
      config: createTestConfig(),
      fetchFn,
      storage,
    });

    await expect(client.stopTimer({ expectedTimerId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001" })).rejects.toThrow(
      "Your session has expired. Please sign in again.",
    );
    await expect(storage.get()).resolves.toEqual({});
  });

  it("bounds a stalled refresh instead of blocking workspace loading", async () => {
    const timeout = vi.spyOn(AbortSignal, "timeout").mockImplementation(() => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 0);
      return controller.signal;
    });
    const { storage } = createStorage({
      [EXTENSION_SESSION_STORAGE_KEY]: {
        accessToken: "access-token",
        accessTokenExpiresIn: 900,
        refreshToken: "refresh-token",
      },
    });
    const fetchFn = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ message: "Unauthorized" }, { status: 401 }))
      .mockImplementationOnce(async (_url, options) => {
        if (!options?.signal) throw new Error("Missing timeout signal");
        return new Promise<Response>((_resolve, reject) => {
          options.signal!.addEventListener("abort", () => reject(new Error("Timed out")), { once: true });
        });
      });
    const client = createExtensionApiClient({ config: createTestConfig(), fetchFn, storage });
    try {
      await expect(client.getWorkspace()).rejects.toThrow("Your session has expired");
      expect(fetchFn).toHaveBeenLastCalledWith("http://localhost:3000/auth/refresh", expect.objectContaining({ signal: expect.any(AbortSignal) }));
      expect(timeout).toHaveBeenCalledTimes(2);
      await expect(storage.get()).resolves.toEqual({});
    } finally {
      timeout.mockRestore();
    }
  });

  it("clears the local session when refresh throws before returning a response", async () => {
    const { storage } = createStorage({
      [EXTENSION_SESSION_STORAGE_KEY]: {
        accessToken: "access-token",
        accessTokenExpiresIn: 900,
        refreshToken: "refresh-token",
      },
    });
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse({ message: "Unauthorized" }, { status: 401 }))
      .mockRejectedValueOnce(new Error("Network error"));
    const client = createExtensionApiClient({
      config: createTestConfig(),
      fetchFn,
      storage,
    });

    await expect(client.stopTimer({ expectedTimerId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001" })).rejects.toThrow(
      "Your session has expired. Please sign in again.",
    );
    await expect(storage.get()).resolves.toEqual({});
  });
  it("binds reference submission to the reviewed token workspace and account", async () => {
    const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=/g, "");
    const { storage } = createStorage({ [EXTENSION_SESSION_STORAGE_KEY]: { accessToken: `${encode({ alg: "HS256" })}.${encode({ sub: "user-2", email: "other@example.com", workspaceId: "workspace-2" })}.signature`, accessTokenExpiresIn: 900, refreshToken: "refresh-token" } });
    const fetchFn = vi.fn();
    const client = createExtensionApiClient({ config: createTestConfig(), storage, fetchFn });
    await expect(client.startTimerFromGitHub({ kind: "supported", surface: "issue-page", githubRepo: "octo/repo", issueNumber: 184, issueTitle: "Issue", issueUrl: "https://github.com/octo/repo/issues/184" }, { workspaceId: "workspace-1", email: "alexey@example.com" })).rejects.toThrow("session or workspace changed");
    expect(fetchFn).not.toHaveBeenCalled();
  });

});
