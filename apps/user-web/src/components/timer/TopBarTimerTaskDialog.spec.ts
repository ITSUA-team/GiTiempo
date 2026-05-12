// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import TopBarTimerTaskDialog from "./TopBarTimerTaskDialog.vue";

function mountDialog(overrides: Partial<InstanceType<typeof TopBarTimerTaskDialog>["$props"]> = {}) {
  return mount(TopBarTimerTaskDialog, {
    props: {
      createTaskErrorMessage: null,
      createTaskTitle: "Write release checklist",
      isConfirmSelectionDisabled: false,
      isCreateTaskDisabled: false,
      isCreatingTask: false,
      isLoadingProjects: false,
      isLoadingTasks: false,
      isOpen: true,
      projectOptions: [
        {
          color: null,
          createdAt: "2026-04-20T12:00:00.000Z",
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
      ],
      projectsErrorMessage: null,
      selectedProjectId: "project-1",
      selectedTaskId: "task-1",
      taskOptions: [
        {
          createdAt: "2026-04-20T12:00:00.000Z",
          id: "task-1",
          isActive: true,
          projectId: "project-1",
          status: "open",
          title: "Improve reports filters",
          updatedAt: "2026-04-20T12:00:00.000Z",
          workspaceId: "workspace-1",
        },
      ],
      tasksErrorMessage: null,
      ...overrides,
    },
    global: {
      stubs: {
        Button: {
          props: ["disabled", "label"],
          template:
            '<button :disabled="disabled" type="button" @click="$emit(\'click\')">{{ label }}</button>',
        },
        Dialog: {
          template:
            '<div><slot name="header" /><slot /><slot name="footer" /></div>',
        },
        InputText: {
          props: ["modelValue", "disabled", "invalid"],
          emits: ["update:modelValue"],
          template:
            '<input :disabled="disabled" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
        ProgressSpinner: { template: '<div data-testid="spinner" />' },
        Select: {
          props: ["disabled", "modelValue", "options"],
          emits: ["update:modelValue"],
          template:
            '<select :disabled="disabled" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="option in options" :key="option.id" :value="option.id">{{ option.name ?? option.title }}</option></select>',
        },
      },
    },
  });
}

describe("TopBarTimerTaskDialog", () => {
  it("emits project and task selection updates", async () => {
    const wrapper = mountDialog();
    const selects = wrapper.findAll("select");

    await selects[0]?.setValue("project-1");
    await selects[1]?.setValue("task-1");

    expect(wrapper.emitted("update:selectedProjectId")?.[0]).toEqual(["project-1"]);
    expect(wrapper.emitted("update:selectedTaskId")?.[0]).toEqual(["task-1"]);
  });

  it("emits create-task and confirm actions when the buttons are clicked", async () => {
    const wrapper = mountDialog();
    const createTaskButton = wrapper
      .findAll("button")
      .find((button) => button.text() === "Create task");
    const confirmButton = wrapper
      .findAll("button")
      .find((button) => button.text() === "Use selected task");

    await createTaskButton?.trigger("click");
    await confirmButton?.trigger("click");

    expect(wrapper.emitted("createTask")?.length).toBeGreaterThan(0);
    expect(wrapper.emitted("confirm")?.length).toBeGreaterThan(0);
  });

  it("renders a distinct task-loading state for the selected project", () => {
    const wrapper = mountDialog({ isLoadingTasks: true, taskOptions: [] });

    expect(wrapper.find('[data-testid="spinner"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain("No active tasks in this project.");
    expect(wrapper.text()).not.toContain("Could not load tasks for this project.");
  });

  it("renders a distinct project request-error state", () => {
    const wrapper = mountDialog({ projectsErrorMessage: "projects failed" });

    expect(wrapper.text()).toContain("Could not load visible projects.");
    expect(wrapper.text()).toContain("projects failed");
  });

  it("renders a distinct task request-error state", () => {
    const wrapper = mountDialog({ tasksErrorMessage: "network down", taskOptions: [] });

    expect(wrapper.text()).toContain("Could not load tasks for this project.");
    expect(wrapper.text()).toContain("network down");
    expect(wrapper.text()).not.toContain("No active tasks in this project.");
  });

  it("renders a distinct empty task state", () => {
    const wrapper = mountDialog({ taskOptions: [], selectedTaskId: null });

    expect(wrapper.text()).toContain("No active tasks in this project.");
    expect(wrapper.text()).toContain("Create one below or choose a different project.");
  });

  it("renders create-task validation feedback and keeps confirm disabled until a task is selected", () => {
    const wrapper = mountDialog({
      createTaskErrorMessage: "Task title is required.",
      isConfirmSelectionDisabled: true,
      selectedTaskId: null,
      taskOptions: [],
    });
    const confirmButton = wrapper
      .findAll("button")
      .find((button) => button.text() === "Use selected task");

    expect(wrapper.text()).toContain("Task title is required.");
    expect(confirmButton?.attributes("disabled")).toBeDefined();
  });
});
