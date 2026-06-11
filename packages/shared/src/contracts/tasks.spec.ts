import { describe, expect, it } from "vitest";

import { taskResponseSchema } from "./tasks.js";

const baseTaskResponse = {
  id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
  workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9000",
  projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002",
  title: "Improve reports filters",
  status: "open",
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
  });
});
