// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import PrimeVue from "primevue/config";
import { describe, expect, it } from "vitest";
import { giTiempoPrimeVueOptions } from "@gitiempo/web-config/theme";
import { ManagementTableRowAction } from "@gitiempo/web-shared";

import ProjectsTaskSection from "./ProjectsTaskSection.vue";

describe("ProjectsTaskSection", () => {
  it("renders accessible row actions and emits add, edit, and delete events", async () => {
    const task = {
      createdAt: "2026-04-20T12:00:00.000Z",
      id: "task-1",
      isActive: true,
      projectId: "project-1",
      status: "open",
      title: "Improve reports filters",
      updatedAt: "2026-04-21T10:00:00.000Z",
      workspaceId: "workspace-1",
    } as const;
    const wrapper = mount(ProjectsTaskSection, {
      props: {
        formatUpdatedLabel: () => "Today, 10:00",
        isDeletingTaskId: null,
        project: {
          color: null,
          createdAt: "2026-04-20T12:00:00.000Z",
          description: null,
          id: "project-1",
          isActive: true,
          members: [],
          name: "Project Orion",
          source: "manual",
          totalHours: 12,
          updatedAt: "2026-04-20T12:00:00.000Z",
          visibility: "public",
          workspaceId: "workspace-1",
        },
        tasks: [task],
      },
      global: {
        directives: {
          tooltip: {
            mounted(el, binding) {
              el.setAttribute("data-tooltip", String(binding.value));
            },
          },
        },
        plugins: [[PrimeVue, giTiempoPrimeVueOptions]],
      },
    });

    const editButton = wrapper.get('[data-testid="project-task-edit"]');
    const deleteButton = wrapper.get('[data-testid="project-task-delete"]');

    expect(editButton.attributes("aria-label")).toBe("Edit");
    expect(editButton.attributes("data-tooltip")).toBe("Edit");
    expect(editButton.text()).toBe("");
    expect(deleteButton.attributes("aria-label")).toBe("Delete");
    expect(deleteButton.attributes("data-tooltip")).toBe("Delete");
    expect(deleteButton.text()).toBe("");

    const rowActions = wrapper.findAllComponents(ManagementTableRowAction);

    rowActions[0]!.vm.$emit("click", new MouseEvent("click"));
    rowActions[1]!.vm.$emit("click", new MouseEvent("click"));
    await wrapper.get('[data-testid="project-section-add-task"]').trigger("click");

    expect(wrapper.text()).toContain("Project Orion");
    expect(wrapper.text()).toContain("1 active task");
    expect(wrapper.emitted("editTask")?.[0]).toEqual([task]);
    expect(wrapper.emitted("deleteTask")?.[0]).toEqual([task]);
    expect(wrapper.emitted("addTask")?.[0]).toEqual(["project-1"]);
  });

  it("uses the same fixed-width table alignment contract as the approved projects design", () => {
    const task = {
      createdAt: "2026-04-20T12:00:00.000Z",
      id: "task-1",
      isActive: true,
      projectId: "project-1",
      status: "open",
      title: "Improve reports filters",
      updatedAt: "2026-04-21T10:00:00.000Z",
      workspaceId: "workspace-1",
    } as const;
    const wrapper = mount(ProjectsTaskSection, {
      props: {
        formatUpdatedLabel: () => "Today, 10:00",
        isDeletingTaskId: null,
        project: {
          color: null,
          createdAt: "2026-04-20T12:00:00.000Z",
          description: null,
          id: "project-1",
          isActive: true,
          members: [],
          name: "Project Orion",
          source: "manual",
          totalHours: 12,
          updatedAt: "2026-04-20T12:00:00.000Z",
          visibility: "public",
          workspaceId: "workspace-1",
        },
        tasks: [task],
      },
      global: {
        directives: {
          tooltip: {
            mounted(el, binding) {
              el.setAttribute("data-tooltip", String(binding.value));
            },
          },
        },
        plugins: [[PrimeVue, giTiempoPrimeVueOptions]],
      },
    });

    const columns = wrapper.findAllComponents({ name: "Column" });

    expect(columns[0]?.props("style")).toBeNull();
    expect(columns[1]?.props("style")).toEqual({ width: "8.125rem" });
    expect(columns[2]?.props("style")).toEqual({ width: "10.625rem" });
    expect(columns[3]?.props("style")).toEqual({ width: "8.75rem" });
    expect(columns[3]?.props("header")).toBeNull();
    expect(wrapper.html()).toContain("table-fixed");
  });

  it("uses the shared management empty state for projects without active tasks", () => {
    const wrapper = mount(ProjectsTaskSection, {
      props: {
        formatUpdatedLabel: () => "Today, 10:00",
        isDeletingTaskId: null,
        project: {
          color: null,
          createdAt: "2026-04-20T12:00:00.000Z",
          description: null,
          id: "project-1",
          isActive: true,
          members: [],
          name: "Project Orion",
          source: "manual",
          totalHours: 12,
          updatedAt: "2026-04-20T12:00:00.000Z",
          visibility: "public",
          workspaceId: "workspace-1",
        },
        tasks: [],
      },
      global: {
        directives: {
          tooltip: {
            mounted(el, binding) {
              el.setAttribute("data-tooltip", String(binding.value));
            },
          },
        },
        plugins: [[PrimeVue, giTiempoPrimeVueOptions]],
      },
    });

    expect(wrapper.text()).toContain("No active tasks yet");
    expect(wrapper.text()).toContain(
      "Add a task to start tracking work for this project.",
    );
  });
});
