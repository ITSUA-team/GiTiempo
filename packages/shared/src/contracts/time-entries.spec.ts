import { describe, expect, it } from "vitest";

import { updateTimeEntrySchema } from "./time-entries.js";

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
