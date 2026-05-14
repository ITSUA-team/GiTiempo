// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import ProjectTaskDialog from "./ProjectTaskDialog.vue";

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
          totalHours: 12,
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
          template:
            '<div><slot name="header" /><slot /><slot name="footer" /></div>',
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
    const input = wrapper.get("input");

    await selects[0]?.setValue("project-1");
    await input.setValue("Write release checklist");

    expect(wrapper.emitted("update:projectId")?.[0]).toEqual(["project-1"]);
    expect(wrapper.emitted("update:title")?.[0]).toEqual([
      "Write release checklist",
    ]);
    expect(wrapper.text()).toContain("Create task");
  });

  it("renders edit mode with a status field and a fixed project selection", () => {
    const wrapper = mountDialog({
      mode: "edit",
      projectId: "project-1",
      saveLabel: "Save changes",
      status: "closed",
      title: "Edit task",
      valueTitle: "Improve reports filters",
    });

    const selects = wrapper.findAll("select");

    expect(selects).toHaveLength(2);
    expect(selects[0]?.attributes("disabled")).toBeDefined();
    expect(wrapper.text()).toContain("Save changes");
  });

  it("emits close and save actions from the footer buttons", async () => {
    const wrapper = mountDialog();
    const buttons = wrapper.findAll("button");

    await buttons[0]?.trigger("click");
    await buttons[1]?.trigger("click");

    expect(wrapper.emitted("close")?.length).toBeGreaterThan(0);
    expect(wrapper.emitted("save")?.length).toBeGreaterThan(0);
  });
});
