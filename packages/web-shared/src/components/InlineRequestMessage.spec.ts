import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import InlineRequestMessage from "./InlineRequestMessage.vue";

describe("InlineRequestMessage", () => {
  it("renders a title and detail message as an alert", () => {
    const wrapper = mount(InlineRequestMessage, {
      props: {
        message: "Please try again.",
        title: "Could not save.",
      },
    });

    expect(wrapper.attributes("role")).toBe("alert");
    expect(wrapper.text()).toContain("Could not save.");
    expect(wrapper.text()).toContain("Please try again.");
  });
});
