import { mount } from "@vue/test-utils";
import type { TaskResponse } from "@gitiempo/shared";
import PrimeVue from "primevue/config";
import { beforeEach, describe, expect, it } from "vitest";
import { giTiempoPrimeVueOptions } from "@gitiempo/web-config/theme";
import { ManagementTableRowAction } from "@gitiempo/web-shared";

import ProjectsTaskSection from "./ProjectsTaskSection.vue";
import { mockMatchMedia } from "@/test/mockMatchMedia";

describe("ProjectsTaskSection", () => {
  beforeEach(() => {
    mockMatchMedia();
  });

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
    expect(wrapper.findAll('[data-testid="project-task-mobile-card"]').length).toBe(0);
    expect(wrapper.emitted("editTask")?.[0]).toEqual([task]);
    expect(wrapper.emitted("deleteTask")?.[0]).toEqual([task]);
    expect(wrapper.emitted("addTask")?.[0]).toEqual(["project-1"]);
  });

  it("renders mobile cards with accessible icon-only actions on small viewports", async () => {
    mockMatchMedia(true);

    const tasks: TaskResponse[] = [
      {
        createdAt: "2026-04-20T12:00:00.000Z",
        id: "task-1",
        isActive: true,
        projectId: "project-1",
        status: "open",
        title: "Improve reports filters",
        updatedAt: "2026-04-21T10:00:00.000Z",
        workspaceId: "workspace-1",
      },
      {
        createdAt: "2026-04-20T12:30:00.000Z",
        id: "task-2",
        isActive: false,
        projectId: "project-1",
        status: "closed",
        title: "Archive launch checklist",
        updatedAt: "2026-04-22T15:30:00.000Z",
        workspaceId: "workspace-1",
      },
    ];

    const wrapper = mount(ProjectsTaskSection, {
      props: {
        formatUpdatedLabel: (updatedAt: string) =>
          updatedAt === tasks[0].updatedAt ? "Today, 10:00" : "Yesterday, 15:30",
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
        tasks,
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

    const mobileCards = wrapper.findAll('[data-testid="project-task-mobile-card"]');
    const mobileTitles = wrapper.findAll('[data-testid="project-task-mobile-title"]');
    const editButton = wrapper.get('[data-testid="project-task-mobile-edit-task-1"]');
    const deleteButton = wrapper.get('[data-testid="project-task-mobile-delete-task-1"]');

    expect(mobileCards).toHaveLength(2);
    expect(mobileTitles[0]?.classes()).not.toContain('truncate');
    expect(mobileTitles[0]?.classes()).toContain('break-words');
    expect(mobileTitles[0]?.classes()).toContain('whitespace-normal');
    expect(mobileCards[0]?.text()).toContain('Improve reports filters');
    expect(mobileCards[0]?.text()).toContain('Open');
    expect(mobileCards[0]?.text()).toContain('Today, 10:00');
    expect(mobileCards[1]?.text()).toContain('Archive launch checklist');
    expect(mobileCards[1]?.text()).toContain('Closed');
    expect(mobileCards[1]?.text()).toContain('Yesterday, 15:30');
    expect(editButton.attributes('aria-label')).toBe('Edit');
    expect(editButton.attributes('data-tooltip')).toBe('Edit');
    expect(editButton.text()).toBe('');
    expect(deleteButton.attributes('aria-label')).toBe('Delete');
    expect(deleteButton.attributes('data-tooltip')).toBe('Delete');

    await editButton.trigger('click');
    await deleteButton.trigger('click');

    expect(wrapper.emitted('editTask')?.[0]).toEqual([tasks[0]]);
    expect(wrapper.emitted('deleteTask')?.[0]).toEqual([tasks[0]]);
  });

  it("renders the desktop task table branch with the expected column labels", () => {
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

    expect(wrapper.findAll('[data-testid="project-task-mobile-card"]')).toHaveLength(0);
    expect(wrapper.text()).toContain("Task");
    expect(wrapper.text()).toContain("Status");
    expect(wrapper.text()).toContain("Updated");
    expect(wrapper.text()).toContain("Improve reports filters");
    expect(wrapper.get('[data-testid="project-task-title"]').classes()).not.toContain(
      "truncate",
    );
    expect(wrapper.get('[data-testid="project-task-title"]').classes()).toContain(
      "break-words",
    );
    expect(wrapper.get('[data-testid="project-task-title"]').classes()).toContain(
      "whitespace-normal",
    );
  });

  it("uses the shared management empty state for projects without active tasks", () => {
    mockMatchMedia(true);

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
    expect(wrapper.findAll('[data-testid="project-task-mobile-card"]')).toHaveLength(0);
  });
});
