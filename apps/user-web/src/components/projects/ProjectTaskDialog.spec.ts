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
      defaultBillableForTimeEntries: true,
      isDeleting: false,
      isOpen: true,
      isSaving: false,
      mode: "create",
      projectId: null,
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
        Button: {
          props: ["disabled", "label", "loading", "severity", "variant"],
          emits: ["click"],
          template:
            '<button :data-loading="String(loading)" :data-severity="severity" :data-variant="variant" :disabled="disabled" type="button" @click="$emit(\'click\')">{{ label }}</button>',
        },
        Checkbox: {
          props: ["disabled", "modelValue"],
          emits: ["update:modelValue"],
          template:
            '<input :checked="modelValue" :disabled="disabled" type="checkbox" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
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
    const selects = wrapper.findAll("select");
    const input = wrapper
      .findAll("input")
      .find((candidate) => candidate.attributes("type") !== "checkbox");

    await selects[0]?.setValue("project-1");
    await input?.setValue("Write release checklist");

    expect(wrapper.emitted("update:projectId")?.[0]).toEqual(["project-1"]);
    expect(wrapper.emitted("update:title")?.[0]).toEqual([
      "Write release checklist",
    ]);
    expect(wrapper.text()).toContain("Create task");
    expect(wrapper.text()).toContain("Default billable for time entries");
    expect(wrapper.text()).toContain("New time entries for this task inherit this value.");
    expect(wrapper.text()).not.toContain("Cancel");
  });

  it("emits default billable updates", async () => {
    const wrapper = mountDialog({ defaultBillableForTimeEntries: false });

    await wrapper.get('input[type="checkbox"]').setValue(true);

    expect(wrapper.emitted("update:defaultBillableForTimeEntries")?.[0]).toEqual([
      true,
    ]);
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
