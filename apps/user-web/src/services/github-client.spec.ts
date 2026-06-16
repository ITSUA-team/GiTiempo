import { describe, expect, it, vi } from "vitest";
import { createAuthenticatedApiClient } from "@gitiempo/web-shared/http";

import { createGitHubClient } from "./github-client";

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

describe("createGitHubClient", () => {
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
    const client = createGitHubClient({
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

  it("loads GitHub browsing owners, repositories, projects, and issues", async () => {
    const fetchFn = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            {
              avatarUrl: null,
              label: "Octo Org",
              login: "octo-org",
              type: "organization",
              url: "https://github.com/octo-org",
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            {
              description: null,
              fullName: "octo-org/frontend",
              id: "repo-1",
              isArchived: false,
              name: "frontend",
              nodeId: "R_kgDOFrontend",
              owner: "octo-org",
              updatedAt: "2026-04-20T12:00:00.000Z",
              url: "https://github.com/octo-org/frontend",
              visibility: "private",
            },
          ],
          pagination: { hasNextPage: false, limit: 100, nextPageToken: null },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            {
              description: null,
              id: "PVT_kwDORoadmap",
              number: 7,
              owner: "octo-org",
              state: "open",
              title: "Roadmap",
              updatedAt: "2026-04-20T12:00:00.000Z",
              url: "https://github.com/orgs/octo-org/projects/7",
            },
          ],
          pagination: { hasNextPage: false, limit: 100, nextPageToken: null },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            {
              id: "issue-1",
              nodeId: "I_kwDOIssue",
              number: 42,
              repository: {
                fullName: "octo-org/frontend",
                name: "frontend",
                owner: "octo-org",
              },
              state: "open",
              title: "Fix timer picker",
              updatedAt: "2026-04-20T12:00:00.000Z",
              url: "https://github.com/octo-org/frontend/issues/42",
            },
          ],
          pagination: { hasNextPage: false, limit: 100, nextPageToken: null },
        }),
      );
    const client = createGitHubClient({ apiClient: createTestApiClient(fetchFn) });

    await client.listOwners({ type: "organization" });
    await client.listRepositories({
      limit: 100,
      owner: "octo-org",
      ownerType: "organization",
    });
    await client.listProjects({
      limit: 100,
      owner: "octo-org",
      ownerType: "organization",
    });
    await client.listRepositoryIssues("octo-org", "frontend", {
      limit: 100,
      state: "open",
    });

    expect(fetchFn).toHaveBeenNthCalledWith(1, "/github/owners?type=organization", {
      body: undefined,
      headers: { Authorization: "Bearer access-token" },
      method: "GET",
    });
    expect(fetchFn).toHaveBeenNthCalledWith(
      2,
      "/github/repos?limit=100&ownerType=organization&owner=octo-org",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchFn).toHaveBeenNthCalledWith(
      3,
      "/github/projects?limit=100&ownerType=organization&owner=octo-org",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchFn).toHaveBeenNthCalledWith(
      4,
      "/github/repos/octo-org/frontend/issues?limit=100&state=open",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("disconnects the GitHub connection with bearer auth and no JSON body", async () => {
    const fetchFn = vi.fn(async () => new Response(null, { status: 204 }));
    const client = createGitHubClient({ apiClient: createTestApiClient(fetchFn) });

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
    const client = createGitHubClient({ apiClient: createTestApiClient(fetchFn) });

    await expect(client.getAuthUrl()).rejects.toThrow(
      "GitHub auth flow is already pending",
    );
  });
});
