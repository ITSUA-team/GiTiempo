import { mount } from "@vue/test-utils";
import type { ProjectResponse, TaskResponse } from "@gitiempo/shared";
import { ManagementTableShell } from "@gitiempo/web-shared";
import PrimeVue from "primevue/config";
import { beforeEach, describe, expect, it } from "vitest";
import { giTiempoPrimeVueOptions } from "@gitiempo/web-config/theme";

import ProjectsTaskSection from "./ProjectsTaskSection.vue";
import { mockMatchMedia } from "@/test/mockMatchMedia";

function createProject(): ProjectResponse {
  return {
    color: null,
    createdAt: "2026-04-20T12:00:00.000Z",
    defaultBillableForTasks: true,
    description: null,
    id: "project-1",
    isActive: true,
    members: [],
    name: "Project Orion",
    source: "manual",
    totalSeconds: 43200,
    updatedAt: "2026-04-20T12:00:00.000Z",
    visibility: "public",
    workspaceId: "workspace-1",
  };
}

function createTask(overrides: Partial<TaskResponse> = {}): TaskResponse {
  return {
    createdAt: "2026-04-20T12:00:00.000Z",
    defaultBillableForTimeEntries: true,
    githubIssue: null,
    id: "task-1",
    isActive: true,
    projectId: "project-1",
    status: "open",
    title: "Improve reports filters",
    updatedAt: "2026-04-21T10:00:00.000Z",
    workspaceId: "workspace-1",
    ...overrides,
  };
}

function mountSection(
  tasks: TaskResponse[] = [createTask()],
  timerProps: Partial<{
    activeTimerTaskId: string | null;
    isCurrentTimerLoading: boolean;
    startingTimerTaskId: string | null;
    stoppingTimerTaskId: string | null;
  }> = {},
) {
  return mount(ProjectsTaskSection, {
    props: {
      formatUpdatedLabel: (updatedAt: string) =>
        updatedAt === "2026-04-21T10:00:00.000Z" ? "Today, 10:00" : "Yesterday, 15:30",
      project: createProject(),
      tasks,
      ...timerProps,
    },
    global: {
      plugins: [[PrimeVue, giTiempoPrimeVueOptions]],
    },
  });
}

describe("ProjectsTaskSection", () => {
  beforeEach(() => {
    mockMatchMedia();
  });

  it("opens the task popup from the desktop task title and emits add", async () => {
    const task = createTask({
      githubIssue: {
        githubRepo: "octo/repo",
        issueNumber: 184,
      },
    });
    const wrapper = mountSection([task]);
    const titleButton = wrapper.get('[data-testid="project-task-title"]');

    expect(titleButton.attributes("aria-label")).toBe("Edit task Improve reports filters");
    expect(titleButton.text()).toContain("Improve reports filters");
    expect(titleButton.find("svg").exists()).toBe(false);
    const desktopIssue = wrapper.get(
      '[data-testid="project-task-github-task-1"]',
    );
    expect(desktopIssue.attributes()).toMatchObject({
      href: "https://github.com/octo/repo/issues/184",
      target: "_blank",
    });
    // The issue number is visible beside the task name, not just an arrow.
    expect(desktopIssue.text()).toContain("#184");
    expect(wrapper.text()).toContain("Project Orion");
    expect(wrapper.text()).toContain("1 active task");
    expect(wrapper.text()).not.toContain("Actions");
    expect(wrapper.find('[data-testid="project-task-delete"]').exists()).toBe(false);
    expect(wrapper.findAll('[data-testid="project-task-mobile-card"]')).toHaveLength(0);

    await titleButton.trigger("click");
    await wrapper.get('[data-testid="project-section-add-task"]').trigger("click");

    expect(wrapper.emitted("editTask")?.[0]).toEqual([task]);
    expect(wrapper.emitted("deleteTask")).toBeUndefined();
    expect(wrapper.emitted("addTask")?.[0]).toEqual(["project-1"]);
  });

  it("starts a fresh timer from a desktop project task", async () => {
    const task = createTask();
    const wrapper = mountSection([task]);
    const timerButton = wrapper.get(
      '[data-testid="project-task-start-timer-task-1"]',
    );

    expect(timerButton.attributes("aria-label")).toBe(
      "Start timer for Improve reports filters",
    );
    expect(timerButton.attributes("disabled")).toBeUndefined();

    await timerButton.trigger("click");

    expect(wrapper.emitted("startTimer")).toEqual([[task]]);
  });

  it("opens the top-bar timer dialog before starting when another task is running", async () => {
    const wrapper = mountSection([createTask()], {
      activeTimerTaskId: "task-other",
    });
    const timerButton = wrapper.get(
      '[data-testid="project-task-start-timer-task-1"]',
    );

    expect(timerButton.attributes("aria-disabled")).toBe("true");
    expect(timerButton.attributes("disabled")).toBeUndefined();

    await timerButton.trigger("click");

    expect(wrapper.emitted("openActiveTimer")).toHaveLength(1);
    expect(wrapper.emitted("startTimer")).toBeUndefined();
  });

  it("stops the active timer from its matching project task", async () => {
    const task = createTask();
    const wrapper = mountSection([task], { activeTimerTaskId: task.id });
    const timerButton = wrapper.get(
      '[data-testid="project-task-stop-timer-task-1"]',
    );

    expect(timerButton.attributes("aria-label")).toBe(
      "Stop timer for Improve reports filters",
    );

    await timerButton.trigger("click");

    expect(wrapper.emitted("stopTimer")).toEqual([[task]]);
  });

  it("locks every task while a start is in flight and shows pending feedback on its initiator", () => {
    const task = createTask();
    const otherTask = createTask({ id: "task-2", title: "Review feedback" });
    const wrapper = mountSection([task, otherTask], { startingTimerTaskId: task.id });
    const timerButton = wrapper.get(
      '[data-testid="project-task-start-timer-task-1"]',
    );

    expect(timerButton.attributes("disabled")).toBeDefined();
    expect(timerButton.attributes("aria-busy")).toBe("true");
    expect(
      timerButton.find('[data-testid="timer-action-spinner"]').exists(),
    ).toBe(true);
    expect(
      wrapper.get('[data-testid="project-task-start-timer-task-2"]').attributes("disabled"),
    ).toBeDefined();
  });

  it("does not render a timer action for closed tasks", () => {
    const closedTask = createTask({ status: "closed" });
    const wrapper = mountSection([closedTask]);

    expect(wrapper.find('[data-testid="project-task-start-timer-task-1"]').exists()).toBe(false);
  });

  it("renders mobile cards with clickable task titles and no row actions", async () => {
    mockMatchMedia(true);

    const tasks = [
      createTask(),
      createTask({
        id: "task-2",
        githubIssue: {
          githubRepo: "octo/repo",
          issueNumber: 185,
        },
        isActive: false,
        status: "closed",
        title: "Archive launch checklist",
        updatedAt: "2026-04-22T15:30:00.000Z",
      }),
    ];
    const wrapper = mountSection(tasks);

    const mobileCards = wrapper.findAll('[data-testid="project-task-mobile-card"]');
    const mobileTitles = wrapper.findAll('[data-testid="project-task-mobile-title"]');

    expect(mobileCards).toHaveLength(2);
    expect(mobileTitles[0]?.classes()).toContain("truncate");
    expect(mobileCards[0]?.text()).toContain("Improve reports filters");
    expect(mobileCards[0]?.text()).toContain("Open");
    expect(mobileCards[0]?.text()).toContain("Today, 10:00");
    expect(mobileCards[1]?.text()).toContain("Archive launch checklist");
    expect(mobileCards[1]?.text()).toContain("Closed");
    expect(mobileCards[1]?.text()).toContain("Yesterday, 15:30");
    expect(mobileTitles[0]?.find("svg").exists()).toBe(false);
    expect(wrapper.find('[data-testid="project-task-mobile-github-task-1"]').exists()).toBe(false);
    const mobileIssue = wrapper.get(
      '[data-testid="project-task-mobile-github-task-2"]',
    );
    expect(mobileIssue.attributes("href")).toBe(
      "https://github.com/octo/repo/issues/185",
    );
    expect(mobileIssue.text()).toContain("#185");
    expect(wrapper.find('[data-testid="project-task-mobile-delete-task-1"]').exists()).toBe(false);

    await mobileTitles[0]!.trigger("click");

    expect(wrapper.emitted("editTask")?.[0]).toEqual([tasks[0]]);
    expect(wrapper.emitted("deleteTask")).toBeUndefined();
  });

  it("keeps the direct timer action on mobile task cards", async () => {
    mockMatchMedia(true);

    const task = createTask();
    const wrapper = mountSection([task]);
    const timerButton = wrapper.get(
      '[data-testid="project-task-mobile-start-timer-task-1"]',
    );

    await timerButton.trigger("click");

    expect(wrapper.emitted("startTimer")).toEqual([[task]]);
  });

  it("places the mobile timer action after the title group", () => {
    mockMatchMedia(true);

    const wrapper = mountSection([createTask()]);
    const header = wrapper.get('[data-testid="project-task-mobile-header"]');
    const title = wrapper.get('[data-testid="project-task-mobile-title"]');
    const action = wrapper.get('[data-testid="project-task-mobile-start-timer-task-1"]');

    expect(header.element.contains(title.element)).toBe(true);
    expect(header.element.contains(action.element)).toBe(true);
    expect(
      title.element.compareDocumentPosition(action.element) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("keeps mobile stop, blocked, and pending timer states interactive only when allowed", async () => {
    mockMatchMedia(true);

    const task = createTask();
    const running = mountSection([task], { activeTimerTaskId: task.id });
    const blocked = mountSection([task], { activeTimerTaskId: "task-other" });
    const pending = mountSection([task], { startingTimerTaskId: task.id });

    await running
      .get('[data-testid="project-task-mobile-stop-timer-task-1"]')
      .trigger("click");
    await blocked
      .get('[data-testid="project-task-mobile-start-timer-task-1"]')
      .trigger("click");

    expect(running.emitted("stopTimer")).toEqual([[task]]);
    expect(blocked.emitted("openActiveTimer")).toHaveLength(1);
    expect(
      pending
        .get('[data-testid="project-task-mobile-start-timer-task-1"]')
        .attributes("disabled"),
    ).toBeDefined();
  });

  it("renders the desktop task table branch without column headers", () => {
    const wrapper = mountSection();
    const tableShell = wrapper.getComponent(ManagementTableShell);

    expect(tableShell.props("headerClass")).toContain("min-w-[740px]");
    expect(tableShell.props("showHeader")).toBe(false);
    expect(tableShell.props("singleScroll")).toBe(true);
    expect(tableShell.props("shellClass")).toContain("overflow-x-auto");
    expect(tableShell.props("tableContainerClass")).toBe(
      "overflow-visible rounded-none border-none",
    );
    expect(wrapper.findAll('[data-testid="project-task-mobile-card"]')).toHaveLength(0);
    expect(wrapper.text()).not.toContain("Task");
    expect(wrapper.text()).not.toContain("Status");
    expect(wrapper.text()).not.toContain("Updated");
    expect(wrapper.text()).not.toContain("Actions");
    expect(wrapper.text()).toContain("Improve reports filters");
    expect(wrapper.get('[data-testid="project-task-title"]').classes()).toContain("truncate");
  });

  it("uses the shared management empty state for projects without active tasks", () => {
    mockMatchMedia(true);

    const wrapper = mountSection([]);

    expect(wrapper.text()).toContain("No active tasks yet");
    expect(wrapper.text()).toContain(
      "Add a task to start tracking work for this project.",
    );
    expect(wrapper.findAll('[data-testid="project-task-mobile-card"]')).toHaveLength(0);
  });
});
