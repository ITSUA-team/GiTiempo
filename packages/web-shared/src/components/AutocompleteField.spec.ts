import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import AutocompleteField from "./AutocompleteField.vue";
import type { AutocompleteFieldOption } from "./autocomplete-field";

const options: AutocompleteFieldOption[] = [
  { label: "All assigned members", value: null },
  { label: "Alex Admin", value: "member-1" },
  { label: "Mira Member", value: "member-2" },
];

function mountField(modelValue: string | null = null) {
  return mount(AutocompleteField, {
    props: {
      inputId: "reports-member",
      label: "Member",
      modelValue,
      options,
      placeholder: "All assigned members",
    },
    global: {
      stubs: {
        AutoComplete: {
          name: "AutoComplete",
          emits: ["complete", "update:modelValue"],
          props: [
            "completeOnFocus",
            "dropdown",
            "dropdownMode",
            "disabled",
            "fluid",
            "forceSelection",
            "inputId",
            "invalid",
            "minLength",
            "modelValue",
            "name",
            "optionLabel",
            "placeholder",
            "pt",
            "showClear",
            "suggestions",
          ],
          template: `
            <div data-testid="autocomplete">
              <input
                :id="inputId"
                :aria-invalid="invalid ? 'true' : undefined"
                :placeholder="placeholder"
                :value="modelValue?.label ?? modelValue ?? ''"
                @input="$emit('complete', { query: $event.target.value })"
              />
              <button type="button" @click="$emit('update:modelValue', suggestions[1])">
                Select
              </button>
            </div>
          `,
        },
      },
    },
  });
}

describe("AutocompleteField", () => {
  it("renders the design label and selected option", () => {
    const wrapper = mountField();
    const autocomplete = wrapper.getComponent({ name: "AutoComplete" });

    expect(wrapper.get("label").text()).toBe("Member");
    expect(wrapper.get("label").attributes("for")).toBe("reports-member");
    expect(wrapper.get("input").element.value).toBe("All assigned members");
    expect(wrapper.text()).toContain("AutoComplete");
    expect(autocomplete.props("dropdown")).toBe(true);
    expect(autocomplete.props("forceSelection")).toBe(true);
    expect(autocomplete.props("completeOnFocus")).toBe(true);
    expect(autocomplete.props("minLength")).toBe(0);
  });

  it("emits the selected option value", async () => {
    const wrapper = mountField();

    await wrapper.get("button").trigger("click");

    expect(wrapper.emitted("update:modelValue")).toEqual([["member-1"]]);
  });

  it("filters suggestions from typed queries", async () => {
    const wrapper = mountField();
    const autocomplete = wrapper.getComponent({ name: "AutoComplete" });

    await wrapper.get("input").setValue("Mira");

    expect(autocomplete.props("suggestions")).toEqual([
      { label: "Mira Member", value: "member-2" },
    ]);
  });

  it("renders invalid helper copy", () => {
    const wrapper = mount(AutocompleteField, {
      props: {
        errorMessage: "Choose a member",
        inputId: "reports-member",
        label: "Member",
        modelValue: null,
        options,
      },
      global: {
        stubs: {
          AutoComplete: {
            name: "AutoComplete",
            props: ["invalid"],
            template: '<input :aria-invalid="invalid ? \'true\' : undefined" />',
          },
        },
      },
    });

    expect(wrapper.get("small").text()).toBe("Choose a member");
    expect(wrapper.get("input").attributes("aria-invalid")).toBe("true");
  });
});
