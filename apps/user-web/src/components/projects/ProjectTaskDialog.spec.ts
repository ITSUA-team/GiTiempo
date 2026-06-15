import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import ProjectTaskDialog from "./ProjectTaskDialog.vue";

function findButtonByLabel(
  wrapper: ReturnType<typeof mountDialog>,
  label: string,
) {
  return wrapper.findAll("button").find((button) => button.text() === label);
}

function mountDialog(
  overrides: Partial<InstanceType<typeof ProjectTaskDialog>["$props"]> = {},
) {
  return mount(ProjectTaskDialog, {
    props: {
      errors: {
        assigneeIds: null,
        description: null,
        priority: null,
        projectId: null,
        status: null,
        title: null,
      },
      assigneeIds: [],
      assigneeOptions: [
        {
          label: "Alexey Tsukanov",
          value: "user-1",
        },
      ],
      description: "",
      isDeleting: false,
      isOpen: true,
      isSaving: false,
      mode: "create",
      priority: "medium",
      projectId: null,
      projects: [
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
        {
          color: null,
          createdAt: "2026-04-20T12:00:00.000Z",
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
      requestErrorMessage: null,
      saveLabel: "Create task",
      status: "open",
      subtitle: "Create a task in one of your visible projects.",
      title: "New task",
      valueTitle: "",
      ...overrides,
    },
    global: {
      stubs: {
        AutoComplete: {
          name: "AutoComplete",
          props: [
            "completeOnFocus",
            "dataKey",
            "disabled",
            "dropdown",
            "dropdownMode",
            "forceSelection",
            "inputId",
            "minLength",
            "modelValue",
            "multiple",
            "optionLabel",
            "suggestions",
          ],
          emits: ["complete", "update:modelValue"],
          data() {
            return {
              isOpen: false,
              isSearching: false,
            };
          },
          watch: {
            suggestions() {
              if (this.isSearching) {
                this.isOpen = true;
                this.isSearching = false;
              }
            },
          },
          computed: {
            displayValue(): string {
              if (Array.isArray(this.modelValue)) {
                return this.modelValue
                  .map((value: Record<string, string>) =>
                    value[this.optionLabel] ?? String(value),
                  )
                  .join(", ");
              }

              return typeof this.modelValue === "string"
                ? this.modelValue
                : this.modelValue?.[this.optionLabel] ?? "";
            },
            isMultiple(): boolean {
              return this.multiple !== undefined && this.multiple !== false;
            },
          },
          methods: {
            complete(payload: { query?: string }) {
              this.isSearching = true;
              this.$emit("complete", payload);
            },
          },
          template: `
            <div class="autocomplete" :data-testid="inputId">
              <input
                :data-complete-on-focus="String(completeOnFocus === true || completeOnFocus === '')"
                :data-dropdown="String(dropdown !== undefined && dropdown !== false)"
                :data-dropdown-mode="dropdownMode ?? ''"
                :data-force-selection="String(forceSelection !== undefined && forceSelection !== false)"
                :data-min-length="String(minLength)"
                :disabled="disabled"
                :value="displayValue"
                @input="$emit('update:modelValue', $event.target.value)"
              />
              <button :data-testid="inputId + '-complete'" type="button" @click="complete({ query: '' })">Complete</button>
              <button :data-testid="inputId + '-complete-missing-query'" type="button" @click="complete({})">Complete missing query</button>
              <button :data-testid="inputId + '-complete-empty'" type="button" @click="complete({ query: '' })">Complete empty</button>
              <button :data-testid="inputId + '-complete-admin'" type="button" @click="complete({ query: 'admin' })">Complete admin</button>
              <template v-if="isOpen">
                <button
                  v-for="suggestion in suggestions"
                  :key="suggestion[dataKey] ?? suggestion.value"
                  :data-testid="inputId + '-option-' + (suggestion[dataKey] ?? suggestion.value)"
                  type="button"
                  @click="$emit('update:modelValue', isMultiple ? [...(modelValue ?? []), suggestion] : suggestion)"
                >{{ suggestion[optionLabel] }}</button>
              </template>
              <button :data-testid="inputId + '-clear'" type="button" @click="$emit('update:modelValue', isMultiple ? [] : null)">Clear</button>
            </div>
          `,
        },
        Button: {
          props: ["disabled", "label", "loading", "severity", "variant"],
          emits: ["click"],
          template:
            '<button :data-loading="String(loading)" :data-severity="severity" :data-variant="variant" :disabled="disabled" type="button" @click="$emit(\'click\')">{{ label }}</button>',
        },
        Dialog: {
          props: ["closable", "dismissableMask", "visible"],
          emits: ["update:visible"],
          template:
            '<div v-if="visible" :data-closable="closable" :data-dismissable-mask="dismissableMask"><button data-testid="dialog-close" type="button" @click="$emit(\'update:visible\', false)">Close</button><slot name="header" /><slot /><slot name="footer" /></div>',
        },
        InputText: {
          props: ["modelValue"],
          emits: ["update:modelValue"],
          template:
            '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
        Select: {
          props: ["disabled", "modelValue", "optionLabel", "optionValue", "options"],
          emits: ["update:modelValue"],
          template:
            '<select :disabled="disabled" :value="modelValue" @change="$emit(\'update:modelValue\', $event.target.value)"><option v-for="option in options" :key="option[optionValue] ?? option.id" :value="option[optionValue] ?? option.id">{{ option[optionLabel] ?? option.name }}</option></select>',
        },
        Textarea: {
          props: ["modelValue"],
          emits: ["update:modelValue"],
          template:
            '<textarea :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
      },
    },
  });
}

describe("ProjectTaskDialog", () => {
  it("renders the create form and emits metadata updates", async () => {
    const wrapper = mountDialog({ projectId: "project-1" });
    const selects = wrapper.findAll("select");
    const titleInput = wrapper.findAll("input")[1]!;
    const textarea = wrapper.get("textarea");

    await wrapper.get('[data-testid="project-task-project-complete"]').trigger("click");
    await wrapper.get('[data-testid="project-task-project-option-project-1"]').trigger("click");
    await selects[0]?.setValue("high");
    await selects[1]?.setValue("closed");
    await wrapper.get('[data-testid="project-task-assignee-complete"]').trigger("click");
    await wrapper.get('[data-testid="project-task-assignee-option-user-1"]').trigger("click");
    await titleInput.setValue("Write release checklist");
    await textarea.setValue("Coordinate release validation.");

    expect(wrapper.emitted("update:projectId")?.[0]).toEqual(["project-1"]);
    expect(wrapper.emitted("update:priority")?.[0]).toEqual(["high"]);
    expect(wrapper.emitted("update:status")?.[0]).toEqual(["closed"]);
    expect(wrapper.emitted("update:assigneeIds")?.[0]).toEqual([["user-1"]]);
    expect(wrapper.emitted("update:title")?.[0]).toEqual([
      "Write release checklist",
    ]);
    expect(wrapper.emitted("update:description")?.[0]).toEqual([
      "Coordinate release validation.",
    ]);
    expect(wrapper.text()).toContain("Create task");
    expect(wrapper.text()).not.toContain("Cancel");
  });

  it("uses project autocomplete and shows all projects on empty dropdown query", async () => {
    const wrapper = mountDialog();
    const projectAutoComplete = wrapper.get('[data-testid="project-task-project"]');
    const projectInput = projectAutoComplete.get("input");

    expect(projectInput.attributes("data-complete-on-focus")).toBe("true");
    expect(projectInput.attributes("data-dropdown")).toBe("true");
    expect(projectInput.attributes("data-dropdown-mode")).toBe("blank");
    expect(projectInput.attributes("data-force-selection")).toBe("true");
    expect(projectInput.attributes("data-min-length")).toBe("0");
    expect(projectAutoComplete.find("select").exists()).toBe(false);

    await wrapper.get('[data-testid="project-task-project-complete-admin"]').trigger("click");
    expect(projectAutoComplete.text()).toContain("Admin Web");
    expect(projectAutoComplete.text()).not.toContain("Project Orion");

    await wrapper.get('[data-testid="project-task-project-complete-empty"]').trigger("click");
    expect(projectAutoComplete.text()).toContain("Admin Web");
    expect(projectAutoComplete.text()).toContain("Project Orion");
  });

  it("shows all available assignees for an empty autocomplete query", async () => {
    const wrapper = mountDialog({
      assigneeOptions: [
        { label: "Alexey Tsukanov", value: "user-1" },
        { label: "Maria Ivanenko", value: "user-2" },
      ],
      projectId: "project-1",
    });
    const assigneeAutoComplete = wrapper.get('[data-testid="project-task-assignee"]');

    await wrapper
      .get('[data-testid="project-task-assignee-complete-missing-query"]')
      .trigger("click");

    expect(assigneeAutoComplete.text()).toContain("Alexey Tsukanov");
    expect(assigneeAutoComplete.text()).toContain("Maria Ivanenko");
  });

  it("renders edit mode with a display-only project field and status select", () => {
    const wrapper = mountDialog({
      mode: "edit",
      projectId: "project-1",
      saveLabel: "Save changes",
      status: "closed",
      title: "Edit task",
      valueTitle: "Improve reports filters",
    });

    const selects = wrapper.findAll("select");
    const autocompleteControls = wrapper.findAll(".autocomplete");
    const projectField = wrapper.get('[role="textbox"][aria-readonly="true"]');

    expect(selects).toHaveLength(2);
    expect(autocompleteControls).toHaveLength(1);
    expect(projectField.attributes("aria-labelledby")).toBe("project-task-project-label");
    expect(wrapper.text()).toContain("Project Orion");
    expect(wrapper.text()).toContain("Delete task");
    expect(wrapper.text()).toContain("Save changes");
    expect(wrapper.text()).not.toContain("Cancel");
  });

  it("renders field-level errors for metadata fields", () => {
    const wrapper = mountDialog({
      errors: {
        assigneeIds: "Choose assigned project members.",
        description: "Description must be at most 2000 characters.",
        priority: "Choose a valid priority.",
        projectId: null,
        status: null,
        title: null,
      },
    });

    expect(wrapper.text()).toContain("Description must be at most 2000 characters.");
    expect(wrapper.text()).toContain("Choose a valid priority.");
    expect(wrapper.text()).toContain("Choose assigned project members.");
  });

  it("renders create mode without the edit-only delete action", () => {
    const wrapper = mountDialog();

    expect(wrapper.text()).toContain("Create task");
    expect(wrapper.text()).not.toContain("Delete task");
    expect(wrapper.text()).not.toContain("Cancel");
  });

  it("emits close from dialog dismissal and save from the primary footer action", async () => {
    const wrapper = mountDialog();

    await wrapper.get('[data-testid="dialog-close"]').trigger("click");
    await findButtonByLabel(wrapper, "Create task")?.trigger("click");

    expect(wrapper.emitted("close")?.length).toBeGreaterThan(0);
    expect(wrapper.emitted("save")?.length).toBeGreaterThan(0);
  });

  it("keeps the dialog shell non-closable while saving", () => {
    const wrapper = mountDialog({ isSaving: true });

    const dialogShell = wrapper.get("div[data-closable][data-dismissable-mask]");

    expect(dialogShell.attributes("data-closable")).toBe("false");
    expect(dialogShell.attributes("data-dismissable-mask")).toBe("false");
  });

  it("emits delete from the edit-only destructive action", async () => {
    const wrapper = mountDialog({
      mode: "edit",
      projectId: "project-1",
      saveLabel: "Save changes",
      title: "Edit task",
      valueTitle: "Improve reports filters",
    });
    const deleteButton = findButtonByLabel(wrapper, "Delete task");

    expect(deleteButton?.attributes("data-severity")).toBe("danger");
    expect(deleteButton?.attributes("data-variant")).toBe("outlined");

    await deleteButton?.trigger("click");

    expect(wrapper.emitted("deleteTask")?.length).toBe(1);
  });
});
