import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";

import TopBarTimerTaskDialog from "./TopBarTimerTaskDialog.vue";
import { mockMatchMedia } from "@/test/mockMatchMedia";

function mountDialog(overrides: Partial<InstanceType<typeof TopBarTimerTaskDialog>["$props"]> = {}) {
  return mount(TopBarTimerTaskDialog, {
    props: {
      createTaskErrorMessage: null,
      createTaskTitle: "Write release checklist",
      isConfirmSelectionDisabled: false,
      isConfirmingSelection: false,
      isCreateTaskDisabled: false,
      isCreatingTask: false,
      isLoadingProjects: false,
      isLoadingTasks: false,
      isOpen: true,
      projectOptions: [
        {
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
      ],
      projectsErrorMessage: null,
      selectedDescription: "",
      selectedProjectId: "project-1",
      selectedTaskId: "task-1",
      selectionUpdateErrorMessage: null,
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
          props: ["disabled", "fluid", "label", "loading"],
          template:
            '<button :data-fluid="String(fluid)" :data-loading="String(loading)" :disabled="disabled" type="button" @click="$emit(\'click\')">{{ label }}</button>',
        },
        Dialog: {
          props: {
            blockScroll: { type: Boolean },
            pt: { type: Object, required: true },
          },
          template:
            '<div data-testid="timer-task-dialog" :data-block-scroll="String(blockScroll)" :data-content-class="pt.content" :data-footer-class="pt.footer" :data-root-class="pt.root"><slot name="header" /><slot /><slot name="footer" /></div>',
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
        Textarea: {
          props: ["disabled", "modelValue"],
          emits: ["update:modelValue"],
          template:
            '<textarea :disabled="disabled" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
      },
    },
  });
}

describe("TopBarTimerTaskDialog", () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  it("emits project and task selection updates", async () => {
    const wrapper = mountDialog();
    const selects = wrapper.findAll("select");

    await selects[0]?.setValue("project-1");
    await selects[1]?.setValue("task-1");

    expect(wrapper.emitted("update:selectedProjectId")?.[0]).toEqual(["project-1"]);
    expect(wrapper.emitted("update:selectedTaskId")?.[0]).toEqual(["task-1"]);
  });

  it("emits description updates from the textarea field", async () => {
    const wrapper = mountDialog();

    await wrapper.get("textarea").setValue("Investigate release blocker");

    expect(wrapper.emitted("update:selectedDescription")?.[0]).toEqual([
      "Investigate release blocker",
    ]);
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

  it("renders inline active-timer update errors and confirm loading state", () => {
    const wrapper = mountDialog({
      isConfirmingSelection: true,
      selectionUpdateErrorMessage: "Task is inactive",
    });
    const confirmButton = wrapper
      .findAll("button")
      .find((button) => button.text() === "Use selected task");

    expect(wrapper.text()).toContain("Could not update the active timer task.");
    expect(wrapper.text()).toContain("Task is inactive");
    expect(confirmButton?.attributes("data-loading")).toBe("true");
  });

  it("renders the description field directly below task", () => {
    const wrapper = mountDialog();
    const labels = wrapper.findAll("label").map((label) => label.text().trim());

    expect(labels.indexOf("Description")).toBeGreaterThan(labels.indexOf("Task"));
    expect(labels.indexOf("Description")).toBeLessThan(labels.indexOf("Task title"));
  });

  it("uses mobile-friendly dialog sizing, scrolling, and stacked action rows", () => {
    mockMatchMedia(true);

    const wrapper = mountDialog();
    const dialog = wrapper.get('[data-testid="timer-task-dialog"]');
    const createTaskActions = wrapper.get(
      '[data-testid="top-bar-timer-create-task-actions"]',
    );
    const footer = wrapper.get('[data-testid="top-bar-timer-task-dialog-footer"]');
    const footerButtons = footer.findAll("button");
    const createTaskButton = wrapper
      .findAll("button")
      .find((button) => button.text() === "Create task");
    const confirmButton = wrapper
      .findAll("button")
      .find((button) => button.text() === "Use selected task");

    expect(dialog.attributes("data-block-scroll")).toBe("true");
    expect(dialog.attributes("data-root-class")).toContain(
      "w-[calc(100vw-1rem)]",
    );
    expect(dialog.attributes("data-root-class")).toContain(
      "sm:w-[min(560px,calc(100vw-2rem))]",
    );
    expect(dialog.attributes("data-content-class")).toContain("overflow-y-auto");
    expect(createTaskActions.classes()).toContain("flex-col");
    expect(createTaskActions.classes()).toContain("w-full");
    expect(createTaskActions.classes()).toContain("sm:flex-row");
    expect(footer.classes()).toContain("flex-col");
    expect(footer.classes()).toContain("w-full");
    expect(footer.classes()).not.toContain("sm:flex-row");
    expect(footer.classes()).not.toContain("flex-row");
    expect(footerButtons.map((button) => button.text())).toEqual([
      "Use selected task",
      "Cancel",
    ]);
    expect(createTaskButton?.classes()).toContain("w-full");
    expect(confirmButton?.classes()).toContain("w-full");
    expect(createTaskButton?.attributes("data-fluid")).toBe("true");
    expect(confirmButton?.attributes("data-fluid")).toBe("true");
  });

  it("keeps action buttons intrinsic and cancel-first in DOM order on tablet and desktop", () => {
    const wrapper = mountDialog();
    const footer = wrapper.get('[data-testid="top-bar-timer-task-dialog-footer"]');
    const footerButtons = footer.findAll("button");
    const createTaskButton = wrapper
      .findAll("button")
      .find((button) => button.text() === "Create task");
    const confirmButton = wrapper
      .findAll("button")
      .find((button) => button.text() === "Use selected task");

    expect(footerButtons.map((button) => button.text())).toEqual([
      "Cancel",
      "Use selected task",
    ]);
    expect(footer.classes()).toContain("flex-row");
    expect(footer.classes()).toContain("justify-end");
    expect(footer.classes()).not.toContain("flex-col");
    expect(createTaskButton?.attributes("data-fluid")).toBe("false");
    expect(confirmButton?.attributes("data-fluid")).toBe("false");
    expect(confirmButton?.classes()).toContain("w-auto");
  });
});
