import { describe, expect, it } from "vitest";

import {
  updateWorkspaceSettingsSchema,
  workspaceSettingsResponseSchema,
} from "./workspaces.js";

const settingsResponse = {
  id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
  workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002",
  currency: "USD",
  defaultHourlyRate: 100,
  timeZone: "UTC",
  createdAt: "2026-05-01T00:00:00.000Z",
  updatedAt: "2026-05-01T00:00:00.000Z",
};

describe("workspaceSettingsResponseSchema", () => {
  it("accepts valid workspace settings with a time zone", () => {
    const result = workspaceSettingsResponseSchema.parse(settingsResponse);

    expect(result.timeZone).toBe("UTC");
  });

  it("rejects invalid response time zones", () => {
    const result = workspaceSettingsResponseSchema.safeParse({
      ...settingsResponse,
      timeZone: "Not/AZone",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["timeZone"]);
  });
});

describe("updateWorkspaceSettingsSchema", () => {
  it("accepts valid time zone updates", () => {
    const result = updateWorkspaceSettingsSchema.parse({
      timeZone: "Europe/Kyiv",
    });

    expect(result.timeZone).toBe("Europe/Kyiv");
  });

  it("rejects invalid time zone updates", () => {
    const result = updateWorkspaceSettingsSchema.safeParse({
      timeZone: "Not/AZone",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["timeZone"]);
  });

  it("accepts timeZone as the only updated field", () => {
    const result = updateWorkspaceSettingsSchema.safeParse({
      timeZone: "America/New_York",
    });

    expect(result.success).toBe(true);
  });
});
