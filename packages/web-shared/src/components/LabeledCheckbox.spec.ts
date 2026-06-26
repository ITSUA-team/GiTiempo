import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import LabeledCheckbox from "./LabeledCheckbox.vue";

function mountCheckbox(overrides: Partial<InstanceType<typeof LabeledCheckbox>["$props"]> = {}) {
  return mount(LabeledCheckbox, {
    props: {
      inputId: "shared-checkbox",
      label: "Shared checkbox label",
      modelValue: false,
      ...overrides,
    },
    global: {
      stubs: {
        Checkbox: {
          props: ["disabled", "inputId", "modelValue", "name", "pt"],
          emits: ["update:modelValue"],
          template:
            '<input :id="inputId" :checked="modelValue" :disabled="disabled" :name="name" type="checkbox" @change="$emit(\'update:modelValue\', $event.target.checked)" />',
        },
      },
    },
  });
}

describe("LabeledCheckbox", () => {
  it("toggles when the visible label text is clicked", async () => {
    const wrapper = mountCheckbox();

    await wrapper.get("label").trigger("click");

    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([true]);
  });

  it("does not manually re-forward clicks that start on the checkbox control", async () => {
    const wrapper = mountCheckbox();

    await wrapper.get("[data-labeled-checkbox-control]").trigger("click");

    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });

  it("does not toggle from the label while disabled", async () => {
    const wrapper = mountCheckbox({ disabled: true });

    await wrapper.get("label").trigger("click");

    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });
});
