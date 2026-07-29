import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import PrimeVue from "primevue/config";
import { giTiempoPrimeVueOptions } from "@gitiempo/web-config/theme";

import TimeEntriesFilters from "./TimeEntriesFilters.vue";

describe("TimeEntriesFilters", () => {
  beforeEach(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: () => ({
        matches: false,
        media: "",
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });
  });

  it("shows a placeholder on the empty date range field", () => {
    const wrapper = mount(TimeEntriesFilters, {
      props: {
        isLoadingProjects: false,
        projectSuggestions: [],
        projectsErrorMessage: null,
        selectedDateRange: null,
        selectedProject: null,
        selectedTask: null,
        taskSuggestions: [],
      },
      global: {
        plugins: [[PrimeVue, giTiempoPrimeVueOptions]],
      },
    });

    expect(
      wrapper.get("#time-entries-date-range").attributes("placeholder"),
    ).toBe("Select date range");
  });
});
