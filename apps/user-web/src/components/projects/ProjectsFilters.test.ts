import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import PrimeVue from "primevue/config";
import { giTiempoPrimeVueOptions } from "@gitiempo/web-config/theme";

import {
  ALL_PROJECT_STATUSES_FILTER,
  ANY_PROJECT_UPDATED_FILTER,
  PROJECT_STATUS_FILTER_OPTIONS,
  PROJECT_UPDATED_FILTER_OPTIONS,
  type ProjectsSearchSuggestion,
} from "@/lib/projects-page-helpers";

import ProjectsFilters from "./ProjectsFilters.vue";

function mountFilters(
  searchValue: ProjectsSearchSuggestion | string | null = null,
) {
  return mount(ProjectsFilters, {
    props: {
      searchSuggestions: [],
      searchValue,
      statusFilter: ALL_PROJECT_STATUSES_FILTER,
      statusFilterOptions: PROJECT_STATUS_FILTER_OPTIONS,
      updatedFilter: ANY_PROJECT_UPDATED_FILTER,
      updatedFilterOptions: PROJECT_UPDATED_FILTER_OPTIONS,
    },
    global: {
      plugins: [[PrimeVue, giTiempoPrimeVueOptions]],
    },
  });
}

describe("ProjectsFilters", () => {
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

  it("renders the search field with the expected placeholder", () => {
    const wrapper = mountFilters();

    expect(
      wrapper.get<HTMLInputElement>("#projects-search").attributes("placeholder"),
    ).toBe("Search projects or tasks");
  });

  it("shows a clear control when the search has a value", async () => {
    const wrapper = mountFilters("Orion");
    const clearControl = wrapper.find(".p-autocomplete-clear-icon");

    expect(clearControl.exists()).toBe(true);
  });

  it("clears the search value from the clear control", async () => {
    const wrapper = mountFilters("Orion");
    const clearControl = wrapper.get(".p-autocomplete-clear-icon");

    await clearControl.trigger("click");

    expect(wrapper.emitted("update:searchValue")?.[0]).toEqual([null]);
  });

  it("does not show a clear control when the search is empty", () => {
    const wrapper = mountFilters(null);

    expect(wrapper.find(".p-autocomplete-clear-icon").exists()).toBe(false);
  });
});