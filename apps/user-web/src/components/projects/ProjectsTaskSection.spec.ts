import { mount } from "@vue/test-utils";
import type { TaskResponse } from "@gitiempo/shared";
import PrimeVue from "primevue/config";
import { beforeEach, describe, expect, it } from "vitest";
import { giTiempoPrimeVueOptions } from "@gitiempo/web-config/theme";

import ProjectsTaskSection from "./ProjectsTaskSection.vue";
import { mockMatchMedia } from "@/test/mockMatchMedia";

describe("ProjectsTaskSection", () => {
  beforeEach(() => {
    mockMatchMedia();
  });

  it("renders the xnbDf desktop structure and emits add and title-edit events", async () => {
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
        project: {
          color: null,
          createdAt: "2026-04-20T12:00:00.000Z",
          description: null,
          id: "project-1",
          isActive: true,
          members: [],
          name: "Project Orion",
          source: "manual",
          totalSeconds: 43200,
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

    const addButton = wrapper.get('[data-testid="project-section-add-task"]');
    const taskTitle = wrapper.get('[data-testid="project-task-title"]');

    expect(addButton.attributes("aria-label")).toBe("Add task");
    expect(addButton.attributes("title")).toBe("Add task");
    expect(taskTitle.classes()).toContain("text-brand");
    expect(
      wrapper
        .get('[data-testid="project-task-title-arrow"]')
        .attributes("aria-hidden"),
    ).toBe("true");
    expect(
      wrapper.get('[data-testid="project-task-title-arrow"]').classes(),
    ).toContain("size-3.5");
    expect(wrapper.text()).not.toContain("Actions");
    expect(wrapper.find('[data-testid="project-task-edit"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="project-task-delete"]').exists()).toBe(false);

    await taskTitle.trigger("click");
    await addButton.trigger("click");

    expect(wrapper.text()).toContain("Project Orion");
    expect(wrapper.text()).toContain("1 active task");
    expect(wrapper.findAll('[data-testid="project-task-mobile-card"]').length).toBe(0);
    expect(wrapper.emitted("editTask")?.[0]).toEqual([task]);
    expect(wrapper.emitted("addTask")?.[0]).toEqual(["project-1"]);
  });

  it("renders mobile cards with clickable titles on small viewports", async () => {
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
        project: {
          color: null,
          createdAt: "2026-04-20T12:00:00.000Z",
          description: null,
          id: "project-1",
          isActive: true,
          members: [],
          name: "Project Orion",
          source: "manual",
          totalSeconds: 43200,
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

    expect(mobileCards).toHaveLength(2);
    expect(mobileTitles[0]?.classes()).not.toContain('truncate');
    expect(mobileTitles[0]?.classes()).toContain('break-words');
    expect(mobileTitles[0]?.classes()).toContain('whitespace-normal');
    expect(
      wrapper
        .get('[data-testid="project-task-mobile-title-arrow"]')
        .attributes('aria-hidden'),
    ).toBe('true');
    expect(
      wrapper.get('[data-testid="project-task-mobile-title-arrow"]').classes(),
    ).toContain('size-3.5');
    expect(mobileCards[0]?.text()).toContain('Improve reports filters');
    expect(mobileCards[0]?.text()).toContain('Open');
    expect(mobileCards[0]?.text()).toContain('Today, 10:00');
    expect(mobileCards[1]?.text()).toContain('Archive launch checklist');
    expect(mobileCards[1]?.text()).toContain('Closed');
    expect(mobileCards[1]?.text()).toContain('Yesterday, 15:30');
    expect(wrapper.find('[data-testid="project-task-mobile-edit-task-1"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="project-task-mobile-delete-task-1"]').exists()).toBe(false);

    await mobileTitles[0]?.trigger('click');

    expect(wrapper.emitted('editTask')?.[0]).toEqual([tasks[0]]);
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
        project: {
          color: null,
          createdAt: "2026-04-20T12:00:00.000Z",
          description: null,
          id: "project-1",
          isActive: true,
          members: [],
          name: "Project Orion",
          source: "manual",
          totalSeconds: 43200,
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
    expect(wrapper.text()).not.toContain("Actions");
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
        project: {
          color: null,
          createdAt: "2026-04-20T12:00:00.000Z",
          description: null,
          id: "project-1",
          isActive: true,
          members: [],
          name: "Project Orion",
          source: "manual",
          totalSeconds: 43200,
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
