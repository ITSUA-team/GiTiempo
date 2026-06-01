import type { TimeEntryResponse } from "@gitiempo/shared";
import { describe, expect, it } from "vitest";

import {
  buildDashboardStats,
  buildDashboardWeeklyFocus,
  getDashboardWeekWindow,
  mapDashboardRecentEntryRows,
} from "@/lib/dashboard-overview-helpers";

function createEntry(overrides: Partial<TimeEntryResponse> = {}): TimeEntryResponse {
  const { githubIssue = null, ...entryOverrides } = overrides;

  return {
    createdAt: "2026-04-21T09:00:00.000Z",
    description: null,
    durationSeconds: 3600,
    endedAt: "2026-04-21T10:00:00.000Z",
    id: "entry-1",
    isBillable: false,
    project: { id: "project-1", name: "Project Orion" },
    projectId: "project-1",
    source: "web",
    startedAt: "2026-04-21T09:00:00.000Z",
    task: { id: "task-1", title: "Improve reports filters" },
    taskId: "task-1",
    updatedAt: "2026-04-21T10:00:00.000Z",
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

describe("dashboard-overview-helpers", () => {
  it("builds dashboard week windows from UTC ISO weeks", () => {
    expect(getDashboardWeekWindow(Date.parse("2026-04-26T23:30:00.000Z"))).toEqual({
      dateFrom: "2026-04-20T00:00:00.000Z",
      dateTo: "2026-04-27T00:00:00.000Z",
    });
  });

  it("builds stats and top weekly focus from tracked entries", () => {
    const nowMs = Date.parse("2026-04-21T12:00:00.000Z");
    const entries = [
      createEntry(),
      createEntry({
        durationSeconds: 5400,
        endedAt: "2026-04-21T11:30:00.000Z",
        id: "entry-2",
        project: { id: "project-2", name: "Billing API" },
        projectId: "project-2",
        startedAt: "2026-04-21T10:00:00.000Z",
        task: { id: "task-2", title: "Fix export column order" },
        taskId: "task-2",
      }),
    ];

    expect(buildDashboardStats(entries, nowMs)).toEqual([
      {
        description: "2 projects tracked today",
        label: "Today",
        value: "2h 30m",
      },
      {
        description: "2 entries tracked this week",
        label: "This Week",
        value: "2h 30m",
      },
      {
        description: "2 projects received tracked time",
        label: "Projects This Week",
        value: "2",
      },
    ]);
    expect(buildDashboardWeeklyFocus(entries, nowMs)).toEqual({
      project: expect.objectContaining({
        description: "1h 30m tracked across 1 entry",
        shareLabel: "60% of your tracked time this week",
        sharePercent: 60,
        title: "Billing API",
      }),
      task: expect.objectContaining({
        description: "Billing API • 1h 30m tracked",
        shareLabel: "1 entry contributed to this focus",
        sharePercent: 60,
        title: "Fix export column order",
      }),
    });
  });

  it("maps recent entries to display rows with running duration labels", () => {
    const nowMs = Date.parse("2026-04-21T12:00:00.000Z");
    const rows = mapDashboardRecentEntryRows(
      [
        createEntry({
          durationSeconds: null,
          endedAt: null,
          id: "entry-running",
          startedAt: "2026-04-21T11:00:00.000Z",
        }),
        createEntry({ id: "entry-completed" }),
      ],
      nowMs,
    );

    expect(rows).toEqual([
      {
        durationLabel: "01:00:00",
        id: "entry-running",
        isHighlighted: true,
        projectName: "Project Orion",
        taskTitle: "Improve reports filters",
        timeRangeLabel: "11:00 - Running",
      },
      {
        durationLabel: "1h",
        id: "entry-completed",
        isHighlighted: false,
        projectName: "Project Orion",
        taskTitle: "Improve reports filters",
        timeRangeLabel: "09:00 - 10:00",
      },
    ]);
  });

  it("does not highlight completed rows just because they are first", () => {
    const rows = mapDashboardRecentEntryRows(
      [
        createEntry({ id: "entry-completed-first" }),
        createEntry({ id: "entry-completed-second" }),
      ],
      Date.parse("2026-04-21T12:00:00.000Z"),
    );

    expect(rows[0]?.isHighlighted).toBe(false);
    expect(rows[1]?.isHighlighted).toBe(false);
  });
});
