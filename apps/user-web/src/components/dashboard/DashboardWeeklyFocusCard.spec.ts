import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import DashboardWeeklyFocusCard from "./DashboardWeeklyFocusCard.vue";
import type { DashboardWeeklyFocus } from "@/lib/dashboard-overview-helpers";

const GITHUB_ISSUE = {
  githubRepo: "octo/repo",
  issueNumber: 184,
} as const;

function createFocus(
  overrides: Partial<DashboardWeeklyFocus> = {},
): DashboardWeeklyFocus {
  return {
    project: {
      description: "3h tracked across 2 entries",
      entryCount: 2,
      githubIssue: null,
      label: "Top Project",
      projectId: "project-orion",
      shareLabel: "60% of your tracked time this week",
      sharePercent: 60,
      title: "Project Orion",
    },
    task: {
      description: "Project Orion • 2h tracked",
      entryCount: 1,
      githubIssue: GITHUB_ISSUE,
      label: "Top Task",
      shareLabel: "1 entry contributed to this focus",
      sharePercent: 40,
      taskId: "task-reports",
      title: "Improve reports filters",
    },
    ...overrides,
  };
}

function mountCard(
  props: {
    errorMessage?: string | null;
    focus: DashboardWeeklyFocus;
    focusPeriod?: "day" | "month" | "week";
    loading?: boolean;
    projectRoute?: object | null;
    sectionRoute?: object | null;
    taskRoute?: object | null;
  },
) {
  return mount(DashboardWeeklyFocusCard, {
    props,
    global: {
      stubs: {
        Button: {
          props: ["label"],
          emits: ["click"],
          template:
            '<button type="button" @click="$emit(\'click\')">{{ label }}</button>',
        },
        ProgressBar: { template: "<div />" },
        RouterLink: {
          props: ["to"],
          template: '<a :data-route="JSON.stringify(to)"><slot /></a>',
        },
        Select: {
          props: ["modelValue", "options", "optionLabel", "optionValue"],
          emits: ["update:modelValue"],
          template: `
            <div data-testid="focus-period-select" :data-value="modelValue">
              <button
                v-for="option in options"
                :key="option.value"
                :aria-label="option.label"
                type="button"
                @click="$emit('update:modelValue', option.value)"
              >
                {{ option[optionLabel] }}
              </button>
            </div>
          `,
        },
        Skeleton: {
          template: '<div data-testid="skeleton" />',
        },
        SectionHeader: {
          props: ["title", "description"],
          template: "<header><h2>{{ title }}</h2><p>{{ description }}</p><slot /><slot name='actions' /></header>",
        },
        SurfaceCard: { template: "<section><slot /></section>" },
      },
    },
  });
}

const SECTION_ROUTE = {
  name: "time-entries",
  query: { dateFrom: "2026-04-20T00:00:00.000Z", dateTo: "2026-04-27T00:00:00.000Z" },
};
const PROJECT_ROUTE = {
  name: "time-entries",
  query: {
    dateFrom: "2026-04-20T00:00:00.000Z",
    dateTo: "2026-04-27T00:00:00.000Z",
    projectId: "project-orion",
  },
};

describe("DashboardWeeklyFocusCard", () => {
  it("renders a separate github link beside the synced top task", () => {
    const wrapper = mountCard({ focus: createFocus() });

    const link = wrapper.get('[data-testid="dashboard-weekly-focus-task-github"]');

    expect(wrapper.text()).toContain("Improve reports filters");
    expect(link.attributes()).toMatchObject({
      href: "https://github.com/octo/repo/issues/184",
      target: "_blank",
    });
  });

  it("omits the github link for local top tasks", () => {
    const baseTask = createFocus().task;
    const wrapper = mountCard({
      focus: createFocus({ task: baseTask ? { ...baseTask, githubIssue: null } : null }),
    });

    expect(wrapper.find('[data-testid="dashboard-weekly-focus-task-github"]').exists()).toBe(false);
  });

  it("keeps weekly focus content safe for narrow mobile widths", () => {
    const wrapper = mountCard({
      focus: {
        project: {
          description: "32h tracked across unusually long current-week planning sessions",
          entryCount: 7,
          githubIssue: null,
          label: "Top Project",
          projectId: "project-long-name",
          shareLabel: "92% of your tracked time this week across every synced workspace entry",
          sharePercent: 92,
          title: "A very long project name that should wrap instead of forcing the dashboard wider",
        },
        task: {
          description: "A very long project name • 18h tracked",
          entryCount: 4,
          githubIssue: null,
          label: "Top Task",
          shareLabel: "4 entries contributed to this focus with a long explanatory label",
          sharePercent: 64,
          taskId: "task-long-name",
          title: "Investigate a very long synced GitHub task title that must wrap on phones",
        },
      },
    });

    const focusGrid = wrapper.get(".grid");
    const focusPanels = wrapper.findAll(".bg-app-bg");
    const focusTitles = wrapper.findAll(".text-xl");

    expect(focusGrid.classes()).toContain("min-w-0");
    expect(focusPanels).toHaveLength(2);
    expect(focusPanels[0]?.classes()).toEqual(expect.arrayContaining(["min-w-0", "overflow-hidden", "p-4"]));
    expect(focusPanels[1]?.classes()).toEqual(expect.arrayContaining(["min-w-0", "overflow-hidden", "p-4"]));
    expect(focusTitles).toHaveLength(2);
    expect(focusTitles[0]?.classes()).toEqual(expect.arrayContaining(["break-words", "text-xl", "sm:text-2xl"]));
    expect(focusTitles[1]?.classes()).toEqual(expect.arrayContaining(["break-words", "text-xl", "sm:text-2xl"]));
  });

  describe("loading state", () => {
    it("renders a loading skeleton instead of focus content while loading", () => {
      const wrapper = mountCard({ focus: createFocus(), loading: true });

      expect(wrapper.find('[data-testid="dashboard-focus-loading-state"]').exists()).toBe(true);
      expect(wrapper.findAll('[data-testid="skeleton"]').length).toBeGreaterThan(0);
      expect(wrapper.text()).not.toContain("Project Orion");
      expect(wrapper.text()).not.toContain("No tracked project yet");
      expect(wrapper.text()).not.toContain("No tracked task yet");
      expect(wrapper.find('[data-testid="dashboard-focus-project-nav"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="dashboard-focus-task-nav"]').exists()).toBe(false);
    });

    it("keeps the period selector usable while loading", () => {
      const wrapper = mountCard({ focus: createFocus(), loading: true });

      expect(wrapper.find('[data-testid="focus-period-select"]').exists()).toBe(true);
    });
  });

  describe("request-error state", () => {
    it("renders the request error message with a Retry button instead of focus content", () => {
      const wrapper = mountCard({
        errorMessage: "Could not reach the server",
        focus: createFocus({ project: null, task: null }),
      });

      expect(wrapper.find('[data-testid="dashboard-focus-error-state"]').exists()).toBe(true);
      expect(wrapper.text()).toContain("Could not reach the server");
      expect(wrapper.text()).not.toContain("No tracked project focus for this week yet.");
      expect(wrapper.text()).not.toContain("Project Orion");
    });

    it("emits retry when the Retry button is activated", async () => {
      const wrapper = mountCard({
        errorMessage: "Could not reach the server",
        focus: createFocus({ project: null, task: null }),
      });

      await wrapper.get('[data-testid="dashboard-focus-retry"]').trigger("click");

      expect(wrapper.emitted("retry")).toEqual([[]]);
    });
  });

  describe("period selector", () => {
    it("renders a PrimeVue Select with Day, Week, and Month options in the section header actions", () => {
      const wrapper = mountCard({ focus: createFocus() });
      const selector = wrapper.get('[data-testid="focus-period-select"]');
      const labels = selector.findAll("button").map((button) => button.text());

      expect(labels).toEqual(["Day", "Week", "Month"]);
      expect(wrapper.find('[data-testid="dashboard-focus-period-control"]').exists()).toBe(true);
    });

    it("defaults the selected value to Week", () => {
      const wrapper = mountCard({ focus: createFocus() });

      expect(wrapper.get('[data-testid="focus-period-select"]').attributes("data-value")).toBe("week");
    });

    it("reflects the received focusPeriod prop as the selected value", () => {
      const wrapper = mountCard({ focus: createFocus(), focusPeriod: "month" });

      expect(wrapper.get('[data-testid="focus-period-select"]').attributes("data-value")).toBe("month");
    });

    it("emits update:focusPeriod when a different period is selected", async () => {
      const wrapper = mountCard({ focus: createFocus() });

      await wrapper.get('button[aria-label="Day"]').trigger("click");

      expect(wrapper.emitted("update:focusPeriod")).toEqual([["day"]]);
    });
  });

  describe("period-dependent heading and description", () => {
    it("shows today copy for the Day period", () => {
      const wrapper = mountCard({ focus: createFocus(), focusPeriod: "day" });

      expect(wrapper.text()).toContain("Top Focus Today");
      expect(wrapper.text()).toContain("Your strongest project and task based on today's tracked entries.");
    });

    it("shows this-week copy for the Week period", () => {
      const wrapper = mountCard({ focus: createFocus(), focusPeriod: "week" });

      expect(wrapper.text()).toContain("Top Focus This Week");
      expect(wrapper.text()).toContain("Your strongest project and task based on this week's tracked entries.");
    });

    it("shows this-month copy for the Month period", () => {
      const wrapper = mountCard({ focus: createFocus(), focusPeriod: "month" });

      expect(wrapper.text()).toContain("Top Focus This Month");
      expect(wrapper.text()).toContain("Your strongest project and task based on this month's tracked entries.");
    });
  });

  describe("period-dependent empty-state copy", () => {
    function mountEmptyCard(period: "day" | "month" | "week") {
      return mountCard({
        focus: createFocus({ project: null, task: null }),
        focusPeriod: period,
      });
    }

    it("shows today empty-state messages for the Day period", () => {
      const wrapper = mountEmptyCard("day");

      expect(wrapper.text()).toContain("No tracked project focus for today yet.");
      expect(wrapper.text()).toContain("No tracked task focus for today yet.");
      expect(wrapper.text()).toContain("Project share appears after your first current-day entry.");
      expect(wrapper.text()).toContain("Task repetition appears after your first current-day entry.");
    });

    it("shows this-week empty-state messages for the Week period", () => {
      const wrapper = mountEmptyCard("week");

      expect(wrapper.text()).toContain("No tracked project focus for this week yet.");
      expect(wrapper.text()).toContain("No tracked task focus for this week yet.");
      expect(wrapper.text()).toContain("Project share appears after your first current-week entry.");
      expect(wrapper.text()).toContain("Task repetition appears after your first current-week entry.");
    });

    it("shows this-month empty-state messages for the Month period", () => {
      const wrapper = mountEmptyCard("month");

      expect(wrapper.text()).toContain("No tracked project focus for this month yet.");
      expect(wrapper.text()).toContain("No tracked task focus for this month yet.");
      expect(wrapper.text()).toContain("Project share appears after your first current-month entry.");
      expect(wrapper.text()).toContain("Task repetition appears after your first current-month entry.");
    });
  });

  describe("card navigation", () => {
    const navProps = {
      focus: createFocus(),
      projectRoute: PROJECT_ROUTE,
      sectionRoute: SECTION_ROUTE,
      taskRoute: SECTION_ROUTE,
    };

    it("renders card-level, project, and task navigation links with accessible destination names", () => {
      const wrapper = mountCard(navProps);

      const sectionNav = wrapper.get('[data-testid="dashboard-focus-section-nav"]');
      const projectNav = wrapper.get('[data-testid="dashboard-focus-project-nav"]');
      const taskNav = wrapper.get('[data-testid="dashboard-focus-task-nav"]');

      expect(JSON.parse(sectionNav.attributes("data-route")!)).toEqual(SECTION_ROUTE);
      expect(JSON.parse(projectNav.attributes("data-route")!)).toEqual(PROJECT_ROUTE);
      expect(JSON.parse(taskNav.attributes("data-route")!)).toEqual(SECTION_ROUTE);
      expect(sectionNav.attributes("aria-label")).toBe("View time entries for this week");
      expect(projectNav.attributes("aria-label")).toBe("View time entries for project Project Orion");
      expect(taskNav.attributes("aria-label")).toBe("View time entries for task Improve reports filters");
    });

    it("omits navigation links when no destinations are provided", () => {
      const wrapper = mountCard({ focus: createFocus() });

      expect(wrapper.find("a[data-route]").exists()).toBe(false);
    });

    it("shows a visible keyboard focus indicator on navigation links", () => {
      const wrapper = mountCard(navProps);

      for (const nav of wrapper.findAll("a[data-route]")) {
        const classes = nav.attributes("class")!.split(" ");

        expect(classes).toContain("focus-visible:ring-2");
        expect(classes).toContain("focus-visible:ring-brand");
        expect(classes).toContain("focus-visible:outline-none");
      }
    });

    it("activates the matching destination on Space without Enter handling", async () => {
      const wrapper = mountCard(navProps);

      await wrapper.get('[data-testid="dashboard-focus-section-nav"]').trigger("keydown", { key: " " });
      await wrapper.get('[data-testid="dashboard-focus-project-nav"]').trigger("keydown", { key: " " });
      await wrapper.get('[data-testid="dashboard-focus-task-nav"]').trigger("keydown", { key: " " });

      expect(wrapper.emitted("activateSection")).toEqual([[]]);
      expect(wrapper.emitted("activateProject")).toEqual([[]]);
      expect(wrapper.emitted("activateTask")).toEqual([[]]);
    });

    it("does not activate card navigation when the period selector is used", async () => {
      const wrapper = mountCard(navProps);

      await wrapper.get('[data-testid="dashboard-focus-period-control"]').trigger("click");
      await wrapper.get('button[aria-label="Day"]').trigger("click");

      expect(wrapper.emitted("activateSection")).toBeUndefined();
      expect(wrapper.emitted("activateProject")).toBeUndefined();
      expect(wrapper.emitted("activateTask")).toBeUndefined();
      expect(wrapper.emitted("update:focusPeriod")).toEqual([["day"]]);
    });

    it("does not activate card navigation when the github issue link is activated", async () => {
      const wrapper = mountCard(navProps);

      await wrapper.get('[data-testid="dashboard-weekly-focus-task-github"]').trigger("click");

      expect(wrapper.emitted("activateTask")).toBeUndefined();
      expect(wrapper.emitted("activateSection")).toBeUndefined();
    });
  });
});
