import { describe, expect, it } from "vitest";

import {
  backfillTaskBillableDefaultSchema,
  createTaskSchema,
  ensureGitHubIssueTaskSchema,
  taskListQuerySchema,
  taskBillableDefaultBackfillResponseSchema,
  taskResponseSchema,
  updateTaskSchema,
} from "./tasks.js";

const baseTaskResponse = {
  id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
  workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9000",
  projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002",
  title: "Improve reports filters",
  status: "open",
  defaultBillableForTimeEntries: true,
  isActive: true,
  createdAt: "2026-04-21T09:00:00.000Z",
  updatedAt: "2026-04-21T09:00:00.000Z",
} as const;

describe("taskResponseSchema", () => {
  it("accepts synced github issue linkage on task responses", () => {
    const result = taskResponseSchema.parse({
      ...baseTaskResponse,
      githubIssue: {
        githubRepo: "octo/repo",
        issueNumber: 184,
      },
    });

    expect(result.githubIssue).toEqual({
      githubRepo: "octo/repo",
      issueNumber: 184,
    });
  });

  it("allows github issue linkage to be null", () => {
    const result = taskResponseSchema.parse({
      ...baseTaskResponse,
      githubIssue: null,
    });

    expect(result.githubIssue).toBeNull();
    expect(result.defaultBillableForTimeEntries).toBe(true);
  });
});

describe("createTaskSchema", () => {
  it("accepts defaultBillableForTimeEntries", () => {
    const result = createTaskSchema.parse({
      defaultBillableForTimeEntries: false,
      title: "Improve reports filters",
    });

    expect(result.defaultBillableForTimeEntries).toBe(false);
  });

  it("rejects non-boolean defaultBillableForTimeEntries", () => {
    const result = createTaskSchema.safeParse({
      defaultBillableForTimeEntries: "false",
      title: "Improve reports filters",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([
      "defaultBillableForTimeEntries",
    ]);
  });
});

describe("taskListQuerySchema", () => {
  it("defaults to active tasks only", () => {
    expect(taskListQuerySchema.parse({})).toEqual({ includeInactive: false });
  });

  it("accepts string booleans from query parameters", () => {
    expect(taskListQuerySchema.parse({ includeInactive: "true" })).toEqual({
      includeInactive: true,
    });
    expect(taskListQuerySchema.parse({ includeInactive: "false" })).toEqual({
      includeInactive: false,
    });
  });
});

describe("ensureGitHubIssueTaskSchema", () => {
  it("accepts project-scoped github issue materialization input", () => {
    const result = ensureGitHubIssueTaskSchema.parse({
      projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002",
      issueNumber: 184,
    });

    expect(result).toEqual({
      projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002",
      issueNumber: 184,
    });
  });

  it("rejects client-supplied repository fields", () => {
    const result = ensureGitHubIssueTaskSchema.safeParse({
      githubRepo: "octo/repo",
      issueNumber: 184,
      issueTitle: "Client title",
    });

    expect(result.success).toBe(false);
  });
});

describe("updateTaskSchema", () => {
  it("accepts defaultBillableForTimeEntries as the only update field", () => {
    const result = updateTaskSchema.parse({
      defaultBillableForTimeEntries: false,
    });

    expect(result.defaultBillableForTimeEntries).toBe(false);
  });
});

describe("backfillTaskBillableDefaultSchema", () => {
  it("accepts selected time-entry backfill", () => {
    const result = backfillTaskBillableDefaultSchema.parse({
      updateTimeEntries: true,
    });

    expect(result.updateTimeEntries).toBe(true);
  });

  it("rejects unselected time-entry backfill", () => {
    const result = backfillTaskBillableDefaultSchema.safeParse({
      updateTimeEntries: false,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["updateTimeEntries"]);
  });

  it("accepts backfill response count", () => {
    const result = taskBillableDefaultBackfillResponseSchema.parse({
      timeEntriesUpdated: 3,
    });

    expect(result.timeEntriesUpdated).toBe(3);
  });
});
