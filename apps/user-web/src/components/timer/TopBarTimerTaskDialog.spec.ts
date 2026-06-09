import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";

import TopBarTimerTaskDialog from "./TopBarTimerTaskDialog.vue";
import { mockMatchMedia } from "@/test/mockMatchMedia";

type DialogProps = Partial<InstanceType<typeof TopBarTimerTaskDialog>["$props"]>;

function mountDialog(overrides: DialogProps = {}) {
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
      isPrimaryActionDisabled: false,
      isPrimaryActionPending: false,
      isTimerRunning: false,
      primaryActionLabel: "Start timer",
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
          totalSeconds: 43200,
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
      timerActionErrorMessage: null,
      ...overrides,
    },
    global: {
      stubs: {
        Button: {
          props: [
            "disabled",
            "fluid",
            "label",
            "loading",
            "severity",
            "text",
          ],
          template:
            '<button :class="$attrs.class" :data-fluid="String(fluid)" :data-loading="String(loading)" :data-severity="severity ?? \'default\'" :data-text="String(text ?? false)" :disabled="disabled" type="button" @click="$emit(\'click\')">{{ label }}</button>',
        },
        Dialog: {
          props: {
            blockScroll: { type: Boolean },
            pt: { type: Object, required: true },
          },
          emits: ["update:visible"],
          template:
            '<div v-if="$attrs.visible !== false" data-testid="timer-task-dialog" :data-block-scroll="String(blockScroll)" :data-content-class="pt.content" :data-footer-class="pt.footer" :data-root-class="pt.root"><button data-testid="dialog-close" type="button" @click="$emit(\'update:visible\', false)">Close</button><slot name="header" /><slot /><slot name="footer" /></div>',
        },
        InputText: {
          props: ["modelValue", "disabled", "invalid"],
          emits: ["update:modelValue"],
          template:
            '<input :disabled="disabled" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
        ProgressSpinner: { template: '<div data-testid="spinner" />' },
        Select: {
          props: ["disabled", "modelValue", "options", "overlayClass", "pt"],
          emits: ["update:modelValue"],
          template:
            '<select :class="$attrs.class" :data-label-pt-class="pt?.label?.class" :data-list-container-pt-class="pt?.listContainer?.class" :data-option-label-pt-class="pt?.optionLabel?.class" :data-overlay-class="overlayClass" :data-root-pt-class="pt?.root?.class" :disabled="disabled" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="option in options" :key="option.id" :value="option.id">{{ option.name ?? option.title }}</option></select>',
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

function findButtonByLabel(wrapper: ReturnType<typeof mountDialog>, label: string) {
  return wrapper.findAll("button").find((button) => button.text() === label);
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

  it("emits create-task and start-timer actions in the idle flow", async () => {
    const wrapper = mountDialog();

    await findButtonByLabel(wrapper, "Create task")?.trigger("click");
    await findButtonByLabel(wrapper, "Start timer")?.trigger("click");

    expect(wrapper.emitted("createTask")?.length).toBeGreaterThan(0);
    expect(wrapper.emitted("primary-action")?.length).toBeGreaterThan(0);
    expect(wrapper.emitted("confirm")).toBeUndefined();
  });

  it("emits change-task and stop-timer actions in the running flow", async () => {
    const wrapper = mountDialog({
      isTimerRunning: true,
      primaryActionLabel: "Stop timer",
    });

    await findButtonByLabel(wrapper, "Change task")?.trigger("click");
    await findButtonByLabel(wrapper, "Stop timer")?.trigger("click");

    expect(wrapper.emitted("confirm")?.length).toBeGreaterThan(0);
    expect(wrapper.emitted("primary-action")?.length).toBeGreaterThan(0);
  });

  it("emits close from built-in dialog dismissal without a footer cancel action", async () => {
    const wrapper = mountDialog();

    await wrapper.get('[data-testid="dialog-close"]').trigger("click");

    expect(wrapper.emitted("close")?.length).toBeGreaterThan(0);
    expect(findButtonByLabel(wrapper, "Cancel")).toBeUndefined();
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

  it("renders create-task validation feedback and keeps idle start disabled until a task is selected", () => {
    const wrapper = mountDialog({
      createTaskErrorMessage: "Task title is required.",
      isPrimaryActionDisabled: true,
      selectedTaskId: null,
      taskOptions: [],
    });
    const primaryButton = findButtonByLabel(wrapper, "Start timer");

    expect(wrapper.text()).toContain("Task title is required.");
    expect(primaryButton?.attributes("disabled")).toBeDefined();
  });

  it("renders inline running-task update errors and confirm loading state", () => {
    const wrapper = mountDialog({
      isConfirmingSelection: true,
      isTimerRunning: true,
      primaryActionLabel: "Stop timer",
      selectionUpdateErrorMessage: "Task is inactive",
    });
    const confirmButton = findButtonByLabel(wrapper, "Change task");

    expect(wrapper.text()).toContain("Could not update the active timer task.");
    expect(wrapper.text()).toContain("Task is inactive");
    expect(confirmButton?.attributes("data-loading")).toBe("true");
  });

  it("renders start and stop timer errors with state-specific copy", () => {
    const idleWrapper = mountDialog({
      timerActionErrorMessage: "Task is closed",
    });

    expect(idleWrapper.text()).toContain("Could not start the timer.");
    expect(idleWrapper.text()).toContain("Task is closed");

    const runningWrapper = mountDialog({
      isTimerRunning: true,
      primaryActionLabel: "Stop timer",
      timerActionErrorMessage: "Timer not found",
    });

    expect(runningWrapper.text()).toContain("Could not stop the timer.");
    expect(runningWrapper.text()).toContain("Timer not found");
  });

  it("renders the description field directly below task", () => {
    const wrapper = mountDialog();
    const labels = wrapper.findAll("label").map((label) => label.text().trim());

    expect(labels.indexOf("Description")).toBeGreaterThan(labels.indexOf("Task"));
    expect(labels.indexOf("Description")).toBeLessThan(labels.indexOf("Task title"));
  });

  it("uses mobile-friendly dialog sizing and idle footer order", () => {
    mockMatchMedia(true);

    const wrapper = mountDialog();
    const dialog = wrapper.get('[data-testid="timer-task-dialog"]');
    const createTaskActions = wrapper.get(
      '[data-testid="top-bar-timer-create-task-actions"]',
    );
    const footer = wrapper.get('[data-testid="top-bar-timer-task-dialog-footer"]');
    const footerButtons = footer.findAll("button");
    const selectFields = wrapper.findAll("select");
    const createTaskButton = findButtonByLabel(wrapper, "Create task");
    const primaryButton = findButtonByLabel(wrapper, "Start timer");

    expect(dialog.attributes("data-block-scroll")).toBe("true");
    expect(dialog.attributes("data-root-class")).toContain("w-[calc(100vw-1rem)]");
    expect(dialog.attributes("data-root-class")).toContain("sm:w-[min(560px,calc(100vw-2rem))]");
    expect(dialog.attributes("data-content-class")).toContain("overflow-y-auto");
    expect(createTaskActions.classes()).toContain("flex-col");
    expect(createTaskActions.classes()).toContain("w-full");
    expect(createTaskActions.classes()).toContain("sm:flex-row");
    expect(footer.classes()).toContain("flex-col");
    expect(footer.classes()).toContain("w-full");
    expect(footerButtons.map((button) => button.text())).toEqual([
      "Start timer",
    ]);
    expect(createTaskButton?.classes()).toContain("w-full");
    expect(primaryButton?.classes()).toContain("w-full");
    expect(createTaskButton?.attributes("data-fluid")).toBe("true");
    expect(primaryButton?.attributes("data-fluid")).toBe("true");
    for (const selectField of selectFields) {
      expect(selectField.classes()).toContain("min-w-0");
      expect(selectField.classes()).toContain("max-w-full");
      expect(selectField.attributes("data-root-pt-class")).toContain("min-w-0");
      expect(selectField.attributes("data-label-pt-class")).toBe("truncate");
      expect(selectField.attributes("data-overlay-class")).toBe("max-w-[calc(100vw-2rem)]");
      expect(selectField.attributes("data-option-label-pt-class")).toBe("truncate");
    }
  });

  it("keeps the mobile running footer ordered as stop then change task", () => {
    mockMatchMedia(true);

    const wrapper = mountDialog({
      isTimerRunning: true,
      primaryActionLabel: "Stop timer",
    });
    const footerButtons = wrapper
      .get('[data-testid="top-bar-timer-task-dialog-footer"]')
      .findAll("button");

    expect(footerButtons.map((button) => button.text())).toEqual([
      "Stop timer",
      "Change task",
    ]);
  });

  it("keeps action buttons intrinsic and desktop footer order aligned with the timer state", () => {
    const idleWrapper = mountDialog();
    const idleButtons = idleWrapper
      .get('[data-testid="top-bar-timer-task-dialog-footer"]')
      .findAll("button");

    expect(idleButtons.map((button) => button.text())).toEqual([
      "Start timer",
    ]);
    expect(idleWrapper.get('[data-testid="top-bar-timer-task-dialog-footer"]').classes()).toContain(
      "flex-row",
    );
    expect(findButtonByLabel(idleWrapper, "Start timer")?.classes()).toContain("w-auto");

    const runningWrapper = mountDialog({
      isTimerRunning: true,
      primaryActionLabel: "Stop timer",
    });
    const runningButtons = runningWrapper
      .get('[data-testid="top-bar-timer-task-dialog-footer"]')
      .findAll("button");

    expect(runningButtons.map((button) => button.text())).toEqual([
      "Change task",
      "Stop timer",
    ]);
    expect(findButtonByLabel(runningWrapper, "Change task")?.attributes("data-severity")).toBe(
      "secondary",
    );
  });
});
