import type { TimeEntryResponse } from "@gitiempo/shared";
import { describe, expect, it } from "vitest";
import { shallowRef } from "vue";

import {
  getDashboardPageState,
  useDashboardOverviewViewModel,
} from "./useDashboardOverviewViewModel";

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

describe("useDashboardOverviewViewModel", () => {
  it("assembles page state distinctly from loading, error, and recent-entry data", () => {
    expect(getDashboardPageState({
      isLoadingOverview: true,
      recentEntryCount: 0,
      requestErrorMessage: null,
    })).toBe("loading");
    expect(getDashboardPageState({
      isLoadingOverview: false,
      recentEntryCount: 0,
      requestErrorMessage: "network down",
    })).toBe("request-error");
    expect(getDashboardPageState({
      isLoadingOverview: false,
      recentEntryCount: 0,
      requestErrorMessage: null,
    })).toBe("empty");
  });

  it("derives dashboard stats, focus, and recent rows from focused inputs", () => {
    const nowMs = shallowRef(Date.parse("2026-04-21T12:00:00.000Z"));
    const recentEntries = shallowRef([createEntry()]);
    const weekEntries = shallowRef([
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
    ]);
    const viewModel = useDashboardOverviewViewModel({
      isLoadingOverview: false,
      nowMs,
      recentEntries,
      requestErrorMessage: null,
      weekEntries,
    });

    expect(viewModel.pageState.value).toBe("ready");
    expect(viewModel.dashboardStats.value[1]).toEqual({
      description: "2 entries tracked this week",
      label: "This Week",
      value: "2h 30m",
    });
    expect(viewModel.weeklyFocus.value.project?.title).toBe("Billing API");
    expect(viewModel.recentEntryRows.value[0]).toEqual(
      expect.objectContaining({ id: "entry-1", isHighlighted: true }),
    );
  });
});
