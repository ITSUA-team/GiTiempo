import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import type { ApiError } from "./http";
import { createAuthenticatedApiClient, requestJson } from "./http";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

describe("createAuthenticatedApiClient", () => {
  it("preserves response status and code on requestJson failures", async () => {
    const body = {
      code: "time_entry_conflict",
      message: "Stop the timer before updating it",
    };

    await expect(
      requestJson({
        fetchFn: vi.fn(async () =>
          jsonResponse(body, 409),
        ),
        method: "PATCH",
        path: "/time-entries/entry-1",
        responseSchema: z.object({ ok: z.boolean() }),
      }),
    ).rejects.toMatchObject({
      body,
      code: "time_entry_conflict",
      message: "Stop the timer before updating it",
      name: "ApiError",
      status: 409,
    } satisfies Partial<ApiError>);
  });

  it("adds the current bearer token and parses JSON responses", async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ ok: true }));
    const apiClient = createAuthenticatedApiClient({
      fetchFn,
      getToken: () => "access-token",
      onRefreshFailed: vi.fn(),
      refreshAccessToken: vi.fn(),
    });

    await expect(
      apiClient.requestJson({
        path: "/protected",
        responseSchema: z.object({ ok: z.boolean() }),
      }),
    ).resolves.toEqual({ ok: true });

    expect(fetchFn).toHaveBeenCalledWith("/protected", {
      body: undefined,
      headers: { Authorization: "Bearer access-token" },
      method: "GET",
    });
  });

  it("refreshes once for concurrent 401 responses and retries requests", async () => {
    let token = "stale-token";
    let refreshResolve!: (_value: string) => void;
    const refreshPromise = new Promise<string>((resolve) => {
      refreshResolve = resolve;
    });
    const refreshAccessToken = vi.fn(() => refreshPromise);
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ message: "Unauthorized" }, 401))
      .mockResolvedValueOnce(jsonResponse({ message: "Unauthorized" }, 401))
      .mockResolvedValueOnce(jsonResponse({ id: 1 }))
      .mockResolvedValueOnce(jsonResponse({ id: 2 }));
    const apiClient = createAuthenticatedApiClient({
      fetchFn,
      getToken: () => token,
      onRefreshFailed: vi.fn(),
      refreshAccessToken,
    });
    const schema = z.object({ id: z.number() });
    const first = apiClient.requestJson({ path: "/one", responseSchema: schema });
    const second = apiClient.requestJson({ path: "/two", responseSchema: schema });

    token = "fresh-token";
    refreshResolve("fresh-token");

    await expect(Promise.all([first, second])).resolves.toEqual([
      { id: 1 },
      { id: 2 },
    ]);
    expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenNthCalledWith(3, "/one", {
      body: undefined,
      headers: { Authorization: "Bearer fresh-token" },
      method: "GET",
    });
    expect(fetchFn).toHaveBeenNthCalledWith(4, "/two", {
      body: undefined,
      headers: { Authorization: "Bearer fresh-token" },
      method: "GET",
    });
  });

  it("forwards abort signals to fetch requests", async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ ok: true }));
    const apiClient = createAuthenticatedApiClient({
      fetchFn,
      getToken: () => "access-token",
      onRefreshFailed: vi.fn(),
      refreshAccessToken: vi.fn(),
    });
    const controller = new AbortController();

    await apiClient.requestJson({
      path: "/protected",
      responseSchema: z.object({ ok: z.boolean() }),
      signal: controller.signal,
    });

    expect(fetchFn).toHaveBeenCalledWith("/protected", {
      body: undefined,
      headers: { Authorization: "Bearer access-token" },
      method: "GET",
      signal: controller.signal,
    });
  });

  it("expires the session when refresh fails", async () => {
    const onRefreshFailed = vi.fn();
    const apiClient = createAuthenticatedApiClient({
      fetchFn: vi.fn(async () => jsonResponse({ message: "Unauthorized" }, 401)),
      getToken: () => "stale-token",
      onRefreshFailed,
      refreshAccessToken: vi.fn(async () => {
        throw new Error("refresh failed");
      }),
    });

    await expect(
      apiClient.requestJson({
        path: "/protected",
        responseSchema: z.object({ ok: z.boolean() }),
      }),
    ).rejects.toThrow("Your session has expired. Please sign in again.");
    expect(onRefreshFailed).toHaveBeenCalledTimes(1);
  });

  it("preserves response status on authenticated request failures", async () => {
    const apiClient = createAuthenticatedApiClient({
      fetchFn: vi.fn(async () => jsonResponse({ message: "No scope" }, 403)),
      getToken: () => "access-token",
      onRefreshFailed: vi.fn(),
      refreshAccessToken: vi.fn(),
    });

    await expect(
      apiClient.requestJson({
        path: "/protected",
        responseSchema: z.object({ ok: z.boolean() }),
      }),
    ).rejects.toMatchObject({
      message: "No scope",
      name: "ApiError",
      status: 403,
    } satisfies Partial<ApiError>);
  });
});
