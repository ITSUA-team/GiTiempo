import type { TimeEntryResponse } from "@gitiempo/shared";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  buildDashboardStats,
  buildDashboardWeeklyFocus,
  getDashboardPeriodWindow,
  getDashboardWeekWindow,
  mapDashboardRecentEntryRows,
  type DashboardFocusPeriod,
} from "@/lib/dashboard-overview-helpers";
import { getEntryTrackedSecondsWithinRange } from "@/lib/time-entry-display";

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
    workspace: { id: "workspace-1", name: "Workspace Alpha" },
    workspaceId: "workspace-1",
    githubIssue,
    invoiceId: null,
    ...entryOverrides,
  };
}

describe("dashboard-overview-helpers", () => {
  beforeAll(() => {
    vi.stubEnv("TZ", "Europe/Kiev");
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("builds dashboard week windows from browser-local Monday weeks", () => {
    const now = new Date(2026, 3, 26, 23, 30, 0, 0);

    expect(getDashboardWeekWindow(now.getTime())).toEqual({
      dateFrom: new Date(2026, 3, 20, 0, 0, 0, 0).toISOString(),
      dateTo: new Date(2026, 3, 27, 0, 0, 0, 0).toISOString(),
    });
  });

  it("builds period windows with inclusive local starts and exclusive ends", () => {
    const now = new Date(2026, 3, 21, 12, 0, 0, 0).getTime();

    expect(getDashboardPeriodWindow("day", now)).toEqual({
      dateFrom: new Date(2026, 3, 21, 0, 0, 0, 0).toISOString(),
      dateTo: new Date(2026, 3, 22, 0, 0, 0, 0).toISOString(),
    });
    expect(getDashboardPeriodWindow("week", now)).toEqual({
      dateFrom: new Date(2026, 3, 20, 0, 0, 0, 0).toISOString(),
      dateTo: new Date(2026, 3, 27, 0, 0, 0, 0).toISOString(),
    });
    expect(getDashboardPeriodWindow("month", now)).toEqual({
      dateFrom: new Date(2026, 3, 1, 0, 0, 0, 0).toISOString(),
      dateTo: new Date(2026, 4, 1, 0, 0, 0, 0).toISOString(),
    });
  });

  it("keeps period window boundaries stable across DST transitions", () => {
    const springDstNow = new Date(2026, 2, 15, 12, 0, 0, 0).getTime();

    expect(getDashboardPeriodWindow("month", springDstNow)).toEqual({
      dateFrom: new Date(2026, 2, 1, 0, 0, 0, 0).toISOString(),
      dateTo: new Date(2026, 3, 1, 0, 0, 0, 0).toISOString(),
    });
    expect(getDashboardPeriodWindow("week", springDstNow)).toEqual({
      dateFrom: new Date(2026, 2, 9, 0, 0, 0, 0).toISOString(),
      dateTo: new Date(2026, 2, 16, 0, 0, 0, 0).toISOString(),
    });

    const afterSpringForwardWeek = new Date(2026, 2, 30, 12, 0, 0, 0).getTime();

    expect(getDashboardPeriodWindow("day", afterSpringForwardWeek)).toEqual({
      dateFrom: new Date(2026, 2, 30, 0, 0, 0, 0).toISOString(),
      dateTo: new Date(2026, 2, 31, 0, 0, 0, 0).toISOString(),
    });
    expect(getDashboardPeriodWindow("week", afterSpringForwardWeek)).toEqual({
      dateFrom: new Date(2026, 2, 30, 0, 0, 0, 0).toISOString(),
      dateTo: new Date(2026, 3, 6, 0, 0, 0, 0).toISOString(),
    });

    const fallDstNow = new Date(2026, 9, 28, 12, 0, 0, 0).getTime();

    expect(getDashboardPeriodWindow("week", fallDstNow)).toEqual({
      dateFrom: new Date(2026, 9, 26, 0, 0, 0, 0).toISOString(),
      dateTo: new Date(2026, 10, 2, 0, 0, 0, 0).toISOString(),
    });

    const yearEndNow = new Date(2026, 11, 31, 23, 30, 0, 0).getTime();

    expect(getDashboardPeriodWindow("month", yearEndNow)).toEqual({
      dateFrom: new Date(2026, 11, 1, 0, 0, 0, 0).toISOString(),
      dateTo: new Date(2027, 0, 1, 0, 0, 0, 0).toISOString(),
    });
  });

  it("encodes nav-URL-compatible boundaries: inclusive start, exclusive end for every period", () => {
    const periods: DashboardFocusPeriod[] = ["day", "week", "month"];
    const now = new Date(2026, 3, 21, 12, 0, 0, 0).getTime();

    for (const period of periods) {
      const window = getDashboardPeriodWindow(period, now);
      const windowStart = Date.parse(window.dateFrom);
      const windowEnd = Date.parse(window.dateTo);

      expect(getDashboardPeriodWindow(period, windowStart + 1)).toEqual(window);
      expect(getDashboardPeriodWindow(period, windowEnd - 1)).toEqual(window);
      expect(getDashboardPeriodWindow(period, windowEnd)).not.toEqual(window);
      expect(window.dateFrom).toBe(new Date(windowStart).toISOString());
      expect(window.dateTo).toBe(new Date(windowEnd).toISOString());

      const inRangeEntry = createEntry({
        endedAt: new Date(windowStart + 3_600_000).toISOString(),
        startedAt: new Date(windowStart).toISOString(),
      });
      const atEndEntry = createEntry({
        id: "entry-at-end",
        startedAt: window.dateTo,
      });

      expect(getEntryTrackedSecondsWithinRange(inRangeEntry, windowStart, windowEnd, now)).toBe(
        3600,
      );
      expect(getEntryTrackedSecondsWithinRange(atEndEntry, windowStart, windowEnd, now)).toBe(0);
    }
  });

  it("builds stats and top weekly focus from browser-local day and week windows", () => {
    const nowMs = new Date(2026, 3, 21, 12, 0, 0, 0).getTime();
    const entries = [
      createEntry(),
      createEntry({
        durationSeconds: 5400,
        endedAt: "2026-04-21T11:30:00.000Z",
        githubIssue: {
          githubRepo: "octo/repo",
          issueNumber: 184,
        },
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
        githubIssue: {
          githubRepo: "octo/repo",
          issueNumber: 184,
        },
        shareLabel: "1 entry contributed to this focus",
        sharePercent: 60,
        title: "Fix export column order",
      }),
    });
  });

  it("counts entries that cross a UTC day boundary inside the current local day", () => {
    const nowMs = new Date(2026, 3, 21, 12, 0, 0, 0).getTime();
    const crossingEntry = createEntry({
      durationSeconds: 3600,
      endedAt: new Date(2026, 3, 21, 1, 15, 0, 0).toISOString(),
      startedAt: new Date(2026, 3, 21, 0, 15, 0, 0).toISOString(),
    });

    expect(buildDashboardStats([crossingEntry], nowMs)).toEqual([
      {
        description: "1 project tracked today",
        label: "Today",
        value: "1h",
      },
      {
        description: "1 entry tracked this week",
        label: "This Week",
        value: "1h",
      },
      {
        description: "1 project received tracked time",
        label: "Projects This Week",
        value: "1",
      },
    ]);
  });

  it("maps recent entries to display rows with running duration labels", () => {
    const nowMs = Date.parse("2026-04-21T12:00:00.000Z");
    const runningEntry = createEntry({
      durationSeconds: null,
      endedAt: null,
      githubIssue: {
        githubRepo: "octo/repo",
        issueNumber: 185,
      },
      id: "entry-running",
      startedAt: "2026-04-21T11:00:00.000Z",
    });
    const completedEntry = createEntry({ id: "entry-completed" });
    const rows = mapDashboardRecentEntryRows(
      [runningEntry, completedEntry],
      nowMs,
    );

    expect(rows).toEqual([
      {
        description: null,
        durationLabel: "01:00:00",
        entry: runningEntry,
        githubIssue: {
          githubRepo: "octo/repo",
          issueNumber: 185,
        },
        id: "entry-running",
        isHighlighted: true,
        projectName: "Project Orion",
        timerEntry: {
          endedAt: null,
          id: "entry-running",
          task: { title: "Improve reports filters" },
          taskId: "task-1",
        },
        taskTitle: "Improve reports filters",
        timeRangeLabel: "14:00 - Running",
      },
      {
        description: null,
        durationLabel: "1h",
        entry: completedEntry,
        githubIssue: null,
        id: "entry-completed",
        isHighlighted: false,
        projectName: "Project Orion",
        timerEntry: {
          endedAt: "2026-04-21T10:00:00.000Z",
          id: "entry-completed",
          task: { title: "Improve reports filters" },
          taskId: "task-1",
        },
        taskTitle: "Improve reports filters",
        timeRangeLabel: "12:00 - 13:00",
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

  it("aggregates weekly focus over the day window when the Day period is selected", () => {
    const nowMs = new Date(2026, 3, 21, 12, 0, 0, 0).getTime();
    const entries = [
      createEntry({
        durationSeconds: 1800,
        endedAt: "2026-04-21T09:30:00.000Z",
        id: "entry-today-1",
        project: { id: "project-day", name: "Focus App" },
        projectId: "project-day",
        startedAt: "2026-04-21T09:00:00.000Z",
        task: { id: "task-day", title: "Ship onboarding" },
        taskId: "task-day",
      }),
      createEntry({
        endedAt: "2026-04-20T11:00:00.000Z",
        id: "entry-yesterday",
        project: { id: "project-week", name: "Legacy API" },
        projectId: "project-week",
        startedAt: "2026-04-20T10:00:00.000Z",
        task: { id: "task-week", title: "Old work" },
        taskId: "task-week",
      }),
    ];

    expect(buildDashboardWeeklyFocus(entries, nowMs, "day")).toEqual({
      project: expect.objectContaining({
        description: "30m tracked across 1 entry",
        shareLabel: "100% of your tracked time today",
        title: "Focus App",
      }),
      task: expect.objectContaining({
        description: "Focus App • 30m tracked",
        shareLabel: "1 entry contributed to this focus",
        title: "Ship onboarding",
      }),
    });
  });

  it("aggregates weekly focus over the calendar-month window when the Month period is selected", () => {
    const nowMs = new Date(2026, 3, 21, 12, 0, 0, 0).getTime();
    const entries = [
      createEntry({ id: "entry-month-1" }),
      createEntry({
        durationSeconds: 7200,
        endedAt: "2026-04-10T11:00:00.000Z",
        id: "entry-month-2",
        project: { id: "project-month-top", name: "Month Top" },
        projectId: "project-month-top",
        startedAt: "2026-04-10T09:00:00.000Z",
        task: { id: "task-month-top", title: "Month task" },
        taskId: "task-month-top",
      }),
      createEntry({
        endedAt: "2026-03-31T11:00:00.000Z",
        id: "entry-last-month",
        project: { id: "project-previous-month", name: "Previous Month" },
        projectId: "project-previous-month",
        startedAt: "2026-03-31T10:00:00.000Z",
        task: { id: "task-previous-month", title: "Old month task" },
        taskId: "task-previous-month",
      }),
    ];

    expect(buildDashboardWeeklyFocus(entries, nowMs, "month")).toEqual({
      project: expect.objectContaining({
        description: "2h tracked across 1 entry",
        shareLabel: "67% of your tracked time this month",
        sharePercent: 67,
        title: "Month Top",
      }),
      task: expect.objectContaining({
        description: "Month Top • 2h tracked",
        sharePercent: 67,
        title: "Month task",
      }),
    });
  });

  it("keeps focus aggregation at the default week scope when no period is passed", () => {
    const nowMs = new Date(2026, 3, 21, 12, 0, 0, 0).getTime();

    expect(buildDashboardWeeklyFocus([], nowMs)).toEqual({ project: null, task: null });
  });

  it("includes entries started inside the period that extend beyond the exclusive end", () => {
    const nowMs = new Date(2026, 3, 22, 12, 0, 0, 0).getTime();
    const window = getDashboardPeriodWindow("day", nowMs);
    const overnightEntry = createEntry({
      durationSeconds: 7200,
      endedAt: new Date(2026, 3, 22, 1, 0, 0, 0).toISOString(),
      id: "entry-overnight",
      project: { id: "project-overnight", name: "Overnight Ops" },
      projectId: "project-overnight",
      startedAt: new Date(2026, 3, 21, 23, 30, 0, 0).toISOString(),
      task: { id: "task-overnight", title: "Nightly jobs" },
      taskId: "task-overnight",
    });

    expect(getEntryTrackedSecondsWithinRange(overnightEntry, Date.parse(window.dateFrom), Date.parse(window.dateTo), nowMs)).toBe(
      3600,
    );
    expect(buildDashboardWeeklyFocus([overnightEntry], nowMs, "day").project?.title).toBe(
      "Overnight Ops",
    );
  });

  it("clips running timers to the selected period window", () => {
    const nowMs = new Date(2026, 3, 21, 12, 0, 0, 0).getTime();
    const window = getDashboardPeriodWindow("day", nowMs);
    const runningEntry = createEntry({
      durationSeconds: null,
      endedAt: null,
      id: "entry-running-period",
      project: { id: "project-running", name: "Live Tracker" },
      projectId: "project-running",
      startedAt: new Date(2026, 3, 20, 22, 0, 0, 0).toISOString(),
      task: { id: "task-running", title: "Live session" },
      taskId: "task-running",
    });

    expect(getEntryTrackedSecondsWithinRange(runningEntry, Date.parse(window.dateFrom), Date.parse(window.dateTo), nowMs)).toBe(
      12 * 3600,
    );
    expect(buildDashboardWeeklyFocus([runningEntry], nowMs, "day").task?.title).toBe(
      "Live session",
    );
  });

  it("aggregates entries around week and year boundaries in the month window", () => {
    const nowMs = new Date(2027, 0, 5, 12, 0, 0, 0).getTime();
    const window = getDashboardPeriodWindow("month", nowMs);
    const boundaryEntry = createEntry({
      endedAt: new Date(2027, 0, 1, 5, 0, 0, 0).toISOString(),
      id: "entry-new-year",
      project: { id: "project-new-year", name: "Year Start" },
      projectId: "project-new-year",
      startedAt: new Date(2027, 0, 1, 1, 0, 0, 0).toISOString(),
      task: { id: "task-new-year", title: "Release freeze" },
      taskId: "task-new-year",
    });
    const lastYearEntry = createEntry({
      endedAt: "2026-12-30T16:00:00.000Z",
      id: "entry-last-year",
      project: { id: "project-last-year", name: "Last Year" },
      projectId: "project-last-year",
      startedAt: "2026-12-30T15:00:00.000Z",
      task: { id: "task-last-year", title: "December work" },
      taskId: "task-last-year",
    });

    expect(window).toEqual({
      dateFrom: new Date(2027, 0, 1, 0, 0, 0, 0).toISOString(),
      dateTo: new Date(2027, 1, 1, 0, 0, 0, 0).toISOString(),
    });
    expect(buildDashboardWeeklyFocus([boundaryEntry, lastYearEntry], nowMs, "month").project?.title).toBe(
      "Year Start",
    );
  });

  it("includes entries crossing DST transitions when started within the week window", () => {
    const nowMs = new Date(2026, 2, 30, 12, 0, 0, 0).getTime();
    const window = getDashboardPeriodWindow("week", nowMs);
    const dstEntry = createEntry({
      endedAt: new Date(2026, 2, 30, 5, 0, 0, 0).toISOString(),
      id: "entry-dst",
      project: { id: "project-dst", name: "DST Watch" },
      projectId: "project-dst",
      startedAt: new Date(2026, 2, 30, 2, 30, 0, 0).toISOString(),
      task: { id: "task-dst", title: "Clock audit" },
      taskId: "task-dst",
    });

    expect(new Date(dstEntry.startedAt).toISOString()).toBe("2026-03-29T23:30:00.000Z");
    expect(getEntryTrackedSecondsWithinRange(dstEntry, Date.parse(window.dateFrom), Date.parse(window.dateTo), nowMs)).toBe(
      9000,
    );
  });

  it("retains description and full entry reference for interactions", () => {
    const nowMs = Date.parse("2026-04-21T12:00:00.000Z");
    const withDescription = createEntry({
      description: "Review query performance edge cases",
      id: "entry-with-description",
    });
    const withoutDescription = createEntry({
      description: null,
      id: "entry-without-description",
    });
    const rows = mapDashboardRecentEntryRows(
      [withDescription, withoutDescription],
      nowMs,
    );

    expect(rows[0]?.description).toBe("Review query performance edge cases");
    expect(rows[0]?.entry).toBe(withDescription);
    expect(rows[1]?.description).toBe(null);
    expect(rows[1]?.entry).toBe(withoutDescription);
  });
});
