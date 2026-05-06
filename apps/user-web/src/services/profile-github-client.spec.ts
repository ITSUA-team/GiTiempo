import { describe, expect, it, vi } from "vitest";

import { createProfileGitHubClient } from "./profile-github-client";

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    ...init,
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
      apiBaseUrl: "https://api.example.test/",
      fetchFn,
    });

    const response = await client.getConnectionStatus("access-token");

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
    const client = createProfileGitHubClient({ fetchFn });

    const response = await client.getAuthUrl("access-token");

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
    const client = createProfileGitHubClient({ fetchFn });

    await client.disconnect("access-token");

    expect(fetchFn).toHaveBeenCalledWith("/github/connection", {
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
    const client = createProfileGitHubClient({ fetchFn });

    await expect(client.getAuthUrl("access-token")).rejects.toThrow(
      "GitHub auth flow is already pending",
    );
  });

  it("propagates fetch boundary failures", async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error("network down");
    });
    const client = createProfileGitHubClient({ fetchFn });

    await expect(client.getConnectionStatus("access-token")).rejects.toThrow(
      "network down",
    );
  });
});
