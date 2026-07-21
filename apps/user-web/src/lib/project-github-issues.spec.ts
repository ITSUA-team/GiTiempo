import type {
  GitHubRepositoryIssueListResponse,
  TaskResponse,
} from "@gitiempo/shared";
import { describe, expect, it, vi } from "vitest";

import type { TimeEntriesClient } from "@/services/time-entries-client";

import { loadUnsyncedProjectGitHubIssues } from "./project-github-issues";

const PROJECT_ID = "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f900";

function createIssue(
  issueNumber: number,
  title = `Issue ${issueNumber}`,
): GitHubRepositoryIssueListResponse["items"][number] {
  return {
    id: `issue-${issueNumber}`,
    nodeId: `node-${issueNumber}`,
    number: issueNumber,
    repository: {
      fullName: "octo-org/repo-name",
      name: "repo-name",
      owner: "octo-org",
    },
    state: "open",
    title,
    updatedAt: "2026-04-21T10:00:00.000Z",
    url: `https://github.com/octo-org/repo-name/issues/${issueNumber}`,
  };
}

function createGitHubIssueResponse(
  items: GitHubRepositoryIssueListResponse["items"],
  nextPageToken: string | null = null,
): GitHubRepositoryIssueListResponse {
  return {
    items,
    pagination: {
      hasNextPage: nextPageToken !== null,
      limit: 30,
      nextPageToken,
    },
  };
}

function createClientMock(
  listProjectGitHubIssues: TimeEntriesClient["listProjectGitHubIssues"],
): TimeEntriesClient {
  return {
    backfillTaskBillableDefault: vi.fn(),
    createManualEntry: vi.fn(),
    createTask: vi.fn(),
    deleteEntry: vi.fn(),
    deleteTask: vi.fn(),
    ensureGitHubIssueTask: vi.fn(),
    getCurrentTimer: vi.fn(),
    listOwnEntries: vi.fn(),
    listProjectGitHubIssues,
    listProjectTasks: vi.fn(),
    listProjectTimeEntries: vi.fn(),
    listVisibleProjects: vi.fn(),
    startTimer: vi.fn(),
    stopTimer: vi.fn(),
    updateEntry: vi.fn(),
    updateTask: vi.fn(),
  };
}

describe("loadUnsyncedProjectGitHubIssues", () => {
  it("loads every GitHub issue page before deduplicating local tasks", async () => {
    const localTasks = [
      {
        githubIssue: {
          githubRepo: "octo-org/repo-name",
          issueNumber: 1,
        },
      },
    ] as TaskResponse[];
    const listProjectGitHubIssues = vi
      .fn<TimeEntriesClient["listProjectGitHubIssues"]>()
      .mockResolvedValueOnce(
        createGitHubIssueResponse([createIssue(1)], "page-2"),
      )
      .mockResolvedValueOnce(
        createGitHubIssueResponse([createIssue(2, "Second issue")]),
      );
    const client = createClientMock(listProjectGitHubIssues);

    const result = await loadUnsyncedProjectGitHubIssues({
      client,
      localTasks,
      projectId: PROJECT_ID,
    });

    expect(listProjectGitHubIssues).toHaveBeenNthCalledWith(1, PROJECT_ID, {
      limit: 30,
      state: "open",
    });
    expect(listProjectGitHubIssues).toHaveBeenNthCalledWith(2, PROJECT_ID, {
      limit: 30,
      pageToken: "page-2",
      state: "open",
    });
    expect(result).toEqual({
      errorMessage: null,
      issues: [
        {
          githubIssue: {
            githubRepo: "octo-org/repo-name",
            issueNumber: 2,
          },
          issueTitle: "Second issue",
          projectId: PROJECT_ID,
          updatedAt: "2026-04-21T10:00:00.000Z",
        },
      ],
    });
  });

  it("treats a differently-cased issue as unsynced", async () => {
    // A task synced under lowercase owner does not match an issue GitHub
    // returns under its canonical casing, so it surfaces rather than being
    // silently hidden as the same repo.
    const localTasks = [
      { githubIssue: { githubRepo: "octo-org/repo-name", issueNumber: 5 } },
    ] as TaskResponse[];
    const canonical = {
      ...createIssue(5),
      repository: {
        fullName: "Octo-Org/Repo-Name",
        name: "Repo-Name",
        owner: "Octo-Org",
      },
    };
    const client = createClientMock(
      vi
        .fn<TimeEntriesClient["listProjectGitHubIssues"]>()
        .mockResolvedValue(createGitHubIssueResponse([canonical])),
    );

    const result = await loadUnsyncedProjectGitHubIssues({
      client,
      localTasks,
      projectId: PROJECT_ID,
    });

    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.githubIssue.githubRepo).toBe("Octo-Org/Repo-Name");
  });

  it("hides an issue already synced under the same casing", async () => {
    const localTasks = [
      { githubIssue: { githubRepo: "octo-org/repo-name", issueNumber: 5 } },
    ] as TaskResponse[];
    const client = createClientMock(
      vi
        .fn<TimeEntriesClient["listProjectGitHubIssues"]>()
        .mockResolvedValue(createGitHubIssueResponse([createIssue(5)])),
    );

    const result = await loadUnsyncedProjectGitHubIssues({
      client,
      localTasks,
      projectId: PROJECT_ID,
    });

    expect(result.issues).toHaveLength(0);
  });

  it("stops loading after the bounded GitHub issue page limit", async () => {
    const listProjectGitHubIssues = vi
      .fn<TimeEntriesClient["listProjectGitHubIssues"]>()
      .mockResolvedValue(createGitHubIssueResponse([], "next-page"));
    const client = createClientMock(listProjectGitHubIssues);

    const result = await loadUnsyncedProjectGitHubIssues({
      client,
      localTasks: [],
      projectId: PROJECT_ID,
    });

    expect(listProjectGitHubIssues).toHaveBeenCalledTimes(5);
    expect(result).toEqual({
      errorMessage: null,
      issues: [],
    });
  });

  it("returns a request error without pretending the project has no GitHub issues", async () => {
    const listProjectGitHubIssues = vi
      .fn<TimeEntriesClient["listProjectGitHubIssues"]>()
      .mockRejectedValue(new Error("GitHub is temporarily unavailable"));
    const client = createClientMock(listProjectGitHubIssues);

    const result = await loadUnsyncedProjectGitHubIssues({
      client,
      localTasks: [],
      projectId: PROJECT_ID,
    });

    expect(listProjectGitHubIssues).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      errorMessage: "GitHub is temporarily unavailable",
      issues: [],
    });
  });
});
