import { describe, expect, it, vi } from "vitest";

import { createAuthenticatedApiClient, type ApiError } from "./http";
import { createGitHubBrowsingClient } from "./github-browsing-client";

const pagination = {
  limit: 30,
  hasNextPage: false,
  nextPageToken: null,
};

const issue = {
  id: "123",
  nodeId: "I_kwDO",
  repository: {
    owner: "octo-org",
    name: "repo",
    fullName: "octo-org/repo",
  },
  number: 42,
  title: "Track project work",
  state: "open",
  url: "https://github.com/octo-org/repo/issues/42",
  updatedAt: "2026-05-14T12:00:00.000Z",
};

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function createTestClient(fetchFn: typeof fetch) {
  const apiClient = createAuthenticatedApiClient({
    apiBaseUrl: "https://api.example.test/",
    fetchFn,
    getToken: () => "access-token",
    onRefreshFailed: vi.fn(),
    refreshAccessToken: async () => "access-token",
  });

  return createGitHubBrowsingClient({ apiClient });
}

describe("createGitHubBrowsingClient", () => {
  it("loads GitHub owners with optional filters", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        items: [
          {
            login: "octo-org",
            label: "octo-org",
            type: "organization",
            avatarUrl: null,
            url: "https://github.com/octo-org",
          },
        ],
      }),
    );
    const client = createTestClient(fetchFn);

    const response = await client.listOwners({ type: "organization" });

    expect(response.items[0]?.login).toBe("octo-org");
    expect(fetchFn).toHaveBeenCalledWith(
      "https://api.example.test/github/owners?type=organization",
      {
        body: undefined,
        headers: { Authorization: "Bearer access-token" },
        method: "GET",
      },
    );
  });

  it("loads repositories with owner scope and pagination", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        items: [
          {
            id: "1",
            nodeId: "R_kwDO",
            owner: "octo-org",
            name: "repo",
            fullName: "octo-org/repo",
            visibility: "private",
            isArchived: false,
            description: null,
            url: "https://github.com/octo-org/repo",
            updatedAt: "2026-05-14T12:00:00.000Z",
          },
        ],
        pagination,
      }),
    );
    const client = createTestClient(fetchFn);

    await client.listRepositories({
      ownerType: "organization",
      owner: "octo-org",
      limit: 30,
      pageToken: "next-page",
    });

    expect(fetchFn).toHaveBeenCalledWith(
      "https://api.example.test/github/repos?ownerType=organization&owner=octo-org&limit=30&pageToken=next-page",
      expect.any(Object),
    );
  });

  it("loads Project V2 candidates", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        items: [
          {
            id: "PVT_kwDO",
            number: 7,
            title: "Roadmap",
            owner: "octo-org",
            state: "open",
            description: null,
            url: "https://github.com/orgs/octo-org/projects/7",
            updatedAt: "2026-05-14T12:00:00.000Z",
          },
        ],
        pagination,
      }),
    );
    const client = createTestClient(fetchFn);

    const response = await client.listProjects({
      ownerType: "organization",
      owner: "octo-org",
      limit: 30,
    });

    expect(response.items[0]?.title).toBe("Roadmap");
    expect(fetchFn).toHaveBeenCalledWith(
      "https://api.example.test/github/projects?ownerType=organization&owner=octo-org&limit=30",
      expect.any(Object),
    );
  });

  it("loads repository issues with search parameters", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({ items: [issue], pagination }),
    );
    const client = createTestClient(fetchFn);

    const response = await client.listRepositoryIssues("octo-org", "repo", {
      state: "open",
      q: "project work",
      limit: 20,
    });

    expect(response.items[0]?.number).toBe(42);
    expect(fetchFn).toHaveBeenCalledWith(
      "https://api.example.test/github/repos/octo-org/repo/issues?state=open&q=project+work&limit=20",
      expect.any(Object),
    );
  });

  it("loads Project V2 issue items", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        items: [{ projectItemId: "PVTI_kwDO", isArchived: false, issue }],
        pagination,
        skipped: {
          pullRequests: 0,
          draftIssues: 0,
          redacted: 0,
          unknown: 0,
        },
      }),
    );
    const client = createTestClient(fetchFn);

    const response = await client.listProjectIssues("PVT_kwDO", {
      pageToken: "cursor-1",
    });

    expect(response.items[0]?.projectItemId).toBe("PVTI_kwDO");
    expect(fetchFn).toHaveBeenCalledWith(
      "https://api.example.test/github/projects/PVT_kwDO/issues?pageToken=cursor-1",
      expect.any(Object),
    );
  });

  it("propagates API error messages", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({ message: "GitHub connection not found" }, { status: 404 }),
    );
    const client = createTestClient(fetchFn);

    await expect(client.listOwners()).rejects.toMatchObject({
      message: "GitHub connection not found",
      status: 404,
    } satisfies Partial<ApiError>);
  });
});
