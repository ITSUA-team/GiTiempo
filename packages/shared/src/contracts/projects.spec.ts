import { describe, expect, it } from "vitest";

import {
  backfillProjectBillableDefaultSchema,
  createProjectSchema,
  projectBillableDefaultBackfillResponseSchema,
  projectDetailResponseSchema,
  projectListResponseSchema,
  updateProjectSchema,
} from "./projects.js";

const baseProject = {
  color: null,
  createdAt: "2026-05-01T10:00:00.000Z",
  description: null,
  defaultBillableForTasks: true,
  id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
  isActive: true,
  members: [],
  name: "Project Orion",
  source: "manual",
  totalSeconds: 43200,
  updatedAt: "2026-05-01T10:00:00.000Z",
  visibility: "public",
  workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9000",
};

describe("projectListResponseSchema", () => {
  it("accepts projects with integer total seconds", () => {
    const result = projectListResponseSchema.parse([baseProject]);

    expect(result[0]?.totalSeconds).toBe(43200);
    expect(result[0]?.defaultBillableForTasks).toBe(true);
  });

  it("requires totalSeconds even when legacy totalHours is present", () => {
    const result = projectListResponseSchema.safeParse([
      {
        ...baseProject,
        totalHours: 12,
        totalSeconds: undefined,
      },
    ]);

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([0, "totalSeconds"]);
  });
});

describe("createProjectSchema", () => {
  it("accepts existing manual create payloads", () => {
    const result = createProjectSchema.parse({
      name: "Project Orion",
      visibility: "private",
    });

    expect(result).toEqual({
      name: "Project Orion",
      visibility: "private",
    });
  });

  it("accepts defaultBillableForTasks", () => {
    const result = createProjectSchema.parse({
      defaultBillableForTasks: false,
      name: "Project Orion",
    });

    expect(result.defaultBillableForTasks).toBe(false);
  });

  it("rejects non-boolean defaultBillableForTasks", () => {
    const result = createProjectSchema.safeParse({
      defaultBillableForTasks: "false",
      name: "Project Orion",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["defaultBillableForTasks"]);
  });

  it("accepts GitHub repository provider references", () => {
    const result = createProjectSchema.parse({
      name: "octo-org/repo",
      providerReference: {
        provider: "github",
        externalType: "repository",
        externalId: "123",
        externalKey: "octo-org/repo",
        externalUrl: "https://github.com/octo-org/repo",
        metadata: { description: "Repository project" },
      },
    });

    expect(result.providerReference?.externalType).toBe("repository");
  });

  it("accepts GitHub Project V2 provider references", () => {
    const result = createProjectSchema.parse({
      name: "Roadmap",
      providerReference: {
        provider: "github",
        externalType: "project_v2",
        externalId: "PVT_kwDO",
        externalKey: "PVT_kwDO",
        externalUrl: "https://github.com/orgs/octo-org/projects/7",
        metadata: { title: "Roadmap" },
      },
    });

    expect(result.providerReference?.externalType).toBe("project_v2");
  });

  it("rejects unsupported provider references", () => {
    const result = createProjectSchema.safeParse({
      name: "Project Orion",
      providerReference: {
        provider: "linear",
        externalType: "repository",
        externalKey: "LIN-1",
        externalUrl: "https://linear.app/team/issue/LIN-1",
      },
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([
      "providerReference",
      "provider",
    ]);
  });

  it("rejects unknown create fields", () => {
    const result = createProjectSchema.safeParse({
      name: "Project Orion",
      providerReference: {
        provider: "github",
        externalType: "repository",
        externalKey: "octo-org/repo",
        externalUrl: "https://github.com/octo-org/repo",
      },
      source: "github",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual([]);
  });
});

describe("updateProjectSchema", () => {
  it("accepts defaultBillableForTasks as the only update field", () => {
    const result = updateProjectSchema.parse({
      defaultBillableForTasks: false,
    });

    expect(result.defaultBillableForTasks).toBe(false);
  });
});

describe("backfillProjectBillableDefaultSchema", () => {
  it("accepts selected downstream record types", () => {
    const result = backfillProjectBillableDefaultSchema.parse({
      updateTasks: true,
      updateTimeEntries: true,
    });

    expect(result).toEqual({ updateTasks: true, updateTimeEntries: true });
  });

  it("rejects requests with no selected record type", () => {
    const result = backfillProjectBillableDefaultSchema.safeParse({
      updateTasks: false,
      updateTimeEntries: false,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "At least one existing record type must be selected",
    );
  });

  it("accepts backfill response counts", () => {
    const result = projectBillableDefaultBackfillResponseSchema.parse({
      tasksUpdated: 2,
      timeEntriesUpdated: 3,
    });

    expect(result.tasksUpdated).toBe(2);
    expect(result.timeEntriesUpdated).toBe(3);
  });
});

describe("projectDetailResponseSchema", () => {
  it("accepts project detail responses with tracked summary seconds", () => {
    const result = projectDetailResponseSchema.parse({
      ...baseProject,
      assignedMembersSummary: {
        count: 0,
        previewMembers: [],
        remainingCount: 0,
      },
      providerSummary: {
        externalKey: null,
        externalType: null,
        externalUrl: null,
        source: "manual",
      },
      trackedSummary: {
        billableSeconds: 21600,
        billableShare: 0.5,
        lastActivityAt: "2026-05-02T10:00:00.000Z",
        totalSeconds: 43200,
      },
    });

    expect(result.totalSeconds).toBe(43200);
    expect(result.trackedSummary.totalSeconds).toBe(43200);
  });
});
