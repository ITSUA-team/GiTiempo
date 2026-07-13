import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import PrimeVue from "primevue/config";
import { giTiempoPrimeVueOptions } from "@gitiempo/web-config/theme";
import type { DirectiveBinding, Plugin } from "vue";

import DashboardRecentEntriesCard from "./DashboardRecentEntriesCard.vue";
import { mockMatchMedia } from "@/test/mockMatchMedia";
import type { DashboardRecentEntryRow } from "@/composables/dashboard/useDashboardOverview";

function createRecentEntryRow(
  overrides: Omit<Partial<DashboardRecentEntryRow>, "timerEntry"> & {
    timerEntry?: Partial<DashboardRecentEntryRow["timerEntry"]>;
  } = {},
): DashboardRecentEntryRow {
  const id = overrides.id ?? "entry-1";
  const taskTitle = overrides.taskTitle ?? "Fix export column order";
  const timerEntry = {
    endedAt: "2026-04-21T10:10:00.000Z",
    id,
    task: { title: taskTitle },
    taskId: "task-1",
    ...overrides.timerEntry,
  };

  return {
    durationLabel: "1h 10m",
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
        template: '<button type="button" @click="$emit(\'click\')">{{ label }}</button>',
      },
      SurfaceCard: { template: "<section><slot /></section>" },
    },
  };
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
});
