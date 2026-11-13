import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import PrimeVue from "primevue/config";
import { giTiempoPrimeVueOptions } from "@gitiempo/web-config/theme";
import { ManagementTableShell } from "@gitiempo/web-shared";
import type { DirectiveBinding, Plugin } from "vue";

import DashboardRecentEntriesCard from "./DashboardRecentEntriesCard.vue";
import { mockMatchMedia } from "@/test/mockMatchMedia";
import type { DashboardRecentEntryRow } from "@/composables/dashboard/useDashboardOverview";
import type { TimeEntryResponse } from "@gitiempo/shared";

function createRecentEntryRow(
  overrides: Omit<Partial<DashboardRecentEntryRow>, "timerEntry" | "entry"> & {
    timerEntry?: Partial<DashboardRecentEntryRow["timerEntry"]>;
  } = {},
): DashboardRecentEntryRow {
  const id = overrides.id ?? "entry-1";
  const taskTitle = overrides.taskTitle ?? "Fix export column order";
  const description = overrides.description ?? null;
  const timerEntry = {
    endedAt: "2026-04-21T10:10:00.000Z",
    id,
    task: { title: taskTitle },
    taskId: "task-1",
    ...overrides.timerEntry,
  };
  const entry: TimeEntryResponse = {
    createdAt: "2026-04-21T09:00:00.000Z",
    description,
    durationSeconds: 4200,
    endedAt: "2026-04-21T10:10:00.000Z",
    id,
    isBillable: false,
    project: { id: "project-1", name: "Billing API" },
    projectId: "project-1",
    source: "web",
    startedAt: "2026-04-21T09:00:00.000Z",
    task: { id: "task-1", title: taskTitle },
    taskId: "task-1",
    updatedAt: "2026-04-21T10:10:00.000Z",
    user: {
      avatarUrl: null,
      displayName: "Alexey Tsukanov",
      email: "alexey@example.com",
      id: "user-1",
    },
    userId: "user-1",
    workspace: { id: "workspace-1", name: "Workspace Alpha" },
    workspaceId: "workspace-1",
    githubIssue: null,
    invoiceId: null,
  };

  return {
    description,
    durationLabel: "1h 10m",
    entry,
    githubIssue: null,
    id,
    isHighlighted: false,
    projectName: "Billing API",
    taskTitle,
    timeRangeLabel: "09:00 - 10:10",
    ...overrides,
    timerEntry,
  };
}

function setTooltipValueAttribute(
  element: HTMLElement,
  binding: DirectiveBinding<string | undefined>,
): void {
  if (binding.value === undefined) {
    element.removeAttribute("data-tooltip-value");
    return;
  }

  element.setAttribute("data-tooltip-value", binding.value);
}

function createGlobalMountOptions() {
  return {
    directives: {
      tooltip: {
        mounted: setTooltipValueAttribute,
        updated: setTooltipValueAttribute,
      },
    },
    plugins: [[PrimeVue, giTiempoPrimeVueOptions] as [Plugin, typeof giTiempoPrimeVueOptions]],
    stubs: {
      Button: {
        props: ["label"],
        emits: ["click"],
        template: '<button type="button" @click="$emit(\'click\')"><slot />{{ label }}</button>',
      },
      SurfaceCard: { template: "<section><slot /></section>" },
    },
  };
}

function getMobileCardElementByText(card: Element, selector: string, text: string): Element {
  const element = Array.from(card.querySelectorAll(selector)).find(
    (candidate) => candidate.textContent?.trim() === text,
  );

  if (!element) {
    throw new Error(
      `Expected the mobile card to render a <${selector}> with the text "${text}".`,
    );
  }

  return element;
}

describe("DashboardRecentEntriesCard", () => {
  beforeEach(() => {
    mockMatchMedia();
  });

  it("renders recent entry content and emits the view-all action", async () => {
    const wrapper = mount(DashboardRecentEntriesCard, {
      props: {
        entries: [
          createRecentEntryRow({
            githubIssue: {
              githubRepo: "octo/repo",
              issueNumber: 184,
            },
            id: "entry-1",
            isHighlighted: true,
            timerEntry: {
              endedAt: null,
              id: "entry-1",
            },
          }),
          createRecentEntryRow({
            durationLabel: "00:40:00",
            id: "entry-2",
            projectName: "Project Orion",
            taskTitle: "Improve reports filters",
            timerEntry: {
              id: "entry-2",
              task: { title: "Improve reports filters" },
              taskId: "task-2",
            },
            timeRangeLabel: "10:20 - Running",
          }),
        ],
      },
      global: createGlobalMountOptions(),
    });

    expect(wrapper.text()).toContain("Recent Time Entries");
    expect(wrapper.text()).toContain("Billing API");
    expect(wrapper.text()).toContain("Fix export column order");
    expect(wrapper.text()).toContain("Project Orion");
    expect(wrapper.text()).toContain("10:20 - Running");
    expect(wrapper.text()).toContain("00:40:00");
    expect(wrapper.findAll('[data-testid="dashboard-recent-entry-mobile-card"]')).toHaveLength(0);
    expect(wrapper.find('[data-testid="dashboard-recent-entries-table"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="dashboard-recent-entry-github-entry-1"]').attributes()).toMatchObject({
      href: "https://github.com/octo/repo/issues/184",
      target: "_blank",
    });
    expect(wrapper.find('[data-testid="dashboard-recent-entry-github-entry-2"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="dashboard-recent-entry-stop-timer-entry-1"]').attributes("aria-label")).toBe(
      "Stop timer for Fix export column order",
    );
    expect(wrapper.get('[data-testid="dashboard-recent-entry-start-timer-entry-2"]').attributes("aria-label")).toBe(
      "Start timer for Improve reports filters",
    );

    await wrapper.get('[data-testid="dashboard-recent-entry-stop-timer-entry-1"]').trigger("click");
    await wrapper.get('[data-testid="dashboard-recent-entry-start-timer-entry-2"]').trigger("click");

    expect(wrapper.emitted("stopTimer")?.[0]?.[0]).toMatchObject({ id: "entry-1", taskId: "task-1" });
    expect(wrapper.emitted("startTimer")?.[0]?.[0]).toMatchObject({ id: "entry-2", taskId: "task-2" });

    await wrapper.get("button").trigger("click");

    expect(wrapper.emitted("viewAll")).toEqual([[]]);
  });

  it("displays entry description when present", () => {
    const wrapper = mount(DashboardRecentEntriesCard, {
      props: {
        entries: [
          createRecentEntryRow({ id: "entry-1", description: "Review query performance" }),
        ],
      },
      global: createGlobalMountOptions(),
    });

    expect(wrapper.text()).toContain("Review query performance");
  });

  it("uses the unified headerless desktop table presentation", () => {
    const rows = [
      createRecentEntryRow({ id: "entry-1" }),
      createRecentEntryRow({
        id: "entry-2",
        isHighlighted: true,
        taskTitle: "Improve reports filters",
      }),
    ];
    const wrapper = mount(DashboardRecentEntriesCard, {
      props: {
        entries: rows,
      },
      global: createGlobalMountOptions(),
    });
    const tableShell = wrapper.getComponent(ManagementTableShell);
    const columns = tableShell.props("columns");

    expect(tableShell.props("showHeader")).toBe(false);
    expect(tableShell.props("bodyRowClass")).toContain("h-[52px]");
    expect(columns.find((column) => column.key === "project")?.width).toBe(170);
    expect(columns.find((column) => column.key === "range")?.width).toBe(130);
    expect(columns.find((column) => column.key === "duration")?.width).toBe(110);
    expect(tableShell.props("rowClass")?.(rows[0])).not.toContain("bg-accent-tint");
    expect(tableShell.props("rowClass")?.(rows[1])).toContain("bg-accent-tint");
  });

  it("renders stacked mobile cards below the mobile breakpoint", async () => {
    mockMatchMedia(true);

    const wrapper = mount(DashboardRecentEntriesCard, {
      props: {
        entries: [
          createRecentEntryRow({
            githubIssue: {
              githubRepo: "octo/repo",
              issueNumber: 184,
            },
            id: "entry-1",
            isHighlighted: true,
            timerEntry: {
              endedAt: null,
              id: "entry-1",
            },
          }),
          createRecentEntryRow({
            durationLabel: "00:40:00",
            id: "entry-2",
            projectName: "Project Orion",
            taskTitle: "Improve reports filters",
            timerEntry: {
              id: "entry-2",
              task: { title: "Improve reports filters" },
              taskId: "task-2",
            },
            timeRangeLabel: "10:20 - Running",
          }),
        ],
      },
      global: createGlobalMountOptions(),
    });

    const mobileCards = wrapper.findAll('[data-testid="dashboard-recent-entry-mobile-card"]');

    expect(mobileCards).toHaveLength(2);
    expect(wrapper.find('[data-testid="dashboard-recent-entries-table"]').exists()).toBe(false);
    expect(mobileCards[0]?.classes()).toContain('bg-accent-tint');
    expect(mobileCards[0]?.text()).toContain('Fix export column order');
    expect(mobileCards[0]?.text()).toContain('Billing API');
    expect(wrapper.get('[data-testid="dashboard-recent-entry-mobile-github-entry-1"]').attributes("href")).toBe(
      "https://github.com/octo/repo/issues/184",
    );
    expect(mobileCards[0]?.text()).toContain('09:00 - 10:10');
    expect(mobileCards[0]?.text()).toContain('1h 10m');
    expect(mobileCards[1]?.text()).toContain('Improve reports filters');
    expect(mobileCards[1]?.text()).toContain('Project Orion');
    expect(mobileCards[1]?.text()).toContain('10:20 - Running');
    expect(mobileCards[1]?.text()).toContain('00:40:00');
    expect(wrapper.find('[data-testid="dashboard-recent-entry-mobile-github-entry-2"]').exists()).toBe(false);
    expect(wrapper.get('[data-testid="dashboard-recent-entry-mobile-stop-timer-entry-1"]').attributes('aria-label')).toBe(
      'Stop timer for Fix export column order',
    );
    expect(wrapper.get('[data-testid="dashboard-recent-entry-mobile-start-timer-entry-2"]').attributes('aria-label')).toBe(
      'Start timer for Improve reports filters',
    );

    await wrapper.get('[data-testid="dashboard-recent-entry-mobile-stop-timer-entry-1"]').trigger('click');
    await wrapper.get('[data-testid="dashboard-recent-entry-mobile-start-timer-entry-2"]').trigger('click');

    expect(wrapper.emitted('stopTimer')?.[0]?.[0]).toMatchObject({ id: 'entry-1', taskId: 'task-1' });
    expect(wrapper.emitted('startTimer')?.[0]?.[0]).toMatchObject({ id: 'entry-2', taskId: 'task-2' });
  });

  it("places the mobile timer action before the task title", () => {
    mockMatchMedia(true);

    const wrapper = mount(DashboardRecentEntriesCard, {
      props: {
        entries: [createRecentEntryRow({ id: "entry-1" })],
      },
      global: createGlobalMountOptions(),
    });
    const card = wrapper.get('[data-testid="dashboard-recent-entry-mobile-card"]');
    const timer = wrapper.get('[data-testid="dashboard-recent-entry-mobile-start-timer-entry-1"]');
    const title = wrapper.get('[data-testid="dashboard-recent-entry-mobile-edit-entry-1"]');

    expect(card.element.contains(timer.element)).toBe(true);
    expect(card.element.contains(title.element)).toBe(true);
    expect(
      title.element.compareDocumentPosition(timer.element) &
        Node.DOCUMENT_POSITION_PRECEDING,
    ).toBe(Node.DOCUMENT_POSITION_PRECEDING);
  });

  it("places the mobile description under the task title", () => {
    mockMatchMedia(true);

    const wrapper = mount(DashboardRecentEntriesCard, {
      props: {
        entries: [
          createRecentEntryRow({ description: "Some description", id: "entry-1" }),
        ],
      },
      global: createGlobalMountOptions(),
    });
    const card = wrapper.get('[data-testid="dashboard-recent-entry-mobile-card"]');
    const title = wrapper.get('[data-testid="dashboard-recent-entry-mobile-edit-entry-1"]');
    const description = getMobileCardElementByText(card.element, "p", "Some description");

    expect(card.element.contains(title.element)).toBe(true);
    expect(
      description.compareDocumentPosition(title.element) &
        Node.DOCUMENT_POSITION_PRECEDING,
    ).toBe(Node.DOCUMENT_POSITION_PRECEDING);
  });

  it("groups the Project and Duration labels together above the Range label", () => {
    mockMatchMedia(true);

    const wrapper = mount(DashboardRecentEntriesCard, {
      props: {
        entries: [createRecentEntryRow({ id: "entry-1" })],
      },
      global: createGlobalMountOptions(),
    });
    const card = wrapper.get('[data-testid="dashboard-recent-entry-mobile-card"]');
    const project = getMobileCardElementByText(card.element, "span", "Project");
    const duration = getMobileCardElementByText(card.element, "span", "Duration");
    const range = getMobileCardElementByText(card.element, "span", "Range");

    expect(
      duration.compareDocumentPosition(project) &
        Node.DOCUMENT_POSITION_PRECEDING,
    ).toBe(Node.DOCUMENT_POSITION_PRECEDING);
    expect(
      range.compareDocumentPosition(project) &
        Node.DOCUMENT_POSITION_PRECEDING,
    ).toBe(Node.DOCUMENT_POSITION_PRECEDING);
    expect(
      range.compareDocumentPosition(duration) &
        Node.DOCUMENT_POSITION_PRECEDING,
    ).toBe(Node.DOCUMENT_POSITION_PRECEDING);
  });

  it("keeps the shared View all action available on mobile", async () => {
    mockMatchMedia(true);

    const wrapper = mount(DashboardRecentEntriesCard, {
      props: {
        entries: [createRecentEntryRow({ id: "entry-1" })],
      },
      global: createGlobalMountOptions(),
    });
    const viewAllButton = wrapper
      .findAll("button")
      .find((button) => button.text() === "View all");

    expect(viewAllButton).toBeDefined();

    await viewAllButton?.trigger("click");

    expect(wrapper.emitted("viewAll")).toEqual([[]]);
  });

  it("routes mobile task-title clicks by entry state", async () => {
    mockMatchMedia(true);

    const rows = [
      createRecentEntryRow({
        id: "entry-1",
        timerEntry: { endedAt: null, id: "entry-1" },
      }),
      createRecentEntryRow({
        id: "entry-2",
        taskTitle: "Improve reports filters",
        timerEntry: {
          id: "entry-2",
          task: { title: "Improve reports filters" },
          taskId: "task-2",
        },
      }),
    ];
    const wrapper = mount(DashboardRecentEntriesCard, {
      props: {
        entries: rows,
      },
      global: createGlobalMountOptions(),
    });

    await wrapper
      .get('[data-testid="dashboard-recent-entry-mobile-edit-entry-2"]')
      .trigger("click");

    expect(wrapper.emitted("editEntry")?.[0]?.[0]).toEqual(rows[1].entry);
    expect(wrapper.emitted("openActiveTimer")).toBeUndefined();

    await wrapper
      .get('[data-testid="dashboard-recent-entry-mobile-open-timer-entry-1"]')
      .trigger("click");

    expect(wrapper.emitted("openActiveTimer")).toHaveLength(1);
    expect(typeof wrapper.emitted("openActiveTimer")?.[0]?.[0]).toBe("string");
    expect(wrapper.emitted("editEntry")).toHaveLength(1);
  });

  it("disables completed-entry starts when the parent reports an active timer", async () => {
    const wrapper = mount(DashboardRecentEntriesCard, {
      props: {
        entries: [createRecentEntryRow({ id: "entry-1" })],
        isStartTimerDisabled: true,
      },
      global: createGlobalMountOptions(),
    });

    const startTimerButton = wrapper.get('[data-testid="dashboard-recent-entry-start-timer-entry-1"]');

    expect(startTimerButton.attributes("aria-disabled")).toBe("true");
    expect(startTimerButton.attributes("disabled")).toBeDefined();

    await startTimerButton.trigger("click");

    expect(wrapper.emitted("startTimer")).toBeUndefined();
  });

  it("opens the entry editor from a completed entry's task title", async () => {
    const rows = [
      createRecentEntryRow({
        id: "entry-1",
        timerEntry: { endedAt: null, id: "entry-1" },
      }),
      createRecentEntryRow({
        id: "entry-2",
        taskTitle: "Improve reports filters",
        timerEntry: {
          id: "entry-2",
          task: { title: "Improve reports filters" },
          taskId: "task-2",
        },
      }),
    ];
    const wrapper = mount(DashboardRecentEntriesCard, {
      props: {
        entries: rows,
      },
      global: createGlobalMountOptions(),
    });

    await wrapper
      .get('[data-testid="dashboard-recent-entry-edit-entry-2"]')
      .trigger("click");

    expect(wrapper.emitted("editEntry")?.[0]?.[0]).toEqual(rows[1].entry);
    expect(wrapper.emitted("openActiveTimer")).toBeUndefined();
  });

  it("opens the active timer from a running entry's task title", async () => {
    const wrapper = mount(DashboardRecentEntriesCard, {
      props: {
        entries: [
          createRecentEntryRow({
            id: "entry-1",
            timerEntry: { endedAt: null, id: "entry-1" },
          }),
        ],
      },
      global: createGlobalMountOptions(),
    });

    await wrapper
      .get('[data-testid="dashboard-recent-entry-open-timer-entry-1"]')
      .trigger("click");

    expect(wrapper.emitted("openActiveTimer")).toHaveLength(1);
    expect(wrapper.emitted("openActiveTimer")?.[0]?.[0]).toBe("entry-1");
    expect(wrapper.emitted("editEntry")).toBeUndefined();
  });

  it("emits goToActiveTimer when stop-first guidance is shown and start is clicked", async () => {
    const wrapper = mount(DashboardRecentEntriesCard, {
      props: {
        entries: [createRecentEntryRow({ id: "entry-1" })],
        isStartTimerDisabled: true,
        showStopFirstGuidance: true,
      },
      global: createGlobalMountOptions(),
    });

    const startButton = wrapper.get(
      '[data-testid="dashboard-recent-entry-start-timer-entry-1"]',
    );
    expect(startButton.attributes("disabled")).toBeUndefined();
    expect(startButton.attributes("data-tooltip-value")).toContain(
      "stop the current timer first",
    );

    await startButton.trigger("click");

    expect(wrapper.emitted("goToActiveTimer")).toHaveLength(1);
    expect(wrapper.emitted("openActiveTimer")).toBeUndefined();
    expect(wrapper.emitted("startTimer")).toBeUndefined();
  });
});
