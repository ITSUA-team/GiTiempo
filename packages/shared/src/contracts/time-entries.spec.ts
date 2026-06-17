import { describe, expect, it } from "vitest";

import {
  createManualTimeEntrySchema,
  startTimerSchema,
  timeEntryResponseSchema,
  updateTimeEntrySchema,
} from "./time-entries.js";

describe("timeEntryResponseSchema", () => {
  it("accepts stable github issue linkage on time entry responses", () => {
    const result = timeEntryResponseSchema.parse({
      id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002",
      workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9000",
      taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
      projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
      userId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9003",
      startedAt: "2026-04-21T09:00:00.000Z",
      endedAt: null,
      durationSeconds: null,
      description: null,
      isBillable: true,
      source: "extension",
      createdAt: "2026-04-21T09:00:00.000Z",
      updatedAt: "2026-04-21T09:00:00.000Z",
      project: {
        id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
        name: "octo/repo",
      },
      task: {
        id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
        title: "Improve reports filters",
      },
      user: {
        id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9003",
        email: "alexey@example.com",
        displayName: "Alexey Tsukanov",
        avatarUrl: null,
      },
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
    const result = timeEntryResponseSchema.parse({
      id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002",
      workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9000",
      taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
      projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
      userId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9003",
      startedAt: "2026-04-21T09:00:00.000Z",
      endedAt: null,
      durationSeconds: null,
      description: null,
      isBillable: true,
      source: "web",
      createdAt: "2026-04-21T09:00:00.000Z",
      updatedAt: "2026-04-21T09:00:00.000Z",
      project: {
        id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
        name: "Project Orion",
      },
      task: {
        id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
        title: "Improve reports filters",
      },
      user: {
        id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9003",
        email: "alexey@example.com",
        displayName: "Alexey Tsukanov",
        avatarUrl: null,
      },
      githubIssue: null,
    });

    expect(result.githubIssue).toBeNull();
  });
});

describe("updateTimeEntrySchema", () => {
  it("accepts task reassignment by task id", () => {
    const result = updateTimeEntrySchema.parse({
      taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
    });

    expect(result.taskId).toBe("018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001");
  });

  it("rejects invalid task ids", () => {
    const result = updateTimeEntrySchema.safeParse({ taskId: "not-a-uuid" });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["taskId"]);
  });

  it("rejects embedded task or project objects", () => {
    const result = updateTimeEntrySchema.safeParse({
      task: { id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001" },
      taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("Unrecognized key");
  });

  it("rejects unknown fields", () => {
    const result = updateTimeEntrySchema.safeParse({
      description: "Updated",
      unknown: true,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("Unrecognized key");
  });
});

describe("createManualTimeEntrySchema", () => {
  const validManualEntry = {
    endedAt: "2026-04-21T10:00:00.000Z",
    startedAt: "2026-04-21T09:00:00.000Z",
    taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
  };

  it("accepts manual create payloads without isBillable", () => {
    const result = createManualTimeEntrySchema.parse(validManualEntry);

    expect(result.isBillable).toBeUndefined();
  });

  it("accepts manual create payloads with isBillable override", () => {
    const result = createManualTimeEntrySchema.parse({
      ...validManualEntry,
      isBillable: false,
    });

    expect(result.isBillable).toBe(false);
  });
});

describe("startTimerSchema", () => {
  it("accepts start payloads without a description", () => {
    const result = startTimerSchema.parse({
      taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
    });

    expect(result).toEqual({
      taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
    });
  });

  it("accepts a string description", () => {
    const result = startTimerSchema.parse({
      description: "Investigate release blocker",
      taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
    });

    expect(result.description).toBe("Investigate release blocker");
  });

  it("accepts a null description", () => {
    const result = startTimerSchema.parse({
      description: null,
      taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
    });

    expect(result.description).toBeNull();
  });

  it("rejects unknown fields", () => {
    const result = startTimerSchema.safeParse({
      taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
      unknown: true,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("Unrecognized key");
  });

  it("rejects billable overrides", () => {
    const result = startTimerSchema.safeParse({
      isBillable: true,
      taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toContain("Unrecognized key");
  });

  it("rejects descriptions over the contract limit", () => {
    const result = startTimerSchema.safeParse({
      description: "x".repeat(2001),
      taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["description"]);
  });
});
