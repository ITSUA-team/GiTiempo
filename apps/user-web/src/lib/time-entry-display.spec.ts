import type { TimeEntryResponse } from "@gitiempo/shared";
import { describe, expect, it } from "vitest";

import {
  addUtcDays,
  formatCompactDuration,
  formatElapsedDuration,
  formatRecentEntryDuration,
  formatRecentEntryTimeRange,
  formatRunningDuration,
  formatTimeEntryDuration,
  formatTimeEntryTimeRange,
  formatUtcDayLabel,
  formatUtcTime,
  getEntryTrackedSecondsWithinRange,
  getUtcDateKey,
  groupTimeEntriesByUtcDay,
  nextUtcDay,
  startOfUtcDay,
  startOfUtcIsoWeek,
} from "@/lib/time-entry-display";

function createEntry(overrides: Partial<TimeEntryResponse> = {}): TimeEntryResponse {
  const { githubIssue = null, ...entryOverrides } = overrides;

  return {
    createdAt: "2026-04-21T09:00:00.000Z",
    description: null,
    durationSeconds: 5400,
    endedAt: "2026-04-21T10:30:00.000Z",
    id: "entry-1",
    isBillable: false,
    project: { id: "project-1", name: "Project Orion" },
    projectId: "project-1",
    source: "manual",
    startedAt: "2026-04-21T09:00:00.000Z",
    task: { id: "task-1", title: "Improve reports filters" },
    taskId: "task-1",
    updatedAt: "2026-04-21T10:30:00.000Z",
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

describe("time-entry-display", () => {
  it("formats UTC dates and duration labels", () => {
    const nowMs = Date.parse("2026-04-21T12:00:00.000Z");

    expect(getUtcDateKey("2026-04-21T23:59:00.000Z")).toBe("2026-04-21");
    expect(formatUtcTime("2026-04-21T09:05:00.000Z")).toBe("09:05");
    expect(formatUtcDayLabel("2026-04-21", nowMs)).toBe("Today, Apr 21");
    expect(formatUtcDayLabel("2026-04-20", nowMs)).toBe("Yesterday, Apr 20");
    expect(formatUtcDayLabel("2026-04-01", nowMs)).toBe("Apr 1");
    expect(formatCompactDuration(null)).toBe("0m");
    expect(formatCompactDuration(59)).toBe("1m");
    expect(formatCompactDuration(7200)).toBe("2h");
    expect(formatCompactDuration(8100)).toBe("2h 15m");
    expect(formatElapsedDuration(3661)).toBe("01:01:01");
    expect(formatRunningDuration("2026-04-21T11:59:58.000Z", nowMs)).toBe("00:00:02");
  });

  it("calculates UTC day and ISO week windows", () => {
    const date = new Date("2026-04-26T23:30:00.000Z");

    expect(startOfUtcDay(date).toISOString()).toBe("2026-04-26T00:00:00.000Z");
    expect(nextUtcDay(date).toISOString()).toBe("2026-04-27T00:00:00.000Z");
    expect(startOfUtcIsoWeek(date).toISOString()).toBe("2026-04-20T00:00:00.000Z");
    expect(addUtcDays(startOfUtcIsoWeek(date), 7).toISOString()).toBe("2026-04-27T00:00:00.000Z");
  });

  it("groups entries by UTC start day and preserves existing item order", () => {
    const nowMs = Date.parse("2026-04-21T12:00:00.000Z");
    const groups = groupTimeEntriesByUtcDay(
      [
        createEntry({ id: "entry-1", startedAt: "2026-04-21T09:00:00.000Z" }),
        createEntry({ id: "entry-2", startedAt: "2026-04-20T09:00:00.000Z" }),
        createEntry({ id: "entry-3", startedAt: "2026-04-21T11:00:00.000Z" }),
      ],
      nowMs,
    );

    expect(groups).toEqual([
      expect.objectContaining({
        dateKey: "2026-04-21",
        heading: "Today, Apr 21",
        items: [expect.objectContaining({ id: "entry-1" }), expect.objectContaining({ id: "entry-3" })],
      }),
      expect.objectContaining({
        dateKey: "2026-04-20",
        heading: "Yesterday, Apr 20",
        items: [expect.objectContaining({ id: "entry-2" })],
      }),
    ]);
  });

  it("formats completed and running entry rows", () => {
    const nowMs = Date.parse("2026-04-21T11:00:05.000Z");
    const completedEntry = createEntry();
    const runningEntry = createEntry({
      durationSeconds: null,
      endedAt: null,
      startedAt: "2026-04-21T09:00:00.000Z",
    });

    expect(formatTimeEntryDuration(completedEntry, nowMs)).toBe("1h 30m");
    expect(formatTimeEntryDuration(runningEntry, nowMs)).toBe("02:00:05");
    expect(formatTimeEntryTimeRange(completedEntry)).toBe("09:00 - 10:30");
    expect(formatTimeEntryTimeRange(runningEntry)).toBe("09:00 - Running");
    expect(formatRecentEntryDuration(runningEntry, nowMs)).toBe("02:00:05");
    expect(formatRecentEntryTimeRange(runningEntry)).toBe("09:00 - Running");
  });

  it("counts only the entry overlap inside a requested time range", () => {
    const nowMs = Date.parse("2026-04-21T11:30:00.000Z");
    const runningEntry = createEntry({
      durationSeconds: null,
      endedAt: null,
      startedAt: "2026-04-21T10:30:00.000Z",
    });

    expect(
      getEntryTrackedSecondsWithinRange(
        runningEntry,
        Date.parse("2026-04-21T11:00:00.000Z"),
        Date.parse("2026-04-21T12:00:00.000Z"),
        nowMs,
      ),
    ).toBe(1800);
    expect(
      getEntryTrackedSecondsWithinRange(
        runningEntry,
        Date.parse("2026-04-21T12:00:00.000Z"),
        Date.parse("2026-04-21T13:00:00.000Z"),
        nowMs,
      ),
    ).toBe(0);
  });
});
