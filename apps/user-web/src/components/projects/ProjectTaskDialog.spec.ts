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
        projectId: null,
        status: null,
        title: null,
      },
      isDeleting: false,
      isOpen: true,
      isSaving: false,
      mode: "create",
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
            "optionLabel",
            "suggestions",
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
                :data-complete-on-focus="String(completeOnFocus === true || completeOnFocus === '')"
                :data-dropdown="String(dropdown !== undefined && dropdown !== false)"
                :data-dropdown-mode="dropdownMode ?? ''"
                :data-force-selection="String(forceSelection !== undefined && forceSelection !== false)"
                :data-min-length="String(minLength)"
                :disabled="disabled"
                :value="displayValue"
                @input="$emit('update:modelValue', $event.target.value)"
              />
              <button :data-testid="inputId + '-complete-empty'" type="button" @click="$emit('complete', { query: '' })">Complete empty</button>
              <button :data-testid="inputId + '-complete-admin'" type="button" @click="$emit('complete', { query: 'admin' })">Complete admin</button>
              <button
                v-for="suggestion in suggestions"
                :key="suggestion[dataKey]"
                :data-testid="inputId + '-option-' + suggestion[dataKey]"
                type="button"
                @click="$emit('update:modelValue', suggestion)"
              >{{ suggestion[optionLabel] }}</button>
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
      },
    },
  });
}

describe("ProjectTaskDialog", () => {
  it("renders the create form and emits project and title updates", async () => {
    const wrapper = mountDialog();
    const titleInput = wrapper.findAll("input")[1]!;

    await wrapper.get('[data-testid="project-task-project-option-project-1"]').trigger("click");
    await titleInput.setValue("Write release checklist");

    expect(wrapper.emitted("update:projectId")?.[0]).toEqual(["project-1"]);
    expect(wrapper.emitted("update:title")?.[0]).toEqual([
      "Write release checklist",
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
    expect(wrapper.find("select").exists()).toBe(false);

    await wrapper.get('[data-testid="project-task-project-complete-admin"]').trigger("click");
    expect(projectAutoComplete.text()).toContain("Admin Web");
    expect(projectAutoComplete.text()).not.toContain("Project Orion");

    await wrapper.get('[data-testid="project-task-project-complete-empty"]').trigger("click");
    expect(projectAutoComplete.text()).toContain("Admin Web");
    expect(projectAutoComplete.text()).toContain("Project Orion");
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
    const projectField = wrapper.get('[role="textbox"][aria-readonly="true"]');

    expect(selects).toHaveLength(1);
    expect(projectField.attributes("aria-labelledby")).toBe("project-task-project-label");
    expect(wrapper.text()).toContain("Project Orion");
    expect(wrapper.text()).toContain("Delete task");
    expect(wrapper.text()).toContain("Save changes");
    expect(wrapper.text()).not.toContain("Cancel");
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
