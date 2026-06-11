import type { TimeEntryResponse } from "@gitiempo/shared";
import { describe, expect, it } from "vitest";

import {
  formatElapsedTime,
  isRunningTimer,
  toSelectedTaskContext,
} from "@/lib/top-bar-timer-helpers";

function createEntry(overrides: Partial<TimeEntryResponse> = {}): TimeEntryResponse {
  const { githubIssue = null, ...entryOverrides } = overrides;

  return {
    createdAt: "2026-04-21T09:00:00.000Z",
    description: null,
    durationSeconds: null,
    endedAt: null,
    id: "running-entry",
    isBillable: true,
    project: { id: "project-1", name: "Project Orion" },
    projectId: "project-1",
    source: "web",
    startedAt: "2026-04-21T09:00:00.000Z",
    task: { id: "task-1", title: "Improve reports filters" },
    taskId: "task-1",
    updatedAt: "2026-04-21T09:00:00.000Z",
    user: {
      avatarUrl: null,
      displayName: "Alexey Tsukanov",
      email: "alexey@example.com",
      id: "user-1",
    },
    userId: "user-1",
    workspaceId: "workspace-1",
    githubIssue,
    ...entryOverrides,
  };
}

describe("top-bar-timer-helpers", () => {
  it("formats elapsed timer labels from the reactive clock input", () => {
    expect(formatElapsedTime(null, Date.parse("2026-04-21T10:00:00.000Z"))).toBe("00:00:00");
    expect(
      formatElapsedTime(
        "2026-04-21T09:00:00.000Z",
        Date.parse("2026-04-21T10:00:02.000Z"),
      ),
    ).toBe("01:00:02");
  });

  it("maps running timer state to selected task context", () => {
    const runningEntry = createEntry();
    const completedEntry = createEntry({ durationSeconds: 3600, endedAt: "2026-04-21T10:00:00.000Z" });

    expect(isRunningTimer(runningEntry)).toBe(true);
    expect(isRunningTimer(completedEntry)).toBe(false);
    expect(isRunningTimer(null)).toBe(false);
    expect(toSelectedTaskContext(runningEntry)).toEqual({
      githubIssue: null,
      projectId: "project-1",
      projectName: "Project Orion",
      taskId: "task-1",
      taskTitle: "Improve reports filters",
    });
  });
});
