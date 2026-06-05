import { describe, expect, it } from "vitest";

import {
  projectDetailResponseSchema,
  projectListResponseSchema,
} from "./projects.js";

const baseProject = {
  color: null,
  createdAt: "2026-05-01T10:00:00.000Z",
  description: null,
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
