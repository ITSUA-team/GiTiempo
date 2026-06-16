import { mount } from "@vue/test-utils";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import TimeEntryDialog from "./TimeEntryDialog.vue";

function findButtonByLabel(
  wrapper: ReturnType<typeof mountDialog>,
  label: string,
) {
  return wrapper.findAll("button").find((button) => button.text() === label);
}

function formatLocalWallClock(value: Date | null | undefined): string {
  if (!(value instanceof Date)) {
    return "";
  }

  return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
}

function mountDialog(
  overrides: Partial<InstanceType<typeof TimeEntryDialog>["$props"]> = {},
) {
  return mount(TimeEntryDialog, {
    props: {
      dialogErrorMessage: null,
      endedAt: new Date("2026-04-21T10:30:00.000Z"),
      errors: {
        description: null,
        endedAt: null,
        projectId: null,
        startedAt: null,
        taskId: null,
      },
      isLoadingProjects: false,
      isLoadingTasks: false,
      isDeleting: false,
      isOpen: true,
      isSaving: false,
      mode: "edit",
      projectId: "project-1",
      projects: [
        {
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
        },
        {
          color: null,
          createdAt: "2026-04-20T12:00:00.000Z",
          defaultBillableForTasks: false,
          description: null,
          id: "project-2",
          isActive: true,
          members: [],
          name: "Admin Web",
          source: "manual",
          totalSeconds: 3600,
          updatedAt: "2026-04-20T12:00:00.000Z",
          visibility: "private",
          workspaceId: "workspace-1",
        },
      ],
      projectsErrorMessage: null,
      saveLabel: "Save changes",
      startedAt: new Date("2026-04-21T09:00:00.000Z"),
      subtitle:
        "Update the selected time entry using the same popup layout as create mode.",
      taskSuggestions: [
        {
          id: "task-1",
          isActive: true,
          projectId: "project-1",
          title: "Improve reports filters",
        },
        {
          id: "task-2",
          isActive: true,
          projectId: "project-1",
          title: "Write release checklist",
        },
      ],
      taskValue: {
        id: "task-1",
        isActive: true,
        projectId: "project-1",
        title: "Improve reports filters",
      },
      tasksErrorMessage: null,
      title: "Edit time entry",
      valueDescription: "Summarize PM scope changes for the reports table.",
      valueIsBillable: true,
      ...overrides,
    },
    global: {
      stubs: {
        AutoComplete: {
          name: "AutoComplete",
          props: [
            "modelValue",
            "suggestions",
            "invalid",
            "disabled",
            "completeOnFocus",
            "dataKey",
            "forceSelection",
            "inputId",
            "optionLabel",
            "dropdownMode",
            "minLength",
            "pt",
          ],
          emits: ["complete", "update:modelValue"],
          computed: {
            displayValue(): string {
              return typeof this.modelValue === "string"
                ? this.modelValue
                : this.modelValue?.[this.optionLabel] ?? "";
            },
          },
          template: `
            <div :data-testid="inputId">
              <input
                :data-testid="inputId + '-input'"
                :disabled="disabled"
                :value="displayValue"
                @click="$emit('complete', { query: displayValue })"
                @focus="$emit('complete', { query: displayValue })"
                @input="$emit('update:modelValue', $event.target.value)"
              />
              <button
                :data-testid="inputId + '-complete-empty'"
                type="button"
                @click="$emit('complete', { query: '' })"
              >Complete empty</button>
              <button
                :data-testid="inputId + '-complete-admin'"
                type="button"
                @click="$emit('complete', { query: 'admin' })"
              >Complete admin</button>
              <button
                :data-testid="inputId + '-dropdown'"
                type="button"
                @click="$emit('complete', { query: dropdownMode === 'current' ? displayValue : '' })"
                @mousedown="pt?.dropdown?.onMousedown?.($event)"
              >Dropdown</button>
              <button
                v-for="suggestion in suggestions"
                :key="suggestion[dataKey] ?? suggestion.id"
                :data-testid="inputId + '-option-' + (suggestion[dataKey] ?? suggestion.id)"
                type="button"
                @click="$emit('update:modelValue', suggestion)"
              >{{ suggestion[optionLabel] }}</button>
            </div>
          `,
          methods: {
            search(event: Event, query: string): void {
              this.$emit("complete", { originalEvent: event, query });
            },
          },
        },
        Button: {
          props: ["disabled", "label", "loading", "severity", "variant"],
          emits: ["click"],
          template:
            '<button :data-loading="String(loading)" :data-severity="severity" :data-variant="variant" :disabled="disabled" type="button" @click="$emit(\'click\')">{{ label }}</button>',
        },
        Checkbox: {
          props: ["modelValue", "disabled"],
          emits: ["update:modelValue"],
          template:
            '<input :checked="modelValue" :disabled="disabled" type="checkbox" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
        },
        DatePicker: {
          props: ["modelValue", "dateFormat", "disabled", "inputId", "invalid"],
          emits: ["update:modelValue"],
          computed: {
            displayValue(): string {
              return formatLocalWallClock(this.modelValue);
            },
          },
          template:
            '<input :data-date-format="dateFormat" :data-testid="inputId" :disabled="disabled" :value="displayValue" @input="$emit(\'update:modelValue\', $event.target.value ? new Date($event.target.value) : null)" />',
        },
        Dialog: {
          props: ["visible"],
          emits: ["update:visible"],
          template:
            '<div v-if="visible"><button data-testid="dialog-close" type="button" @click="$emit(\'update:visible\', false)">Close</button><slot name="header" /><slot /><slot name="footer" /></div>',
        },
        Textarea: {
          props: ["modelValue", "disabled"],
          emits: ["update:modelValue"],
          template:
            '<textarea :disabled="disabled" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
      },
    },
  });
}

describe("TimeEntryDialog", () => {
  beforeAll(() => {
    vi.stubEnv("TZ", "Europe/Kiev");
  });

  afterAll(() => {
    vi.unstubAllEnvs();
  });

  it("renders the approved field order and edit prefill values", () => {
    const wrapper = mountDialog();

    expect(wrapper.text()).toContain("Project");
    expect(wrapper.text()).toContain("Task");
    expect(wrapper.text()).toContain("Start");
    expect(wrapper.text()).toContain("End");
    expect(wrapper.text()).toContain("Description");
    expect(wrapper.text()).toContain("Billable entry");
    expect(wrapper.text()).not.toContain("Create mode starts");
    expect(wrapper.text()).toContain("Delete entry");
    expect(wrapper.text()).toContain("Save changes");
    expect(wrapper.text()).not.toContain("Cancel");
    expect(wrapper.find('[data-testid="time-entry-project"]').exists()).toBe(true);
    expect(wrapper.find("select").exists()).toBe(false);
    expect(wrapper.find("textarea").element.value).toContain("Summarize PM scope changes");
  });

  it("renders create mode without the edit-only delete action", () => {
    const wrapper = mountDialog({
      mode: "create",
      saveLabel: "Save entry",
      title: "New time entry",
    });

    expect(wrapper.text()).toContain("Save entry");
    expect(wrapper.text()).not.toContain("Delete entry");
    expect(wrapper.text()).not.toContain("Cancel");
  });

  it("renders edit date picker values as browser-local wall-clock times", () => {
    const startedAt = new Date(2026, 3, 21, 9, 0, 0, 0);
    const endedAt = new Date(2026, 3, 21, 10, 30, 0, 0);
    const wrapper = mountDialog({
      endedAt,
      startedAt,
    });

    expect(startedAt.toISOString()).toBe("2026-04-21T06:00:00.000Z");
    expect(
      (wrapper.get('[data-testid="time-entry-started-at"]').element as HTMLInputElement).value,
    ).toBe("09:00");
    expect(wrapper.get('[data-testid="time-entry-started-at"]').attributes("data-date-format")).toBe(
      "M d,",
    );
    expect(
      (wrapper.get('[data-testid="time-entry-ended-at"]').element as HTMLInputElement).value,
    ).toBe("10:30");
    expect(wrapper.get('[data-testid="time-entry-ended-at"]').attributes("data-date-format")).toBe(
      "M d,",
    );
  });

  it("emits project, task, date, description, and billable updates", async () => {
    const wrapper = mountDialog();

    await wrapper.get('[data-testid="time-entry-project-option-project-1"]').trigger("click");
    await wrapper.get('[data-testid="time-entry-task-input"]').setValue("Improve reports filters");
    await wrapper.get('[data-testid="time-entry-started-at"]').setValue("2026-04-21T09:15:00.000Z");
    await wrapper.get('[data-testid="time-entry-ended-at"]').setValue("2026-04-21T10:45:00.000Z");
    await wrapper.find('input[type="checkbox"]').setValue(false);
    await wrapper.find("textarea").setValue("Updated description");

    expect(wrapper.emitted("update:projectId")?.[0]).toEqual(["project-1"]);
    expect(wrapper.emitted("update:taskValue")?.[0]).toEqual(["Improve reports filters"]);
    expect(wrapper.emitted("update:startedAt")?.[0]?.[0]).toBeInstanceOf(Date);
    expect(wrapper.emitted("update:endedAt")?.[0]?.[0]).toBeInstanceOf(Date);
    expect(wrapper.emitted("update:isBillable")?.[0]).toEqual([false]);
    expect(wrapper.emitted("update:description")?.[0]).toEqual(["Updated description"]);
  });

  it("configures task lookup to suggest all project tasks on empty input", () => {
    const wrapper = mountDialog();
    const autoComplete = wrapper.findAllComponents({ name: "AutoComplete" })[1]!;

    expect(autoComplete.props("completeOnFocus")).toBe("");
    expect(autoComplete.props("dropdownMode")).toBe("blank");
    expect(autoComplete.props("minLength")).toBe(0);
  });

  it("shows all project suggestions again when the project query is empty", async () => {
    const wrapper = mountDialog();
    const projectAutoComplete = wrapper.get('[data-testid="time-entry-project"]');

    await wrapper.get('[data-testid="time-entry-project-complete-admin"]').trigger("click");

    expect(projectAutoComplete.text()).toContain("Admin Web");
    expect(projectAutoComplete.text()).not.toContain("Project Orion");

    await wrapper.get('[data-testid="time-entry-project-complete-empty"]').trigger("click");

    expect(projectAutoComplete.text()).toContain("Admin Web");
    expect(projectAutoComplete.text()).toContain("Project Orion");
  });

  it("shows all project suggestions for an empty create-mode project autocomplete", async () => {
    const wrapper = mountDialog({
      mode: "create",
      projectId: null,
      saveLabel: "Save entry",
      taskValue: null,
      title: "New time entry",
    });
    const projectComponent = wrapper.findAllComponents({ name: "AutoComplete" })[0]!;
    const projectAutoComplete = wrapper.get('[data-testid="time-entry-project"]');
    const initialSuggestions = projectComponent.props("suggestions");

    await wrapper.get('[data-testid="time-entry-project-input"]').trigger("click");

    expect(projectAutoComplete.text()).toContain("Admin Web");
    expect(projectAutoComplete.text()).toContain("Project Orion");
    expect(projectComponent.props("suggestions")).not.toBe(initialSuggestions);

    await wrapper.get('[data-testid="time-entry-project-complete-admin"]').trigger("click");

    expect(projectAutoComplete.text()).toContain("Admin Web");
    expect(projectAutoComplete.text()).not.toContain("Project Orion");

    await wrapper.get('[data-testid="time-entry-project-input"]').setValue("");

    expect(projectAutoComplete.text()).toContain("Admin Web");
    expect(projectAutoComplete.text()).toContain("Project Orion");
    expect(wrapper.emitted("update:projectId")?.at(-1)).toEqual([null]);
  });

  it("keeps typed project text when opening the create-mode dropdown", async () => {
    const wrapper = mountDialog({
      mode: "create",
      projectId: null,
      saveLabel: "Save entry",
      taskValue: null,
      title: "New time entry",
    });
    const projectComponent = wrapper.findAllComponents({ name: "AutoComplete" })[0]!;
    const projectAutoComplete = wrapper.get('[data-testid="time-entry-project"]');
    const projectInput = wrapper.get('[data-testid="time-entry-project-input"]');
    const projectDropdown = wrapper.get('[data-testid="time-entry-project-dropdown"]');

    expect(projectComponent.props("dropdownMode")).toBe("blank");

    await projectInput.setValue("admin");
    const mouseDown = new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
    });

    projectDropdown.element.dispatchEvent(mouseDown);
    await projectDropdown.trigger("click");

    expect(mouseDown.defaultPrevented).toBe(true);
    expect((projectInput.element as HTMLInputElement).value).toBe("admin");
    expect(projectAutoComplete.text()).toContain("Admin Web");
    expect(projectAutoComplete.text()).toContain("Project Orion");
    expect(wrapper.emitted("update:projectId")).toBeUndefined();
  });

  it("keeps the selected project visible after choosing a create-mode suggestion", async () => {
    const wrapper = mountDialog({
      mode: "create",
      projectId: null,
      saveLabel: "Save entry",
      taskValue: null,
      title: "New time entry",
    });
    const projectInput = wrapper.get('[data-testid="time-entry-project-input"]');

    await projectInput.setValue("admin");
    await wrapper.get('[data-testid="time-entry-project-option-project-2"]').trigger("click");

    expect((projectInput.element as HTMLInputElement).value).toBe("Admin Web");
    expect(wrapper.emitted("update:projectId")?.at(-1)).toEqual(["project-2"]);
  });

  it("keeps the selected task visible after choosing a suggestion", async () => {
    const wrapper = mountDialog({
      mode: "create",
      saveLabel: "Save entry",
      taskValue: null,
      title: "New time entry",
    });
    const taskInput = wrapper.get('[data-testid="time-entry-task-input"]');

    await taskInput.setValue("release");
    await wrapper.get('[data-testid="time-entry-task-option-task-2"]').trigger("click");

    expect((taskInput.element as HTMLInputElement).value).toBe("Write release checklist");
    expect(wrapper.emitted("update:taskValue")?.at(-1)).toEqual([
      {
        id: "task-2",
        isActive: true,
        projectId: "project-1",
        title: "Write release checklist",
      },
    ]);
  });

  it("requests all task suggestions when the task dropdown query is empty", async () => {
    const wrapper = mountDialog();
    const taskAutoComplete = wrapper.get('[data-testid="time-entry-task"]');

    expect(taskAutoComplete.text()).toContain("Improve reports filters");
    expect(taskAutoComplete.text()).toContain("Write release checklist");

    await wrapper.get('[data-testid="time-entry-task-complete-empty"]').trigger("click");

    expect(wrapper.emitted("taskSearch")?.at(-1)).toEqual([""]);
  });

  it("refreshes create-mode task suggestions when the task input is cleared", async () => {
    const wrapper = mountDialog({
      mode: "create",
      saveLabel: "Save entry",
      taskValue: null,
      title: "New time entry",
    });
    const taskInput = wrapper.get('[data-testid="time-entry-task-input"]');

    await taskInput.setValue("reports");
    await taskInput.setValue("");

    expect(wrapper.emitted("taskSearch")?.at(-2)).toEqual(["reports"]);
    expect(wrapper.emitted("taskSearch")?.at(-1)).toEqual([""]);
    expect(wrapper.emitted("update:taskValue")?.at(-1)).toEqual([""]);
  });

  it("renders validation helper errors and retryable api failures", () => {
    const wrapper = mountDialog({
      dialogErrorMessage: "Task is inactive",
      errors: {
        description: "String must contain at most 2000 character(s)",
        endedAt: "endedAt must be later than startedAt",
        projectId: null,
        startedAt: null,
        taskId: "Select a visible task.",
      },
    });

    expect(wrapper.text()).toContain("Could not update this entry.");
    expect(wrapper.text()).toContain("Task is inactive");
    expect(wrapper.text()).toContain("Select a visible task.");
    expect(wrapper.text()).toContain("endedAt must be later than startedAt");
    expect(wrapper.text()).toContain("String must contain at most 2000 character(s)");
  });

  it("emits save from the primary action and close from dialog dismissal", async () => {
    const wrapper = mountDialog();

    await findButtonByLabel(wrapper, "Save changes")?.trigger("click");
    await wrapper.get('[data-testid="dialog-close"]').trigger("click");

    expect(wrapper.emitted("close")?.length).toBeGreaterThan(0);
    expect(wrapper.emitted("save")?.length).toBeGreaterThan(0);
  });

  it("emits delete from the edit-only destructive action", async () => {
    const wrapper = mountDialog();
    const deleteButton = findButtonByLabel(wrapper, "Delete entry");

    expect(deleteButton?.attributes("data-severity")).toBe("danger");
    expect(deleteButton?.attributes("data-variant")).toBe("outlined");

    await deleteButton?.trigger("click");

    expect(wrapper.emitted("deleteEntry")?.length).toBe(1);
  });
});
