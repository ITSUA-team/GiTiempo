import type { GitHubProject } from "@gitiempo/shared";
import { ApiError } from "@gitiempo/web-shared/http";
import { describe, expect, it, vi } from "vitest";

import type { TimeEntriesClient } from "@/services/time-entries-client";

import {
  isRepositoryTracked,
  loadGitHubProjectIssues,
  loadGitHubProjectRepositories,
  loadOrganizationGitHubProjects,
  toTrackedRepositoryKeySet,
} from "./timer-github-projects";

function project(
  title: string,
  number: number,
  state: "open" | "closed" = "open",
): GitHubProject {
  return {
    id: `PVT_${title}`,
    number,
    title,
    owner: "ITSUA-team",
    state,
    description: null,
    url: `https://github.com/orgs/ITSUA-team/projects/${number}`,
    updatedAt: "2026-08-03T10:00:00.000Z",
  };
}

function issueItem(
  fullName: string,
  number: number,
  title: string,
  isArchived = false,
) {
  const [owner, name] = fullName.split("/");

  return {
    projectItemId: `PVTI_${number}`,
    isArchived,
    issue: {
      id: `issue-${number}`,
      nodeId: null,
      repository: { owner: owner!, name: name!, fullName },
      number,
      title,
      state: "open" as const,
      url: `https://github.com/${fullName}/issues/${number}`,
      updatedAt: "2026-08-03T10:00:00.000Z",
    },
  };
}

function ownersResponse(logins: string[]) {
  return {
    items: [
      {
        login: "akholod",
        label: "akholod",
        type: "personal" as const,
        avatarUrl: null,
        url: null,
      },
      ...logins.map((login) => ({
        login,
        label: login,
        type: "organization" as const,
        avatarUrl: null,
        url: null,
      })),
    ],
  };
}

function projectsResponse(
  items: GitHubProject[],
  nextPageToken: string | null = null,
) {
  return {
    items,
    pagination: { hasNextPage: nextPageToken !== null, limit: 50, nextPageToken },
  };
}

function issuesResponse(
  items: ReturnType<typeof issueItem>[],
  options: { draftIssues?: number; nextPageToken?: string | null } = {},
) {
  return {
    items,
    pagination: {
      hasNextPage: (options.nextPageToken ?? null) !== null,
      limit: 30,
      nextPageToken: options.nextPageToken ?? null,
    },
    skipped: {
      pullRequests: 0,
      draftIssues: options.draftIssues ?? 0,
      redacted: 0,
      unknown: 0,
    },
  };
}

function clientMock(
  overrides: Partial<
    Pick<
      TimeEntriesClient,
      "listGitHubOwners" | "listGitHubProjects" | "listGitHubProjectIssues"
    >
  >,
): TimeEntriesClient {
  return {
    listGitHubOwners:
      overrides.listGitHubOwners ?? vi.fn().mockResolvedValue({ items: [] }),
    listGitHubProjects:
      overrides.listGitHubProjects ??
      vi.fn().mockResolvedValue(projectsResponse([])),
    listGitHubProjectIssues:
      overrides.listGitHubProjectIssues ??
      vi.fn().mockResolvedValue(issuesResponse([])),
  } as unknown as TimeEntriesClient;
}

describe("loadOrganizationGitHubProjects", () => {
  it("lists open organization projects and ignores the personal owner", async () => {
    const listGitHubProjects = vi
      .fn()
      .mockResolvedValue(
        projectsResponse([project("GiTimpo", 7), project("Krvn", 9)]),
      );
    const client = clientMock({
      listGitHubOwners: vi
        .fn()
        .mockResolvedValue(ownersResponse(["ITSUA-team"])),
      listGitHubProjects,
    });

    const result = await loadOrganizationGitHubProjects({ client });

    expect(listGitHubProjects).toHaveBeenCalledTimes(1);
    expect(listGitHubProjects).toHaveBeenCalledWith(
      "ITSUA-team",
      expect.objectContaining({ limit: 50 }),
    );
    expect(result.availability).toBe("available");
    expect(result.projects.map((p) => p.title)).toEqual(["GiTimpo", "Krvn"]);
  });

  it("drops closed projects", async () => {
    const client = clientMock({
      listGitHubOwners: vi
        .fn()
        .mockResolvedValue(ownersResponse(["ITSUA-team"])),
      listGitHubProjects: vi
        .fn()
        .mockResolvedValue(
          projectsResponse([
            project("GiTimpo", 7),
            project("Archived board", 3, "closed"),
          ]),
        ),
    });

    const result = await loadOrganizationGitHubProjects({ client });

    expect(result.projects.map((p) => p.title)).toEqual(["GiTimpo"]);
  });

  it("reports a missing GitHub connection rather than a failure", async () => {
    const client = clientMock({
      listGitHubOwners: vi
        .fn()
        .mockRejectedValue(
          new ApiError("GitHub connection not found", { status: 404 }),
        ),
    });

    const result = await loadOrganizationGitHubProjects({ client });

    expect(result.availability).toBe("no-connection");
    expect(result.errorMessage).toBeNull();
  });

  it("reports an approved-organization-free workspace separately", async () => {
    const client = clientMock({
      listGitHubOwners: vi.fn().mockResolvedValue(ownersResponse([])),
    });

    const result = await loadOrganizationGitHubProjects({ client });

    expect(result.availability).toBe("no-organization");
  });

  it("keeps a request failure distinct from an empty list", async () => {
    const client = clientMock({
      listGitHubOwners: vi
        .fn()
        .mockResolvedValue(ownersResponse(["ITSUA-team"])),
      listGitHubProjects: vi
        .fn()
        .mockRejectedValue(new Error("GitHub is temporarily unavailable")),
    });

    const result = await loadOrganizationGitHubProjects({ client });

    expect(result.errorMessage).toBe("GitHub is temporarily unavailable");
    expect(result.projects).toEqual([]);
  });

  it("stops at the page cap and reports truncation", async () => {
    const listGitHubProjects = vi
      .fn()
      .mockResolvedValue(projectsResponse([project("GiTimpo", 7)], "next"));
    const client = clientMock({
      listGitHubOwners: vi
        .fn()
        .mockResolvedValue(ownersResponse(["ITSUA-team"])),
      listGitHubProjects,
    });

    const result = await loadOrganizationGitHubProjects({ client });

    expect(listGitHubProjects).toHaveBeenCalledTimes(3);
    expect(result.isTruncated).toBe(true);
  });
});

describe("loadGitHubProjectIssues", () => {
  it("maps project items to trackable issues carrying their repository", async () => {
    const client = clientMock({
      listGitHubProjectIssues: vi
        .fn()
        .mockResolvedValue(
          issuesResponse([
            issueItem("ITSUA-team/GiTiempo", 343, "Timer pulls projects"),
          ]),
        ),
    });

    const result = await loadGitHubProjectIssues({
      client,
      githubProjectId: "PVT_GiTimpo",
    });

    expect(result.issues).toEqual([
      {
        githubIssue: {
          githubRepo: "ITSUA-team/GiTiempo",
          issueNumber: 343,
        },
        issueTitle: "Timer pulls projects",
        updatedAt: "2026-08-03T10:00:00.000Z",
      },
    ]);
  });

  it("requests only open issues", async () => {
    const listGitHubProjectIssues = vi
      .fn()
      .mockResolvedValue(issuesResponse([]));
    const client = clientMock({ listGitHubProjectIssues });

    await loadGitHubProjectIssues({
      client,
      githubProjectId: "PVT_GiTimpo",
    });

    expect(listGitHubProjectIssues).toHaveBeenCalledWith(
      "PVT_GiTimpo",
      expect.objectContaining({ state: "open" }),
    );
  });

  it("reports draft items a board holds instead of hiding them", async () => {
    const client = clientMock({
      listGitHubProjectIssues: vi
        .fn()
        .mockResolvedValue(issuesResponse([], { draftIssues: 4 })),
    });

    const result = await loadGitHubProjectIssues({
      client,
      githubProjectId: "PVT_TestProjectWithoutRepository",
    });

    expect(result.issues).toEqual([]);
    expect(result.draftCount).toBe(4);
    expect(result.errorMessage).toBeNull();
  });

  it("skips archived project items", async () => {
    const client = clientMock({
      listGitHubProjectIssues: vi.fn().mockResolvedValue(
        issuesResponse([
          issueItem("ITSUA-team/GiTiempo", 1, "Live"),
          issueItem("ITSUA-team/GiTiempo", 2, "Archived", true),
        ]),
      ),
    });

    const result = await loadGitHubProjectIssues({
      client,
      githubProjectId: "PVT_GiTimpo",
    });

    expect(result.issues.map((i) => i.issueTitle)).toEqual(["Live"]);
  });

  it("keeps a request failure distinct from a board with no issues", async () => {
    const client = clientMock({
      listGitHubProjectIssues: vi
        .fn()
        .mockRejectedValue(new Error("Project items unavailable")),
    });

    const result = await loadGitHubProjectIssues({
      client,
      githubProjectId: "PVT_GiTimpo",
    });

    expect(result.errorMessage).toBe("Project items unavailable");
    expect(result.issues).toEqual([]);
    expect(result.draftCount).toBe(0);
  });
});

describe("loadGitHubProjectRepositories", () => {
  it("derives the distinct repositories each board holds", async () => {
    const listGitHubProjectIssues = vi.fn().mockResolvedValue(
      issuesResponse([
        issueItem("ITSUA-team/GiTiempo", 1, "One"),
        issueItem("ITSUA-team/GiTiempo", 2, "Two"),
        issueItem("ITSUA-team/.github", 3, "Three"),
      ]),
    );
    const client = clientMock({ listGitHubProjectIssues });

    const result = await loadGitHubProjectRepositories({
      client,
      projects: [{ id: "PVT_GiTimpo" }],
    });

    expect(result["PVT_GiTimpo"]).toEqual({
      hasMore: false,
      repositories: ["ITSUA-team/GiTiempo", "ITSUA-team/.github"],
    });
  });

  it("reports a board with no linked repository as empty rather than failing", async () => {
    const client = clientMock({
      listGitHubProjectIssues: vi
        .fn()
        .mockResolvedValue(issuesResponse([], { draftIssues: 3 })),
    });

    const result = await loadGitHubProjectRepositories({
      client,
      projects: [{ id: "PVT_TestProjectWithoutRepository" }],
    });

    expect(result["PVT_TestProjectWithoutRepository"]).toEqual({
      hasMore: false,
      repositories: [],
    });
  });

  it("keeps one failing board from breaking the others", async () => {
    const listGitHubProjectIssues = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce(
        issuesResponse([issueItem("ITSUA-team/GiTiempo", 1, "One")]),
      );
    const client = clientMock({ listGitHubProjectIssues });

    const result = await loadGitHubProjectRepositories({
      client,
      projects: [{ id: "PVT_Broken" }, { id: "PVT_Fine" }],
    });

    expect(result["PVT_Broken"]?.repositories).toEqual([]);
    expect(result["PVT_Fine"]?.repositories).toEqual(["ITSUA-team/GiTiempo"]);
  });

  it("flags boards whose first page did not exhaust the issues", async () => {
    const client = clientMock({
      listGitHubProjectIssues: vi
        .fn()
        .mockResolvedValue(
          issuesResponse([issueItem("ITSUA-team/GiTiempo", 1, "One")], {
            nextPageToken: "next",
          }),
        ),
    });

    const result = await loadGitHubProjectRepositories({
      client,
      projects: [{ id: "PVT_GiTimpo" }],
    });

    expect(result["PVT_GiTimpo"]?.hasMore).toBe(true);
  });
});

describe("toTrackedRepositoryKeySet", () => {
  it("collects owner/repo names from GitHub-backed projects, lowercased", () => {
    const keys = toTrackedRepositoryKeySet([
      { name: "ITSUA-team/GiTiempo", source: "github" },
      { name: "ITSUA-team/.github", source: "github" },
      { name: "Internal Platform", source: "github" },
      { name: "octo-org/manual", source: "manual" },
    ]);

    expect([...keys].sort()).toEqual([
      "itsua-team/.github",
      "itsua-team/gitiempo",
    ]);
  });

  it("matches a repository regardless of casing", () => {
    const keys = toTrackedRepositoryKeySet([
      { name: "ITSUA-team/GiTiempo", source: "github" },
    ]);

    expect(isRepositoryTracked("itsua-team/gitiempo", keys)).toBe(true);
    expect(isRepositoryTracked("ITSUA-team/GiTiempo", keys)).toBe(true);
    expect(isRepositoryTracked("ITSUA-team/other", keys)).toBe(false);
  });
});
