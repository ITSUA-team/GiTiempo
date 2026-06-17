import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import RequestStateCard from "./RequestStateCard.vue";

describe("RequestStateCard", () => {
  it("renders state copy and emits retry from the default action", async () => {
    const wrapper = mount(RequestStateCard, {
      props: {
        description: "Network unavailable.",
        retryLabel: "Retry",
        title: "Could not load records",
      },
      global: {
        stubs: {
          Button: {
            emits: ["click"],
            props: ["label"],
            template: '<button type="button" @click="$emit(\'click\')">{{ label }}</button>',
          },
        },
      },
    });

    expect(wrapper.text()).toContain("Could not load records");
    expect(wrapper.text()).toContain("Network unavailable.");

    await wrapper.get("button").trigger("click");

    expect(wrapper.emitted("retry")).toHaveLength(1);
  });
});
