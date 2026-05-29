import { describe, expect, it, vi } from "vitest";
import { createAuthenticatedApiClient } from "@gitiempo/web-shared/http";

import { createProfileGitHubClient } from "./profile-github-client";

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function createTestApiClient(fetchFn: typeof fetch, apiBaseUrl?: string) {
  return createAuthenticatedApiClient({
    apiBaseUrl,
    fetchFn,
    getToken: () => "access-token",
    onRefreshFailed: vi.fn(),
    refreshAccessToken: async () => "access-token",
  });
}

describe("createProfileGitHubClient", () => {
  it("loads the GitHub connection status with bearer auth", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        account: {
          avatarUrl: "https://avatars.example.test/octo.png",
          connectedAt: "2026-05-01T10:15:00.000Z",
          githubUserId: "123456",
          login: "alexeytsukanov",
          updatedAt: "2026-05-04T08:45:00.000Z",
        },
        status: "connected",
      }),
    );
    const client = createProfileGitHubClient({
      apiClient: createTestApiClient(fetchFn, "https://api.example.test/"),
    });

    const response = await client.getConnectionStatus();

    expect(response.status).toBe("connected");
    expect(fetchFn).toHaveBeenCalledWith(
      "https://api.example.test/github/connection",
      {
        body: undefined,
        headers: {
          Authorization: "Bearer access-token",
        },
        method: "GET",
      },
    );
  });

  it("loads the GitHub auth URL with bearer auth", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({ authorizationUrl: "https://github.com/login/oauth/authorize" }),
    );
    const client = createProfileGitHubClient({ apiClient: createTestApiClient(fetchFn) });

    const response = await client.getAuthUrl();

    expect(response.authorizationUrl).toContain("github.com/login/oauth/authorize");
    expect(fetchFn).toHaveBeenCalledWith("/github/auth-url", {
      body: undefined,
      headers: {
        Authorization: "Bearer access-token",
      },
      method: "GET",
    });
  });

  it("disconnects the GitHub connection with bearer auth and no JSON body", async () => {
    const fetchFn = vi.fn(async () => new Response(null, { status: 204 }));
    const client = createProfileGitHubClient({ apiClient: createTestApiClient(fetchFn) });

    await client.disconnect();

    expect(fetchFn).toHaveBeenCalledWith("/github/connection", {
      body: undefined,
      headers: {
        Authorization: "Bearer access-token",
      },
      method: "DELETE",
    });
  });

  it("throws repository-ordered API messages for GitHub failures", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse(
        { error: "Conflict", message: "GitHub auth flow is already pending" },
        { status: 409 },
      ),
    );
    const client = createProfileGitHubClient({ apiClient: createTestApiClient(fetchFn) });

    await expect(client.getAuthUrl()).rejects.toThrow(
      "GitHub auth flow is already pending",
    );
  });

  it("propagates fetch boundary failures", async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error("network down");
    });
    const client = createProfileGitHubClient({ apiClient: createTestApiClient(fetchFn) });

    await expect(client.getConnectionStatus()).rejects.toThrow(
      "network down",
    );
  });
});
