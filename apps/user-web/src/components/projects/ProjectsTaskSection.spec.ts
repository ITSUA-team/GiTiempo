// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import PrimeVue from "primevue/config";
import { describe, expect, it } from "vitest";
import { giTiempoPrimeVueOptions } from "@gitiempo/web-config/theme";

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
        plugins: [[PrimeVue, giTiempoPrimeVueOptions]],
      },
    });

    await wrapper.get('button[aria-label="Edit"]').trigger("click");
    await wrapper.get('button[aria-label="Delete"]').trigger("click");
    await wrapper.get('[data-testid="project-section-add-task"]').trigger("click");

    expect(wrapper.text()).toContain("Project Orion");
    expect(wrapper.text()).toContain("1 active task");
    expect(wrapper.emitted("editTask")?.[0]).toEqual([task]);
    expect(wrapper.emitted("deleteTask")?.[0]).toEqual([task]);
    expect(wrapper.emitted("addTask")?.[0]).toEqual(["project-1"]);
  });
});
