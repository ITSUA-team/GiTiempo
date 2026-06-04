import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import PrimeVue from "primevue/config";
import { giTiempoPrimeVueOptions } from "@gitiempo/web-config/theme";

import DashboardRecentEntriesCard from "./DashboardRecentEntriesCard.vue";
import { mockMatchMedia } from "@/test/mockMatchMedia";

describe("DashboardRecentEntriesCard", () => {
  beforeEach(() => {
    mockMatchMedia();
  });

  it("renders recent entry content and emits the view-all action", async () => {
    const wrapper = mount(DashboardRecentEntriesCard, {
      props: {
        entries: [
          {
            durationLabel: "1h 10m",
            id: "entry-1",
            isHighlighted: true,
            projectName: "Billing API",
            taskTitle: "Fix export column order",
            timeRangeLabel: "09:00 - 10:10",
          },
          {
            durationLabel: "00:40:00",
            id: "entry-2",
            isHighlighted: false,
            projectName: "Project Orion",
            taskTitle: "Improve reports filters",
            timeRangeLabel: "10:20 - Running",
          },
        ],
      },
      global: {
        plugins: [[PrimeVue, giTiempoPrimeVueOptions]],
        stubs: {
          Button: {
            props: ["label"],
            emits: ["click"],
            template: '<button type="button" @click="$emit(\'click\')">{{ label }}</button>',
          },
          SurfaceCard: { template: '<section><slot /></section>' },
        },
      },
    });

    expect(wrapper.text()).toContain("Recent Time Entries");
    expect(wrapper.text()).toContain("Billing API");
    expect(wrapper.text()).toContain("Fix export column order");
    expect(wrapper.text()).toContain("Project Orion");
    expect(wrapper.text()).toContain("10:20 - Running");
    expect(wrapper.text()).toContain("00:40:00");
    expect(wrapper.findAll('[data-testid="dashboard-recent-entry-mobile-card"]')).toHaveLength(0);
    expect(wrapper.find('[data-testid="dashboard-recent-entries-table"]').exists()).toBe(true);

    await wrapper.get("button").trigger("click");

    expect(wrapper.emitted("viewAll")).toEqual([[]]);
  });

  it("renders stacked mobile cards below the mobile breakpoint", () => {
    mockMatchMedia(true);

    const wrapper = mount(DashboardRecentEntriesCard, {
      props: {
        entries: [
          {
            durationLabel: "1h 10m",
            id: "entry-1",
            isHighlighted: true,
            projectName: "Billing API",
            taskTitle: "Fix export column order",
            timeRangeLabel: "09:00 - 10:10",
          },
          {
            durationLabel: "00:40:00",
            id: "entry-2",
            isHighlighted: false,
            projectName: "Project Orion",
            taskTitle: "Improve reports filters",
            timeRangeLabel: "10:20 - Running",
          },
        ],
      },
      global: {
        plugins: [[PrimeVue, giTiempoPrimeVueOptions]],
        stubs: {
          Button: {
            props: ["label"],
            emits: ["click"],
            template: '<button type="button" @click="$emit(\'click\')">{{ label }}</button>',
          },
          SurfaceCard: { template: '<section><slot /></section>' },
        },
      },
    });

    const mobileCards = wrapper.findAll('[data-testid="dashboard-recent-entry-mobile-card"]');

    expect(mobileCards).toHaveLength(2);
    expect(wrapper.find('[data-testid="dashboard-recent-entries-table"]').exists()).toBe(false);
    expect(mobileCards[0]?.classes()).toContain('bg-accent-tint');
    expect(mobileCards[0]?.text()).toContain('Fix export column order');
    expect(mobileCards[0]?.text()).toContain('Billing API');
    expect(mobileCards[0]?.text()).toContain('09:00 - 10:10');
    expect(mobileCards[0]?.text()).toContain('1h 10m');
    expect(mobileCards[1]?.text()).toContain('Improve reports filters');
    expect(mobileCards[1]?.text()).toContain('Project Orion');
    expect(mobileCards[1]?.text()).toContain('10:20 - Running');
    expect(mobileCards[1]?.text()).toContain('00:40:00');
  });
});
