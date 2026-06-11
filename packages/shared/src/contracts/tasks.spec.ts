import { describe, expect, it } from "vitest";

import {
  createTaskSchema,
  taskResponseSchema,
  updateTaskSchema,
} from "./tasks.js";

const taskAssignee = {
  avatarUrl: null,
  displayName: "Alexey Tsukanov",
  email: "alexey@example.com",
  role: "member",
  userId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9003",
};

const baseTask = {
  assignee: taskAssignee,
  createdAt: "2026-05-01T10:00:00.000Z",
  description: "Ship the requested Projects task metadata fields.",
  id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
  isActive: true,
  priority: "high",
  projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002",
  status: "open",
  title: "Improve project task modal",
  updatedAt: "2026-05-01T10:00:00.000Z",
  workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9000",
};

describe("taskResponseSchema", () => {
  it("accepts task metadata including nullable description and assignee", () => {
    const result = taskResponseSchema.parse({
      ...baseTask,
      assignee: null,
      description: null,
      priority: "medium",
    });

    expect(result.description).toBeNull();
    expect(result.assignee).toBeNull();
    expect(result.priority).toBe("medium");
  });

  it("rejects invalid priority values", () => {
    const result = taskResponseSchema.safeParse({
      ...baseTask,
      priority: "urgent",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["priority"]);
  });
});

describe("createTaskSchema", () => {
  it("accepts task metadata on create", () => {
    const result = createTaskSchema.parse({
      assigneeId: taskAssignee.userId,
      description: "Clarify remaining modal fields.",
      priority: "low",
      status: "closed",
      title: "Project task metadata",
    });

    expect(result).toEqual({
      assigneeId: taskAssignee.userId,
      description: "Clarify remaining modal fields.",
      priority: "low",
      status: "closed",
      title: "Project task metadata",
    });
  });

  it("accepts create payloads without optional metadata", () => {
    const result = createTaskSchema.parse({ title: "Project task metadata" });

    expect(result).toEqual({ title: "Project task metadata" });
  });

  it("accepts nullable description and assignee on create", () => {
    const result = createTaskSchema.parse({
      assigneeId: null,
      description: null,
      title: "Project task metadata",
    });

    expect(result.assigneeId).toBeNull();
    expect(result.description).toBeNull();
  });

  it("rejects create descriptions over the contract limit", () => {
    const result = createTaskSchema.safeParse({
      description: "x".repeat(2001),
      title: "Project task metadata",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["description"]);
  });

  it("rejects unknown create fields", () => {
    const result = createTaskSchema.safeParse({
      title: "Project task metadata",
      unexpected: true,
    });

    expect(result.success).toBe(false);
  });
});

describe("updateTaskSchema", () => {
  it("accepts task metadata on update", () => {
    const result = updateTaskSchema.parse({
      assigneeId: taskAssignee.userId,
      description: "Updated scope notes.",
      isActive: true,
      priority: "high",
      status: "open",
      title: "Updated task",
    });

    expect(result.priority).toBe("high");
    expect(result.assigneeId).toBe(taskAssignee.userId);
  });

  it("accepts nullable description and assignee on update", () => {
    const result = updateTaskSchema.parse({
      assigneeId: null,
      description: null,
    });

    expect(result.assigneeId).toBeNull();
    expect(result.description).toBeNull();
  });

  it("rejects empty update payloads", () => {
    const result = updateTaskSchema.safeParse({});

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "At least one field must be provided",
    );
  });

  it("rejects unknown update fields", () => {
    const result = updateTaskSchema.safeParse({ unexpected: true });

    expect(result.success).toBe(false);
  });
});
