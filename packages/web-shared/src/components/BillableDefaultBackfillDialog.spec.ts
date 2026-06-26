import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import BillableDefaultBackfillDialog from "./BillableDefaultBackfillDialog.vue";

function mountDialog(
  overrides: Partial<InstanceType<typeof BillableDefaultBackfillDialog>["$props"]> = {},
) {
  return mount(BillableDefaultBackfillDialog, {
    props: {
      entityName: "Project Orion",
      hasTimeEntries: true,
      hasTasks: true,
      isOpen: true,
      isSubmitting: false,
      updateTasks: true,
      updateTimeEntries: false,
      variant: "project",
      ...overrides,
    },
    global: {
      stubs: {
        Button: {
          props: ["disabled", "label", "loading", "type"],
          emits: ["click"],
          template:
            '<button :data-loading="String(loading)" :disabled="disabled" :type="type" @click="$emit(\'click\')">{{ label }}</button>',
        },
        Checkbox: {
          props: ["modelValue", "disabled", "inputId"],
          emits: ["update:modelValue"],
          template:
            '<input :id="inputId" :checked="modelValue" :disabled="disabled" type="checkbox" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
        },
        Dialog: {
          props: ["closable", "dismissableMask", "visible"],
          emits: ["update:visible"],
          template:
            '<div v-if="visible" :data-closable="String(closable)" :data-dismissable-mask="String(dismissableMask)"><button data-testid="dialog-close" type="button" @click="$emit(\'update:visible\', false)">Close</button><slot name="header" /><slot /><slot name="footer" /></div>',
        },
      },
    },
  });
}

describe("BillableDefaultBackfillDialog", () => {
  it("renders the approved project propagation choices without a keep-future action", () => {
    const wrapper = mountDialog();

    expect(wrapper.text()).toContain("Update project billable default?");
    expect(wrapper.text()).toContain(
      "The new project default is already saved for future tasks.",
    );
    expect(wrapper.text()).toContain("Update existing tasks in this project");
    expect(wrapper.text()).toContain("Update existing time entries in this project");
    expect(wrapper.text()).toContain("Update existing records");
    expect(wrapper.text().toLowerCase()).not.toContain("keep future defaults only");
  });

  it("renders the task propagation copy and only the task time-entry choice", () => {
    const wrapper = mountDialog({
      entityName: "Improve reports filters",
      updateTasks: false,
      updateTimeEntries: true,
      variant: "task",
    });

    expect(wrapper.text()).toContain("Update task billable default?");
    expect(wrapper.text()).toContain(
      "The new task default is already saved for future time entries.",
    );
    expect(wrapper.text()).toContain("Update existing time entries for this task");
    expect(wrapper.text()).not.toContain("Update existing tasks in this project");
  });

  it("emits selection updates, submit, and dismissal", async () => {
    const wrapper = mountDialog();

    await wrapper.get('label[for="billable-default-update-tasks"]').trigger("click");
    await wrapper.get('label[for="billable-default-update-time-entries"]').trigger("click");
    await wrapper.get("button[type='button']:not([data-testid])").trigger("click");
    await wrapper.get("[data-testid='dialog-close']").trigger("click");

    expect(wrapper.emitted("update:updateTasks")?.[0]).toEqual([false]);
    expect(wrapper.emitted("update:updateTimeEntries")?.[0]).toEqual([true]);
    expect(wrapper.emitted("submit")).toHaveLength(1);
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("disables submission and dismissal while submitting", async () => {
    const wrapper = mountDialog({
      isSubmitting: true,
      updateTasks: false,
      updateTimeEntries: false,
    });

    expect(wrapper.get("div[data-closable]").attributes("data-closable")).toBe("false");
    expect(wrapper.get("div[data-dismissable-mask]").attributes("data-dismissable-mask")).toBe("false");
    expect(wrapper.get("button[type='button']:not([data-testid])").attributes("disabled")).toBeDefined();

    await wrapper.get("[data-testid='dialog-close']").trigger("click");

    expect(wrapper.emitted("close")).toBeUndefined();
  });
});
