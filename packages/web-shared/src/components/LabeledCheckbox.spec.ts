import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";

import LabeledCheckbox from "./LabeledCheckbox.vue";

function mountCheckbox(overrides: Partial<InstanceType<typeof LabeledCheckbox>["$props"]> = {}) {
  return mount(LabeledCheckbox, {
    attachTo: document.body,
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
  afterEach(() => {
    document.body.innerHTML = "";
  });

  async function clickNativeLabel(wrapper: ReturnType<typeof mountCheckbox>) {
    (wrapper.get("label").element as HTMLLabelElement).click();
    await nextTick();
  }

  it("associates the visible label with the checkbox input", () => {
    const wrapper = mountCheckbox({ name: "sharedName" });

    expect(wrapper.get("label").attributes("for")).toBe("shared-checkbox");
    expect(wrapper.get("input").attributes("id")).toBe("shared-checkbox");
    expect(wrapper.get("input").attributes("name")).toBe("sharedName");
  });

  it("toggles when the visible label text is clicked", async () => {
    const wrapper = mountCheckbox();

    await clickNativeLabel(wrapper);

    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([true]);
  });

  it("lets direct checkbox input clicks use the native input path", async () => {
    const wrapper = mountCheckbox();

    await wrapper.get("input").setValue(true);

    expect(wrapper.emitted("update:modelValue")?.[0]).toEqual([true]);
  });

  it("does not toggle from the label while disabled", async () => {
    const wrapper = mountCheckbox({ disabled: true });

    await clickNativeLabel(wrapper);

    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });
});
