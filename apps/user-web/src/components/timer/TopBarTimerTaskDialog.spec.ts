import { mount } from "@vue/test-utils";
import type { ProjectResponse, TaskResponse } from "@gitiempo/shared";
import { beforeEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";

import TopBarTimerTaskDialog from "./TopBarTimerTaskDialog.vue";
import type { TopBarGitHubTaskProposal } from "@/composables/timer/useTopBarTaskPicker";
import { createGitHubIssueTaskSuggestionId } from "@/lib/github-issue-task-suggestions";
import { TOP_BAR_TIMER_NEW_TASK_ID } from "@/lib/top-bar-timer-helpers";
import { mockMatchMedia } from "@/test/mockMatchMedia";

const projectOrion = {
  color: null,
  createdAt: "2026-04-20T12:00:00.000Z",
  defaultBillableForTasks: true,
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
} satisfies ProjectResponse;

const internalOpsProject = {
  ...projectOrion,
  id: "project-2",
  name: "Internal Ops",
} satisfies ProjectResponse;

const githubProject = {
  ...projectOrion,
  name: "octo/repo",
  source: "github",
} satisfies ProjectResponse;

const reportsTask = {
  createdAt: "2026-04-20T12:00:00.000Z",
  defaultBillableForTimeEntries: true,
  githubIssue: null,
  id: "task-1",
  isActive: true,
  projectId: "project-1",
  status: "open",
  title: "Improve reports filters",
  updatedAt: "2026-04-20T12:00:00.000Z",
  workspaceId: "workspace-1",
} satisfies TaskResponse;

const alertTask = {
  ...reportsTask,
  id: "task-2",
  projectId: "project-2",
  title: "Fix alert routing",
} satisfies TaskResponse;

const githubProposal = {
  id: createGitHubIssueTaskSuggestionId("octo/repo", 184),
  isGitHubIssueProposal: true,
  issue: {
    id: "github-issue-184",
    nodeId: null,
    number: 184,
    repository: {
      fullName: "octo/repo",
      name: "repo",
      owner: "octo",
    },
    state: "open",
    title: "Write release checklist",
    updatedAt: "2026-04-21T10:00:00.000Z",
    url: "https://github.com/octo/repo/issues/184",
  },
  repositoryLabel: "octo/repo",
  title: "Write release checklist",
} satisfies TopBarGitHubTaskProposal;

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
      isLoadingGitHubTaskProposals: false,
      isLoadingProjects: false,
      isLoadingTasks: false,
      isOpen: true,
      isPrimaryActionDisabled: false,
      isPrimaryActionPending: false,
      primaryActionLabel: "Start",
      gitHubIssueProposals: [],
      gitHubProposalErrorMessage: null,
      projectOptions: [projectOrion],
      projectsErrorMessage: null,
      selectedDescription: "",
      selectedProjectId: "project-1",
      selectedTaskId: "task-1",
      selectionUpdateErrorMessage: null,
      taskOptions: [reportsTask],
      tasksErrorMessage: null,
      timerActionErrorMessage: null,
      ...overrides,
    },
    global: {
      stubs: {
        AutoComplete: {
          name: "AutoComplete",
          props: [
            "completeOnFocus",
            "appendTo",
            "dataKey",
            "disabled",
            "dropdown",
            "dropdownClass",
            "dropdownMode",
            "fluid",
            "forceSelection",
            "inputId",
            "loading",
            "inputClass",
            "minLength",
            "modelValue",
            "optionLabel",
            "overlayClass",
            "pt",
            "suggestions",
          ],
          emits: ["complete", "update:modelValue"],
          computed: {
            displayValue(): string {
              return typeof this.modelValue === "string"
                ? this.modelValue
                : this.modelValue?.name ?? this.modelValue?.title ?? "";
            },
          },
          template:
            '<div :class="$attrs.class" :data-append-to="appendTo" :data-dropdown="String(dropdown !== undefined && dropdown !== false)" :data-fluid="String(fluid !== undefined && fluid !== false)" :data-force-selection="String(forceSelection !== undefined && forceSelection !== false)" :data-loading="String(loading)" :data-overlay-class="overlayClass" :data-testid="inputId"><input :disabled="disabled" :value="displayValue" @focus="$emit(\'complete\', { query: displayValue })" @input="$emit(\'update:modelValue\', $event.target.value)" /><div data-testid="autocomplete-options"><div v-for="option in suggestions" :key="option.id" data-testid="autocomplete-option"><slot name="option" :option="option">{{ option.name ?? option.title }}</slot></div></div></div>',
        },
        Button: {
          props: ["disabled", "fluid", "label", "loading", "severity", "variant"],
          emits: ["click"],
          template:
            '<button :class="$attrs.class" :data-fluid="String(fluid)" :data-loading="String(loading)" :data-severity="severity" :data-variant="variant" :disabled="disabled" type="button" @click="$emit(\'click\')">{{ label }}</button>',
        },
        Dialog: {
          props: {
            blockScroll: { type: Boolean },
            closable: { type: Boolean, default: true },
            pt: { type: Object, required: true },
          },
          emits: ["update:visible"],
          template:
            '<div v-if="$attrs.visible !== false" data-testid="timer-task-dialog" :data-block-scroll="String(blockScroll)" :data-closable="String(closable)" :data-content-class="pt.content" :data-root-class="pt.root"><slot name="header" /><button v-if="closable" data-testid="timer-task-dialog-close" type="button" @click="$emit(\'update:visible\', false)">Close</button><slot /></div>',
        },
        InputText: {
          props: ["modelValue", "disabled", "invalid"],
          emits: ["update:modelValue"],
          template:
            '<input :disabled="disabled" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
        ProgressSpinner: { template: '<div data-testid="spinner" />' },
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

  it("renders the approved start-timer popup design", async () => {
    const wrapper = mountDialog({ selectedTaskId: TOP_BAR_TIMER_NEW_TASK_ID });
    const dialog = wrapper.get('[data-testid="timer-task-dialog"]');
    const autoCompletes = wrapper.findAllComponents({ name: "AutoComplete" });
    const taskSuggestions = autoCompletes[1]?.props("suggestions") as Array<{
      id: string;
      title: string;
    }>;
    const footer = wrapper.get('[data-testid="top-bar-timer-task-dialog-footer"]');

    expect(dialog.attributes("data-closable")).toBe("true");
    expect(dialog.attributes("data-root-class")).toContain("sm:w-[558px]");
    expect(dialog.attributes("data-root-class")).toContain("bg-surface-primary");
    expect(dialog.attributes("data-root-class")).toContain("shadow-none");
    expect(dialog.attributes("data-content-class")).toContain("overflow-y-auto");
    expect(wrapper.text()).toContain("Start timer");
    expect(wrapper.text()).toContain(
      "Choose a visible project and task, or pick New task before starting the timer.",
    );
    expect(wrapper.findAll("select")).toHaveLength(0);
    expect(autoCompletes).toHaveLength(2);
    expect(autoCompletes[0]?.props("dropdownMode")).toBe("blank");
    expect(autoCompletes[0]?.props("minLength")).toBe(0);
    expect(autoCompletes[1]?.props("dropdownMode")).toBe("blank");
    expect(autoCompletes[1]?.props("minLength")).toBe(0);
    for (const autoComplete of autoCompletes) {
      expect(autoComplete.classes()).toContain("w-full");
      expect(autoComplete.classes()).toContain("max-w-full");
      expect(autoComplete.classes()).toContain("min-w-0");
      expect(autoComplete.attributes("data-dropdown")).toBe("true");
      expect(autoComplete.attributes("data-fluid")).toBe("true");
      expect(autoComplete.attributes("data-force-selection")).toBe("true");
      expect(autoComplete.attributes("data-append-to")).toBe("self");
      expect(autoComplete.attributes("data-overlay-class")).toBe("w-full max-w-full");
    }
    expect(wrapper.text()).not.toContain("AutoComplete");
    expect(taskSuggestions.map((task) => task.title)).toEqual([
      "Improve reports filters",
      "New task",
    ]);
    expect(taskSuggestions.at(-1)?.id).toBe(TOP_BAR_TIMER_NEW_TASK_ID);
    expect(wrapper.text()).toContain(
      "Visible tasks are listed first. New task is the last option.",
    );
    expect(wrapper.find("#top-bar-timer-new-task-title").exists()).toBe(true);
    expect(wrapper.text()).toContain("New task title");
    expect(
      (wrapper.get("#top-bar-timer-new-task-title").element as HTMLInputElement).value,
    ).toBe("Write release checklist");
    expect(wrapper.text()).toContain("Required");
    expect(wrapper.text()).toContain(
      "This task is created in Project Orion and inherits the project billable default when you start the timer.",
    );
    expect(footer.findAll("button").map((button) => button.text())).toEqual([
      "Start timer",
    ]);

    await wrapper.get('[data-testid="timer-task-dialog-close"]').trigger("click");

    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("emits selected project, task, and New task option ids", async () => {
    const wrapper = mountDialog({
      gitHubIssueProposals: [githubProposal],
      projectOptions: [projectOrion, internalOpsProject],
      taskOptions: [reportsTask, alertTask],
    });
    const autoCompletes = wrapper.findAllComponents({ name: "AutoComplete" });

    expect(wrapper.findAll("select")).toHaveLength(0);
    expect(autoCompletes).toHaveLength(2);

    await autoCompletes[0]?.vm.$emit("update:modelValue", "Ops");

    expect(wrapper.emitted("update:selectedProjectId")).toBeUndefined();

    await autoCompletes[0]?.vm.$emit("update:modelValue", internalOpsProject);
    await autoCompletes[1]?.vm.$emit("update:modelValue", alertTask);

    expect(wrapper.emitted("update:selectedProjectId")?.[0]).toEqual(["project-2"]);
    expect(wrapper.emitted("update:selectedTaskId")?.[0]).toEqual(["task-2"]);

    await autoCompletes[1]?.vm.$emit("update:modelValue", {
      id: TOP_BAR_TIMER_NEW_TASK_ID,
      isNewTask: true,
      title: "New task",
    });

    expect(wrapper.emitted("update:selectedTaskId")?.[1]).toEqual([
      TOP_BAR_TIMER_NEW_TASK_ID,
    ]);
  });

  it("renders highlighted GitHub issue options inside the New task form", () => {
    const wrapper = mountDialog({
      gitHubIssueProposals: [githubProposal],
      projectOptions: [githubProject],
      selectedTaskId: TOP_BAR_TIMER_NEW_TASK_ID,
    });
    const autoCompletes = wrapper.findAllComponents({ name: "AutoComplete" });
    const taskSuggestions = autoCompletes[1]?.props("suggestions") as Array<{
      id: string;
      title: string;
    }>;
    const proposalOption = wrapper.get(
      '[data-testid="top-bar-timer-github-proposal-option"]',
    );

    expect(taskSuggestions.map((task) => task.title)).toEqual([
      "Improve reports filters",
      "New task",
    ]);
    expect(taskSuggestions.at(-1)?.id).toBe(TOP_BAR_TIMER_NEW_TASK_ID);
    expect(autoCompletes).toHaveLength(3);
    expect(autoCompletes[2]?.props("suggestions")).toEqual([githubProposal]);
    expect(proposalOption.text()).toContain("GitHub");
    expect(proposalOption.text()).toContain("octo/repo #184");
    expect(proposalOption.text()).toContain("Write release checklist");
  });

  it("prefills the local task title when a GitHub issue is selected", async () => {
    const wrapper = mountDialog({
      createTaskTitle: "",
      gitHubIssueProposals: [githubProposal],
      projectOptions: [githubProject],
      selectedTaskId: TOP_BAR_TIMER_NEW_TASK_ID,
    });
    const githubAutoComplete = wrapper.findAllComponents({ name: "AutoComplete" })[2];

    await githubAutoComplete?.vm.$emit("update:modelValue", githubProposal);
    await nextTick();

    expect(wrapper.find("#top-bar-timer-new-task-title").exists()).toBe(true);
    expect(wrapper.emitted("update:createTaskTitle")?.[0]).toEqual([
      "Write release checklist",
    ]);
    expect(wrapper.text()).toContain(
      "GitHub issue #184 from octo/repo prefills a local task title in octo/repo",
    );
  });

  it("disables selection actions while autocomplete text is not a selected option", async () => {
    const idleWrapper = mountDialog();
    const idleAutoCompletes = idleWrapper.findAllComponents({ name: "AutoComplete" });

    await idleAutoCompletes[1]?.vm.$emit("update:modelValue", "Loose task text");
    await nextTick();

    expect(idleWrapper.emitted("update:selectedTaskId")).toBeUndefined();
    expect(findButtonByLabel(idleWrapper, "Start timer")?.attributes("disabled")).toBeDefined();

    const runningWrapper = mountDialog({ primaryActionLabel: "Stop" });
    const runningAutoCompletes = runningWrapper.findAllComponents({ name: "AutoComplete" });

    await runningAutoCompletes[0]?.vm.$emit("update:modelValue", "Loose project text");
    await nextTick();

    expect(runningWrapper.emitted("update:selectedProjectId")).toBeUndefined();
    expect(runningAutoCompletes[1]?.props("disabled")).toBe(true);
    expect(findButtonByLabel(runningWrapper, "Change task")?.attributes("disabled")).toBeDefined();
    expect(findButtonByLabel(runningWrapper, "Stop timer")?.attributes("disabled")).toBeUndefined();
  });

  it("filters predictive search suggestions by typed text", async () => {
    const wrapper = mountDialog({
      projectOptions: [projectOrion, internalOpsProject],
      taskOptions: [reportsTask, alertTask],
    });
    const autoCompletes = wrapper.findAllComponents({ name: "AutoComplete" });

    await autoCompletes[0]?.vm.$emit("complete", { query: "ops" });
    await autoCompletes[1]?.vm.$emit("complete", { query: "alert" });
    await nextTick();

    expect(
      autoCompletes[0]?.props("suggestions").map((project: typeof projectOrion) => project.name),
    ).toEqual(["Internal Ops"]);
    expect(
      autoCompletes[1]?.props("suggestions").map((task: typeof reportsTask) => task.title),
    ).toEqual(["Fix alert routing", "New task"]);
    expect(autoCompletes[1]?.props("suggestions").at(-1)).toMatchObject({
      id: TOP_BAR_TIMER_NEW_TASK_ID,
      title: "New task",
    });
  });

  it("renders the inline New task title field from the popup design", async () => {
    const wrapper = mountDialog({
      createTaskErrorMessage: "Task title is required.",
      selectedTaskId: TOP_BAR_TIMER_NEW_TASK_ID,
    });

    expect(wrapper.find("#top-bar-timer-new-task-title").exists()).toBe(true);
    expect(wrapper.text()).toContain("New task title");
    expect(wrapper.text()).toContain("Required");
    expect(wrapper.text()).toContain("Task title is required.");

    await wrapper.get("#top-bar-timer-new-task-title").setValue("Write release checklist");

    expect(wrapper.emitted("update:createTaskTitle")?.[0]).toEqual([
      "Write release checklist",
    ]);
  });

  it("emits description updates from the textarea field", async () => {
    const wrapper = mountDialog();

    await wrapper.get("textarea").setValue("Investigate release blocker");

    expect(wrapper.emitted("update:selectedDescription")?.[0]).toEqual([
      "Investigate release blocker",
    ]);
  });

  it("emits primary actions when the timer action button is clicked", async () => {
    const wrapper = mountDialog();

    await findButtonByLabel(wrapper, "Start timer")?.trigger("click");

    expect(wrapper.emitted("primaryAction")?.length).toBeGreaterThan(0);
  });

  it("emits close from built-in dialog dismissal without a footer cancel action", async () => {
    const wrapper = mountDialog();

    await wrapper.get('[data-testid="timer-task-dialog-close"]').trigger("click");

    expect(wrapper.emitted("close")?.length).toBeGreaterThan(0);
    expect(findButtonByLabel(wrapper, "Cancel")).toBeUndefined();
  });

  it("renders a distinct task-loading state for the selected project", () => {
    const wrapper = mountDialog({ isLoadingTasks: true, taskOptions: [] });

    expect(wrapper.find('[data-testid="spinner"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain("No existing active tasks in this project.");
    expect(wrapper.text()).not.toContain("Could not load tasks for this project.");
  });

  it("renders GitHub proposal loading and request-error hints separately", () => {
    const loadingWrapper = mountDialog({
      isLoadingGitHubTaskProposals: true,
      projectOptions: [githubProject],
      selectedTaskId: TOP_BAR_TIMER_NEW_TASK_ID,
    });

    expect(loadingWrapper.text()).toContain("Loading GitHub issue suggestions...");
    expect(
      loadingWrapper.findAllComponents({ name: "AutoComplete" })[2]?.attributes("data-loading"),
    ).toBe("true");

    const errorWrapper = mountDialog({
      gitHubProposalErrorMessage: "GitHub connection required",
      projectOptions: [githubProject],
      selectedTaskId: TOP_BAR_TIMER_NEW_TASK_ID,
    });

    expect(errorWrapper.text()).toContain(
      "GitHub issue suggestions are unavailable: GitHub connection required",
    );
    expect(errorWrapper.text()).not.toContain("Could not load tasks for this project.");
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
    expect(wrapper.text()).not.toContain("No existing active tasks in this project.");
  });

  it("renders a distinct empty task state", () => {
    const wrapper = mountDialog({ taskOptions: [], selectedTaskId: null });

    expect(wrapper.text()).toContain("No existing active tasks in this project.");
    expect(wrapper.text()).toContain(
      "Pick New task to create one, or choose a different project.",
    );
  });

  it("renders create-task validation feedback and keeps start disabled for invalid New task", () => {
    const wrapper = mountDialog({
      createTaskErrorMessage: "Task title is required.",
      isPrimaryActionDisabled: true,
      selectedTaskId: TOP_BAR_TIMER_NEW_TASK_ID,
      taskOptions: [],
    });
    const primaryButton = findButtonByLabel(wrapper, "Start timer");

    expect(wrapper.text()).toContain("Task title is required.");
    expect(primaryButton?.attributes("disabled")).toBeDefined();
  });

  it("renders inline active-timer update errors and change-task loading state", () => {
    const wrapper = mountDialog({
      isConfirmingSelection: true,
      primaryActionLabel: "Stop",
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
      primaryActionLabel: "Stop",
      timerActionErrorMessage: "Timer not found",
    });

    expect(runningWrapper.text()).toContain("Could not stop the timer.");
    expect(runningWrapper.text()).toContain("Timer not found");
  });

  it("renders the description field directly below task", () => {
    const wrapper = mountDialog();
    const labels = wrapper.findAll("label").map((label) => label.text().trim());

    expect(labels.indexOf("Description")).toBeGreaterThan(labels.indexOf("Task"));
    expect(labels).toEqual(["Project", "Task", "Description"]);
  });

  it("renders the New task title directly below task when New task is selected", () => {
    const wrapper = mountDialog({ selectedTaskId: TOP_BAR_TIMER_NEW_TASK_ID });
    const labels = wrapper.findAll("label").map((label) => label.text().trim());

    expect(labels).toEqual(["Project", "Task", "New task title", "Description"]);
  });

  it("renders the GitHub issue selector before New task title for GitHub New task", () => {
    const wrapper = mountDialog({
      gitHubIssueProposals: [githubProposal],
      projectOptions: [githubProject],
      selectedTaskId: TOP_BAR_TIMER_NEW_TASK_ID,
    });
    const labels = wrapper.findAll("label").map((label) => label.text().trim());

    expect(labels).toEqual([
      "Project",
      "Task",
      "GitHub issue",
      "New task title",
      "Description",
    ]);
  });

  it("uses the fixed description input height from the popup design", () => {
    const wrapper = mountDialog();
    const description = wrapper.get("#top-bar-timer-description");

    expect(description.classes()).toContain("h-[82px]");
    expect(description.classes()).toContain("min-h-[82px]");
    expect(description.classes()).toContain("resize-none");
  });

  it("uses mobile-friendly dialog sizing and idle footer order", async () => {
    mockMatchMedia(true);

    const wrapper = mountDialog();
    const dialog = wrapper.get('[data-testid="timer-task-dialog"]');
    const footer = wrapper.get('[data-testid="top-bar-timer-task-dialog-footer"]');
    const footerButtons = footer.findAll("button");
    const predictiveFields = wrapper.findAllComponents({ name: "AutoComplete" });
    const primaryButton = findButtonByLabel(wrapper, "Start timer");

    expect(dialog.attributes("data-block-scroll")).toBe("true");
    expect(dialog.attributes("data-closable")).toBe("true");
    expect(dialog.attributes("data-root-class")).toContain("w-[calc(100vw-1rem)]");
    expect(dialog.attributes("data-root-class")).toContain("sm:w-[558px]");
    expect(dialog.attributes("data-content-class")).toContain("overflow-y-auto");
    expect(footer.classes()).toContain("flex-col");
    expect(footer.classes()).toContain("w-full");
    expect(footerButtons.map((button) => button.text())).toEqual([
      "Start timer",
    ]);
    expect(primaryButton?.classes()).toContain("w-full");
    expect(primaryButton?.attributes("data-fluid")).toBe("true");
    expect(findButtonByLabel(wrapper, "Cancel")).toBeUndefined();
    expect(wrapper.findAll("select")).toHaveLength(0);
    expect(predictiveFields).toHaveLength(2);
    for (const predictiveField of predictiveFields) {
      expect(predictiveField.classes()).toContain("min-w-0");
      expect(predictiveField.classes()).toContain("max-w-full");
      expect(predictiveField.classes()).toContain("w-full");
      expect(predictiveField.attributes("data-dropdown")).toBe("true");
      expect(predictiveField.attributes("data-fluid")).toBe("true");
      expect(predictiveField.attributes("data-force-selection")).toBe("true");
      expect(predictiveField.attributes("data-append-to")).toBe("self");
      expect(predictiveField.attributes("data-overlay-class")).toBe("w-full max-w-full");
    }
  });

  it("keeps the mobile running footer ordered as stop then change task", () => {
    mockMatchMedia(true);

    const wrapper = mountDialog({
      primaryActionLabel: "Stop",
    });
    const footerButtons = wrapper
      .get('[data-testid="top-bar-timer-task-dialog-footer"]')
      .findAll("button");

    expect(footerButtons.map((button) => button.text())).toEqual([
      "Stop timer",
      "Change task",
    ]);
  });

  it("keeps idle popup action intrinsic and right-aligned on tablet and desktop", () => {
    const wrapper = mountDialog();
    const footer = wrapper.get('[data-testid="top-bar-timer-task-dialog-footer"]');
    const footerButtons = footer.findAll("button");
    const primaryButton = findButtonByLabel(wrapper, "Start timer");

    expect(footerButtons.map((button) => button.text())).toEqual([
      "Start timer",
    ]);
    expect(footer.classes()).toContain("flex-row");
    expect(footer.classes()).toContain("justify-end");
    expect(footer.classes()).not.toContain("flex-col");
    expect(primaryButton?.attributes("data-fluid")).toBe("false");
    expect(primaryButton?.classes()).toContain("h-[37px]");
    expect(primaryButton?.classes()).toContain("bg-brand");
    expect(primaryButton?.classes()).toContain("w-auto");
  });

  it("renders the approved running update popup actions", async () => {
    const wrapper = mountDialog({
      primaryActionLabel: "Stop",
      selectedTaskId: TOP_BAR_TIMER_NEW_TASK_ID,
    });
    const footer = wrapper.get('[data-testid="top-bar-timer-task-dialog-footer"]');
    const changeButton = findButtonByLabel(wrapper, "Change task");

    expect(wrapper.text()).toContain("Update timer task");
    expect(wrapper.text()).toContain(
      "Move the running timer to a different task, or pick New task in the selected project.",
    );
    expect(wrapper.text()).toContain(
      "This task is created in Project Orion and inherits the project billable default when you change task.",
    );
    expect(footer.findAll("button").map((button) => button.text())).toEqual([
      "Change task",
      "Stop timer",
    ]);
    expect(changeButton?.attributes("data-severity")).toBe("secondary");
    expect(changeButton?.attributes("data-variant")).toBe("outlined");
    expect(changeButton?.classes()).toContain("h-[37px]");
    expect(changeButton?.classes()).toContain("border-divider");

    await changeButton?.trigger("click");
    await findButtonByLabel(wrapper, "Stop timer")?.trigger("click");

    expect(wrapper.emitted("confirm")?.length).toBeGreaterThan(0);
    expect(wrapper.emitted("primaryAction")?.length).toBeGreaterThan(0);
  });
});
