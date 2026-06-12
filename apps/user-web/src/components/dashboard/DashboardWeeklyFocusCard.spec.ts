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
});
