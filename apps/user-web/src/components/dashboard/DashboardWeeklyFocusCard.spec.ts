import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import DashboardWeeklyFocusCard from "./DashboardWeeklyFocusCard.vue";

describe("DashboardWeeklyFocusCard", () => {
  it("renders a separate github link beside the synced top task", () => {
    const wrapper = mount(DashboardWeeklyFocusCard, {
      props: {
        focus: {
          project: {
            description: "3h tracked across 2 entries",
            entryCount: 2,
            githubIssue: null,
            label: "Top Project",
            shareLabel: "60% of your tracked time this week",
            sharePercent: 60,
            title: "Project Orion",
          },
          task: {
            description: "Project Orion • 2h tracked",
            entryCount: 1,
            githubIssue: {
              githubRepo: "octo/repo",
              issueNumber: 184,
            },
            label: "Top Task",
            shareLabel: "1 entry contributed to this focus",
            sharePercent: 40,
            title: "Improve reports filters",
          },
        },
      },
      global: {
        stubs: {
          ProgressBar: { template: "<div />" },
          SectionHeader: { template: "<header><slot /><slot name='actions' /></header>" },
          SurfaceCard: { template: "<section><slot /></section>" },
          Tag: { template: "<span />" },
        },
      },
    });

    const link = wrapper.get('[data-testid="dashboard-weekly-focus-task-github"]');

    expect(wrapper.text()).toContain("Improve reports filters");
    expect(link.attributes()).toMatchObject({
      href: "https://github.com/octo/repo/issues/184",
      target: "_blank",
    });
  });

  it("omits the github link for local top tasks", () => {
    const wrapper = mount(DashboardWeeklyFocusCard, {
      props: {
        focus: {
          project: null,
          task: {
            description: "Project Orion • 2h tracked",
            entryCount: 1,
            githubIssue: null,
            label: "Top Task",
            shareLabel: "1 entry contributed to this focus",
            sharePercent: 40,
            title: "Improve reports filters",
          },
        },
      },
      global: {
        stubs: {
          ProgressBar: { template: "<div />" },
          SectionHeader: { template: "<header><slot /><slot name='actions' /></header>" },
          SurfaceCard: { template: "<section><slot /></section>" },
          Tag: { template: "<span />" },
        },
      },
    });

    expect(wrapper.find('[data-testid="dashboard-weekly-focus-task-github"]').exists()).toBe(false);
  });

  it("keeps weekly focus content safe for narrow mobile widths", () => {
    const wrapper = mount(DashboardWeeklyFocusCard, {
      props: {
        focus: {
          project: {
            description: "32h tracked across unusually long current-week planning sessions",
            entryCount: 7,
            githubIssue: null,
            label: "Top Project",
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
            title: "Investigate a very long synced GitHub task title that must wrap on phones",
          },
        },
      },
      global: {
        stubs: {
          ProgressBar: { template: "<div />" },
          SectionHeader: { template: "<header><slot /><slot name='actions' /></header>" },
          SurfaceCard: {
            props: ["paddingClass"],
            template: '<section :class="paddingClass"><slot /></section>',
          },
          Tag: { template: "<span />" },
        },
      },
    });

    const surface = wrapper.get("section");
    const focusGrid = wrapper.get(".grid");
    const focusPanels = wrapper.findAll(".bg-app-bg");
    const focusTitles = wrapper.findAll(".text-xl");

    expect(surface.classes()).toContain("p-6");
    expect(focusGrid.classes()).toContain("min-w-0");
    expect(focusPanels).toHaveLength(2);
    expect(focusPanels[0]?.classes()).toEqual(expect.arrayContaining(["min-w-0", "overflow-hidden", "p-4"]));
    expect(focusPanels[1]?.classes()).toEqual(expect.arrayContaining(["min-w-0", "overflow-hidden", "p-4"]));
    expect(focusTitles).toHaveLength(2);
    expect(focusTitles[0]?.classes()).toEqual(expect.arrayContaining(["break-words", "text-xl", "sm:text-2xl"]));
    expect(focusTitles[1]?.classes()).toEqual(expect.arrayContaining(["break-words", "text-xl", "sm:text-2xl"]));
  });
});
