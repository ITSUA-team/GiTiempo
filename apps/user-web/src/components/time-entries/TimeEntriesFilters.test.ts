import type { ProjectResponse } from "@gitiempo/shared";
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import PrimeVue from "primevue/config";
import { giTiempoPrimeVueOptions } from "@gitiempo/web-config/theme";

import type { TaskLookupOption } from "@/composables/time-entries/time-entry-task-lookup";

import TimeEntriesFilters from "./TimeEntriesFilters.vue";

const AUTOCOMPLETE_SEARCH_DELAY_MS = 300;

const demoClient: ProjectResponse = {
  color: null,
  createdAt: "2026-04-20T12:00:00.000Z",
  defaultBillableForTasks: true,
  description: null,
  id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9301",
  isActive: true,
  members: [],
  name: "Demo Client",
  source: "manual",
  totalSeconds: 43200,
  updatedAt: "2026-04-20T12:00:00.000Z",
  visibility: "public",
  workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9401",
};

const demoCorp: ProjectResponse = {
  ...demoClient,
  id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9302",
  name: "Demo Corp",
};

const demoTask: TaskLookupOption = {
  id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9303",
  isActive: true,
  projectId: demoClient.id,
  title: "Prepare monthly report",
};

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

  it("keeps the project filter when a typed query never matched an option", async () => {
    const wrapper = mount(TimeEntriesFilters, {
      props: {
        isLoadingProjects: false,
        projectSuggestions: [demoClient],
        projectsErrorMessage: null,
        selectedDateRange: null,
        selectedProject: demoClient,
        selectedTask: null,
        taskSuggestions: [],
      },
      global: {
        plugins: [[PrimeVue, giTiempoPrimeVueOptions]],
      },
    });
    const projectInput = wrapper.get("#time-entries-project-filter");

    await projectInput.setValue("Demo");
    await projectInput.trigger("change");

    const projectValues = wrapper.emitted("update:projectValue") ?? [];

    expect(projectValues.some(([value]) => value === null)).toBe(false);
  });

  it("still clears the project filter from the clear control", async () => {
    const wrapper = mount(TimeEntriesFilters, {
      props: {
        isLoadingProjects: false,
        projectSuggestions: [demoClient],
        projectsErrorMessage: null,
        selectedDateRange: null,
        selectedProject: demoClient,
        selectedTask: null,
        taskSuggestions: [],
      },
      global: {
        plugins: [[PrimeVue, giTiempoPrimeVueOptions]],
      },
    });
    const clearControl = wrapper.find(".p-autocomplete-clear-icon");

    expect(clearControl.exists()).toBe(true);

    await clearControl.trigger("click");

    expect(wrapper.emitted("update:projectValue")?.[0]).toEqual([null]);
  });

  it("clears the task filter from the clear control", async () => {
    const wrapper = mount(TimeEntriesFilters, {
      props: {
        isLoadingProjects: false,
        projectSuggestions: [],
        projectsErrorMessage: null,
        selectedDateRange: null,
        selectedProject: null,
        selectedTask: demoTask,
        taskSuggestions: [demoTask],
      },
      global: {
        plugins: [[PrimeVue, giTiempoPrimeVueOptions]],
      },
    });
    const clearControl = wrapper.find(".p-autocomplete-clear-icon");

    expect(clearControl.exists()).toBe(true);

    await clearControl.trigger("click");

    expect(wrapper.emitted("update:taskValue")?.[0]).toEqual([null]);
  });

  it("applies a suggestion clicked after typing", async () => {
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
    const projectInput = wrapper.get("#time-entries-project-filter");

    await projectInput.setValue("Demo");
    await new Promise((resolve) => {
      setTimeout(resolve, AUTOCOMPLETE_SEARCH_DELAY_MS + 50);
    });
    await wrapper.setProps({ projectSuggestions: [demoClient] });

    const option = wrapper.find(".p-autocomplete-option");

    expect(option.exists()).toBe(true);

    await projectInput.trigger("blur");
    await option.trigger("click");

    const projectValues = wrapper.emitted("update:projectValue") ?? [];

    expect(projectValues[projectValues.length - 1]).toEqual([demoClient]);
  });

  it("restores the selected project label when a typed query is abandoned", async () => {
    const wrapper = mount(TimeEntriesFilters, {
      props: {
        isLoadingProjects: false,
        projectSuggestions: [demoClient],
        projectsErrorMessage: null,
        selectedDateRange: null,
        selectedProject: demoClient,
        selectedTask: null,
        taskSuggestions: [],
      },
      global: {
        plugins: [[PrimeVue, giTiempoPrimeVueOptions]],
      },
    });
    const projectInput = wrapper.get<HTMLInputElement>(
      "#time-entries-project-filter",
    );

    await projectInput.setValue("Dem");

    expect(projectInput.element.value).toBe("Dem");

    await projectInput.trigger("blur");

    expect(projectInput.element.value).toBe("Demo Client");
  });

  it("applies a project typed in full without picking it from the list", async () => {
    const wrapper = mount(TimeEntriesFilters, {
      props: {
        isLoadingProjects: false,
        projectSuggestions: [demoClient],
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
    const projectInput = wrapper.get<HTMLInputElement>(
      "#time-entries-project-filter",
    );

    await projectInput.setValue("demo client ");
    await projectInput.trigger("blur");

    const projectValues = wrapper.emitted("update:projectValue") ?? [];

    expect(projectValues[projectValues.length - 1]).toEqual([demoClient]);
    expect(projectInput.element.value).toBe("Demo Client");
  });

  it("does not reapply a project that is already filtered", async () => {
    const wrapper = mount(TimeEntriesFilters, {
      props: {
        isLoadingProjects: false,
        projectSuggestions: [demoClient],
        projectsErrorMessage: null,
        selectedDateRange: null,
        selectedProject: demoClient,
        selectedTask: null,
        taskSuggestions: [],
      },
      global: {
        plugins: [[PrimeVue, giTiempoPrimeVueOptions]],
      },
    });
    const projectInput = wrapper.get("#time-entries-project-filter");

    await projectInput.setValue("Demo Client");
    await projectInput.trigger("blur");

    const projectValues = wrapper.emitted("update:projectValue") ?? [];

    expect(projectValues.some(([value]) => value === demoClient)).toBe(false);
  });

  it("applies a project typed in full and confirmed with Enter", async () => {
    const wrapper = mount(TimeEntriesFilters, {
      props: {
        isLoadingProjects: false,
        projectSuggestions: [demoClient],
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
    const projectInput = wrapper.get("#time-entries-project-filter");

    await projectInput.setValue("Demo Client");
    await projectInput.trigger("keydown", { key: "Enter", code: "Enter" });

    const projectValues = wrapper.emitted("update:projectValue") ?? [];

    expect(projectValues[projectValues.length - 1]).toEqual([demoClient]);
  });

  it("applies the first suggestion when Enter confirms a partial query", async () => {
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
    const projectInput = wrapper.get("#time-entries-project-filter");

    await projectInput.setValue("Dem");
    await new Promise((resolve) => {
      setTimeout(resolve, AUTOCOMPLETE_SEARCH_DELAY_MS + 50);
    });
    await wrapper.setProps({ projectSuggestions: [demoClient, demoCorp] });
    await projectInput.trigger("keydown", { key: "Enter", code: "Enter" });

    const projectValues = wrapper.emitted("update:projectValue") ?? [];

    expect(projectValues[projectValues.length - 1]).toEqual([demoClient]);
  });
});
