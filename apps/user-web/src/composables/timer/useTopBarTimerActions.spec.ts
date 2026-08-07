import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { computed, defineComponent, h, ref } from "vue";

import { timerKeys } from "@/lib/query-keys";
import type { TimeEntriesClient } from "@/services/time-entries-client";
import {
  createTestQueryClient,
  createTestQueryPlugin,
} from "@/test/query-client";

import { useTopBarTimerActions } from "./useTopBarTimerActions";

const SCOPE = "user-1";

const boardContext = {
  githubIssue: { githubRepo: "ITSUA-team/GiTiempo", issueNumber: 343 },
  githubProjectId: "PVT_GiTimpo",
  issueTitle: "Timer pulls projects",
  source: "github-project-issue" as const,
};

const startedEntry = {
  createdAt: "2026-08-03T10:00:00.000Z",
  description: null,
  durationSeconds: null,
  endedAt: null,
  id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002",
  isBillable: true,
  project: { id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001", name: "GiTimpo" },
  projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
  source: "web" as const,
  startedAt: "2026-08-03T10:00:00.000Z",
  task: { id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9003", title: "Timer pulls projects" },
  taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9003",
  updatedAt: "2026-08-03T10:00:00.000Z",
  user: {
    avatarUrl: null,
    displayName: "Alexey",
    email: "alexey@example.com",
    id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9004",
  },
  userId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9004",
  workspace: { id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9000", name: "Workspace" },
  workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9000",
};

function createSummaryStub() {
  return {
    clearSelectedDescription: vi.fn(),
    currentTimer: ref<unknown>(null),
    isCrossWorkspaceTimer: computed(() => false),
    refreshSummary: vi.fn(async () => undefined),
    refreshSummaryAfterConflict: vi.fn(async () => undefined),
    selectedContext: computed(() => boardContext),
    selectedDescription: computed(() => null),
    setIdleSelection: vi.fn(),
    setSelectedContextFromTimer: vi.fn(),
    setSelectedDescriptionFromTimer: vi.fn(),
  };
}

function mountActions(client: Partial<TimeEntriesClient>) {
  const queryClient = createTestQueryClient();
  const summary = createSummaryStub();
  let actions!: ReturnType<typeof useTopBarTimerActions>;

  const Harness = defineComponent({
    setup() {
      actions = useTopBarTimerActions({
        client: client as TimeEntriesClient,
        isTimerRunning: computed(() => false),
        scope: computed(() => SCOPE as never),
        summary: summary as never,
        toast: { add: vi.fn() } as never,
      });

      return () => h("div");
    },
  });

  const wrapper = mount(Harness, {
    global: { plugins: [createTestQueryPlugin(queryClient)] },
  });

  return { actions, queryClient, summary, wrapper };
}

describe("useTopBarTimerActions starting from a GitHub board", () => {
  const wrappers: VueWrapper[] = [];

  afterEach(() => {
    while (wrappers.length > 0) {
      wrappers.pop()?.unmount();
    }
  });

  it("reports the action as pending while the request is in flight", async () => {
    let release!: () => void;
    const startTimerFromGitHub = vi.fn(
      () =>
        new Promise((resolve) => {
          release = () => resolve(startedEntry);
        }),
    );
    const mounted = mountActions({ startTimerFromGitHub } as never);

    wrappers.push(mounted.wrapper);

    expect(mounted.actions.isPrimaryActionPending.value).toBe(false);

    const started = mounted.actions.handlePrimaryAction();
    await flushPromises();

    expect(mounted.actions.isPrimaryActionPending.value).toBe(true);

    release();
    await started;
    await flushPromises();

    expect(mounted.actions.isPrimaryActionPending.value).toBe(false);
    expect(startTimerFromGitHub).toHaveBeenCalledTimes(1);
  });

  it("refreshes the timer caches the same way a task-based start does", async () => {
    const startTimerFromGitHub = vi.fn(async () => startedEntry);
    const mounted = mountActions({ startTimerFromGitHub } as never);

    wrappers.push(mounted.wrapper);

    const invalidate = vi.spyOn(mounted.queryClient, "invalidateQueries");

    await mounted.actions.handlePrimaryAction();
    await flushPromises();

    const invalidatedKeys = invalidate.mock.calls.map(([filters]) =>
      JSON.stringify(
        (filters as { queryKey?: readonly unknown[] } | undefined)?.queryKey ??
          [],
      ),
    );
    const timerScopePrefix = JSON.stringify(
      timerKeys.all(SCOPE as never),
    ).slice(1, -1);

    expect(
      invalidatedKeys.some((key) => key.includes(timerScopePrefix)),
    ).toBe(true);
  });
});
