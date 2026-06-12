import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import ProjectTaskDialog from "./ProjectTaskDialog.vue";

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
          props: ["disabled", "label"],
          emits: ["click"],
          template:
            '<button :disabled="disabled" type="button" @click="$emit(\'click\')">{{ label }}</button>',
        },
        Dialog: {
          props: ["closable", "dismissableMask"],
          template:
            '<div :data-closable="closable" :data-dismissable-mask="dismissableMask"><slot name="header" /><slot /><slot name="footer" /></div>',
        },
        InputText: {
          props: ["modelValue"],
          emits: ["update:modelValue"],
          template:
            '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
        },
        AutoComplete: {
          props: {
            disabled: Boolean,
            inputId: String,
            modelValue: null,
            multiple: Boolean,
            optionLabel: String,
            suggestions: Array,
          },
          emits: ["complete", "update:modelValue"],
          template: `
            <div class="autocomplete" :data-disabled="disabled" :data-input-id="inputId">
              <button :data-testid="inputId + '-complete'" type="button" @click="$emit('complete', { query: '' })">Complete</button>
              <button
                v-for="option in suggestions"
                :key="option.id ?? option.value"
                :data-testid="inputId + '-option-' + (option.id ?? option.value)"
                type="button"
                @click="$emit('update:modelValue', multiple ? [...(modelValue ?? []), option] : option)"
              >
                {{ option[optionLabel] }}
              </button>
              <button :data-testid="inputId + '-clear'" type="button" @click="$emit('update:modelValue', multiple ? [] : null)">Clear</button>
            </div>
          `,
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
    const input = wrapper.get("input");
    const textarea = wrapper.get("textarea");

    await wrapper.get('[data-testid="project-task-project-complete"]').trigger("click");
    await wrapper.get('[data-testid="project-task-project-option-project-1"]').trigger("click");
    await selects[0]?.setValue("high");
    await selects[1]?.setValue("closed");
    await wrapper.get('[data-testid="project-task-assignee-complete"]').trigger("click");
    await wrapper.get('[data-testid="project-task-assignee-option-user-1"]').trigger("click");
    await input.setValue("Write release checklist");
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
    expect(wrapper.text()).toContain("Save changes");
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

  it("emits close and save actions from the footer buttons", async () => {
    const wrapper = mountDialog();
    const buttons = wrapper
      .findAll("button")
      .filter((button) => ["Cancel", "Create task"].includes(button.text()));

    await buttons[0]?.trigger("click");
    await buttons[1]?.trigger("click");

    expect(wrapper.emitted("close")?.length).toBeGreaterThan(0);
    expect(wrapper.emitted("save")?.length).toBeGreaterThan(0);
  });

  it("keeps the dialog shell non-closable while saving", () => {
    const wrapper = mountDialog({ isSaving: true });

    const dialogShell = wrapper.get("div[data-closable][data-dismissable-mask]");

    expect(dialogShell.attributes("data-closable")).toBe("false");
    expect(dialogShell.attributes("data-dismissable-mask")).toBe("false");
  });
});
