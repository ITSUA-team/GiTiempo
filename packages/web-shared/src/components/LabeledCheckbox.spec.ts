import { Form as PrimeForm, type FormSubmitEvent } from "@primevue/forms";
import { flushPromises, mount } from "@vue/test-utils";
import PrimeVue from "primevue/config";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, nextTick, ref } from "vue";

import LabeledCheckbox from "./LabeledCheckbox.vue";

const CheckboxHost = defineComponent({
  components: { PrimeForm, LabeledCheckbox },
  props: {
    initialValue: { type: Boolean, required: true },
    controlled: Boolean,
  },
  emits: ["submitted"],
  setup: (props, { emit }) => ({
    initialValues: { billable: props.initialValue },
    billable: ref(props.initialValue),
    onSubmit: (event: FormSubmitEvent) => emit("submitted", event.states.billable.value),
  }),
  template: `
    <template v-if="controlled">
      <LabeledCheckbox v-model="billable" input-id="controlled-billable" label="Billable entry" />
      <output>{{ billable }}</output>
    </template>
    <PrimeForm v-else v-slot="$form" :initial-values="initialValues" @submit="onSubmit">
      <LabeledCheckbox input-id="form-billable" label="Billable by default" name="billable" />
      <output>{{ $form.billable?.value }}</output>
      <button type="button" @click="$form.reset">Reset</button>
    </PrimeForm>
  `,
});

function mountRealCheckbox(initialValue: boolean, controlled = false) {
  return mount(CheckboxHost, {
    attachTo: document.body,
    props: { initialValue, controlled },
    global: { plugins: [[PrimeVue, { unstyled: true }]] },
  });
}

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

  it.each([true, false])("preserves a Form-owned initial value of %s when submitted unchanged", async (initialValue) => {
    const wrapper = mountRealCheckbox(initialValue);
    await flushPromises();

    expect((wrapper.get('input[type="checkbox"]').element as HTMLInputElement).checked).toBe(initialValue);
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.emitted("submitted")).toEqual([[initialValue]]);
    wrapper.unmount();
  });

  it.each([true, false])("toggles and resets a Form-owned initial value of %s", async (initialValue) => {
    const wrapper = mountRealCheckbox(initialValue);
    await flushPromises();

    (wrapper.get("label").element as HTMLLabelElement).click();
    await flushPromises();

    expect((wrapper.get('input[type="checkbox"]').element as HTMLInputElement).checked).toBe(!initialValue);
    expect(wrapper.get("output").text()).toBe(String(!initialValue));

    await wrapper.get("button").trigger("click");
    await flushPromises();

    expect((wrapper.get('input[type="checkbox"]').element as HTMLInputElement).checked).toBe(initialValue);
    expect(wrapper.get("output").text()).toBe(String(initialValue));
    wrapper.unmount();
  });

  it.each([true, false])("keeps an explicit v-model with initial value %s in sync", async (initialValue) => {
    const wrapper = mountRealCheckbox(initialValue, true);

    expect((wrapper.get('input[type="checkbox"]').element as HTMLInputElement).checked).toBe(initialValue);
    await wrapper.get('input[type="checkbox"]').setValue(!initialValue);

    expect(wrapper.get("output").text()).toBe(String(!initialValue));
    expect((wrapper.get('input[type="checkbox"]').element as HTMLInputElement).checked).toBe(!initialValue);
    wrapper.unmount();
  });
});
