import { describe, expect, it } from "vitest";

import {
  githubIssueCreateReferenceSchema,
  githubIssueListQuerySchema,
  githubOwnerListQuerySchema,
  githubOwnerListResponseSchema,
  githubProjectCreateReferenceSchema,
  githubProjectIssueListResponseSchema,
  githubProjectListQuerySchema,
  githubProjectListResponseSchema,
  githubRepositoryIssueListResponseSchema,
  githubRepositoryListQuerySchema,
  githubRepositoryListResponseSchema,
} from "./github.js";

const pagination = {
  limit: 30,
  hasNextPage: true,
  nextPageToken: "opaque-token",
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

describe("GitHub browsing contracts", () => {
  it("accepts owner list responses without token material", () => {
    const result = githubOwnerListResponseSchema.parse({
      items: [
        {
          login: "octocat",
          label: "octocat",
          type: "personal",
          avatarUrl: "https://github.com/images/error/octocat_happy.gif",
          url: "https://github.com/octocat",
        },
      ],
    });

    expect(result.items[0]).not.toHaveProperty("accessToken");
    expect(result.items[0]?.type).toBe("personal");
  });

  it("rejects invalid owner filters", () => {
    const result = githubOwnerListQuerySchema.safeParse({ type: "team" });

    expect(result.success).toBe(false);
  });

  it("accepts repository responses with page-token pagination", () => {
    const result = githubRepositoryListResponseSchema.parse({
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
    });

    expect(result.pagination.nextPageToken).toBe("opaque-token");
  });

  it("requires organization owner only for organization-scoped queries", () => {
    expect(
      githubRepositoryListQuerySchema.safeParse({ ownerType: "organization" })
        .success,
    ).toBe(false);
    expect(
      githubRepositoryListQuerySchema.safeParse({
        ownerType: "personal",
        owner: "octo-org",
      }).success,
    ).toBe(false);
    expect(
      githubRepositoryListQuerySchema.parse({ ownerType: "personal" })
        .ownerType,
    ).toBe("personal");
  });

  it("bounds limit and accepts opaque page tokens", () => {
    const result = githubProjectListQuerySchema.safeParse({
      ownerType: "personal",
      limit: "101",
      pageToken: "opaque-token",
    });

    expect(result.success).toBe(false);
    expect(
      githubProjectListQuerySchema.parse({
        ownerType: "personal",
        limit: "100",
        pageToken: "opaque-token",
      }).pageToken,
    ).toBe("opaque-token");
  });

  it("accepts project responses with page-token pagination", () => {
    const result = githubProjectListResponseSchema.parse({
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
    });

    expect(result.items[0]?.id).toBe("PVT_kwDO");
  });

  it("defaults issue state to all and trims empty search", () => {
    const result = githubIssueListQuerySchema.parse({ q: "   " });

    expect(result.state).toBe("all");
    expect(result.q).toBeUndefined();
  });

  it("rejects invalid issue states", () => {
    const result = githubIssueListQuerySchema.safeParse({ state: "merged" });

    expect(result.success).toBe(false);
  });

  it("accepts repository issue responses", () => {
    const result = githubRepositoryIssueListResponseSchema.parse({
      items: [issue],
      pagination,
    });

    expect(result.items[0]?.repository.fullName).toBe("octo-org/repo");
  });

  it("accepts project issue responses with skipped counts", () => {
    const result = githubProjectIssueListResponseSchema.parse({
      items: [
        {
          projectItemId: "PVTI_kwDO",
          isArchived: false,
          issue,
        },
      ],
      pagination,
      skipped: {
        pullRequests: 1,
        draftIssues: 1,
        redacted: 1,
        unknown: 1,
      },
    });

    expect(result.skipped.pullRequests).toBe(1);
  });

  it("accepts project create references for repositories and Project V2", () => {
    expect(
      githubProjectCreateReferenceSchema.parse({
        provider: "github",
        externalType: "repository",
        externalId: "123",
        externalKey: "octo-org/repo",
        externalUrl: "https://github.com/octo-org/repo",
        metadata: { name: "repo" },
      }).externalKey,
    ).toBe("octo-org/repo");

    expect(
      githubProjectCreateReferenceSchema.parse({
        provider: "github",
        externalType: "project_v2",
        externalId: "PVT_kwDO",
        externalKey: "PVT_kwDO",
        externalUrl: "https://github.com/orgs/octo-org/projects/7",
        metadata: { title: "Roadmap" },
      }).externalType,
    ).toBe("project_v2");
  });

  it("accepts issue create references from repositories and Project V2 items", () => {
    expect(
      githubIssueCreateReferenceSchema.parse({
        provider: "github",
        sourceType: "repository_issue",
        externalType: "issue",
        externalId: "123",
        externalKey: "octo-org/repo#42",
        externalUrl: "https://github.com/octo-org/repo/issues/42",
        metadata: { title: "Track project work" },
      }).externalKey,
    ).toBe("octo-org/repo#42");

    expect(
      githubIssueCreateReferenceSchema.parse({
        provider: "github",
        sourceType: "project_v2_issue_item",
        externalType: "issue",
        externalId: "123",
        externalKey: "octo-org/repo#42",
        externalUrl: "https://github.com/octo-org/repo/issues/42",
        projectItemId: "PVTI_kwDO",
        metadata: { projectId: "PVT_kwDO" },
      }).sourceType,
    ).toBe("project_v2_issue_item");
  });
});
