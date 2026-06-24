import { describe, expect, it, vi } from "vitest";
import { createAuthenticatedApiClient } from "@gitiempo/web-shared/http";

import { createGitHubBrowsingClient } from "./github-browsing-client";

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

describe("createGitHubBrowsingClient", () => {
  it("loads browseable GitHub owners with bearer auth", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        items: [
          {
            avatarUrl: null,
            label: "Octo Org",
            login: "octo",
            type: "organization",
            url: "https://github.com/octo",
          },
        ],
      }),
    );
    const client = createGitHubBrowsingClient({
      apiClient: createTestApiClient(fetchFn, "https://api.example.test/"),
    });

    const response = await client.listOwners({ type: "all" });

    expect(response.items[0]?.login).toBe("octo");
    expect(fetchFn).toHaveBeenCalledWith(
      "https://api.example.test/github/owners?type=all",
      {
        body: undefined,
        headers: {
          Authorization: "Bearer access-token",
        },
        method: "GET",
      },
    );
  });

  it("loads repository issues with bearer auth and parses the response", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        items: [
          {
            id: "issue-184",
            nodeId: null,
            number: 184,
            repository: {
              fullName: "octo/repo",
              name: "repo",
              owner: "octo",
            },
            state: "open",
            title: "Write release checklist",
            updatedAt: "2026-04-21T10:00:00.000Z",
            url: "https://github.com/octo/repo/issues/184",
          },
        ],
        pagination: {
          hasNextPage: false,
          limit: 10,
          nextPageToken: null,
        },
      }),
    );
    const client = createGitHubBrowsingClient({
      apiClient: createTestApiClient(fetchFn, "https://api.example.test/"),
    });

    const response = await client.listRepositoryIssues("octo", "repo", {
      limit: 10,
      q: "release checklist",
      state: "open",
    });

    expect(response.items[0]?.title).toBe("Write release checklist");
    expect(fetchFn).toHaveBeenCalledWith(
      "https://api.example.test/github/repos/octo/repo/issues?limit=10&state=open&q=release+checklist",
      {
        body: undefined,
        headers: {
          Authorization: "Bearer access-token",
        },
        method: "GET",
      },
    );
  });

  it("includes pagination tokens when loading repository issues", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        items: [],
        pagination: {
          hasNextPage: true,
          limit: 30,
          nextPageToken: "cursor-2",
        },
      }),
    );
    const client = createGitHubBrowsingClient({
      apiClient: createTestApiClient(fetchFn),
    });

    await client.listRepositoryIssues("octo-org", "repo.one", {
      limit: 30,
      pageToken: "cursor-1",
      state: "all",
    });

    expect(fetchFn).toHaveBeenCalledWith(
      "/github/repos/octo-org/repo.one/issues?pageToken=cursor-1&limit=30&state=all",
      {
        body: undefined,
        headers: {
          Authorization: "Bearer access-token",
        },
        method: "GET",
      },
    );
  });

  it("throws repository-ordered API messages for GitHub browsing failures", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse(
        { error: "Forbidden", message: "GitHub connection required" },
        { status: 403 },
      ),
    );
    const client = createGitHubBrowsingClient({
      apiClient: createTestApiClient(fetchFn),
    });

    await expect(
      client.listRepositoryIssues("octo", "repo"),
    ).rejects.toThrow("GitHub connection required");
  });

  it("propagates fetch boundary failures", async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error("network down");
    });
    const client = createGitHubBrowsingClient({
      apiClient: createTestApiClient(fetchFn),
    });

    await expect(client.listRepositoryIssues("octo", "repo")).rejects.toThrow(
      "network down",
    );
  });
});
