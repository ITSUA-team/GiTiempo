import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { createAuthenticatedApiClient } from "./http";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

describe("createAuthenticatedApiClient", () => {
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
    // eslint-disable-next-line no-unused-vars
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
});
