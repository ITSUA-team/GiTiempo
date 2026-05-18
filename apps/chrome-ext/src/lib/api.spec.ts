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
    });
    expect(data).toEqual({
      [EXTENSION_SESSION_STORAGE_KEY]: {
        accessToken: "access-token",
        accessTokenExpiresIn: 900,
        refreshToken: "refresh-token",
      },
    });
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
      },
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
        project: { id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f", name: "Project Orion" },
        projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
        source: "extension",
        startedAt: "2026-04-21T09:00:00.000Z",
        task: { id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001", title: "Improve reports filters" },
        taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
        updatedAt: "2026-04-21T09:00:00.000Z",
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
    });

    expect(fetchFn).toHaveBeenCalledWith(
      "http://localhost:3000/time-entries/timer/start-from-github",
      {
        body: JSON.stringify({
          githubRepo: "octo/repo",
          issueNumber: 184,
          issueTitle: "Improve reports filters",
        }),
        headers: {
          Authorization: "Bearer access-token",
          "Content-Type": "application/json",
        },
        method: "POST",
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

    await expect(client.stopTimer()).rejects.toThrow(
      "Your session has expired. Please sign in again.",
    );
    await expect(storage.get()).resolves.toEqual({});
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

    await expect(client.stopTimer()).rejects.toThrow(
      "Your session has expired. Please sign in again.",
    );
    await expect(storage.get()).resolves.toEqual({});
  });
});
