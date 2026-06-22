import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { describe, expect, it } from "vitest";

import EntryActionButton from "./EntryActionButton.vue";

const TestIcon = defineComponent({
  name: "TestIcon",
  render() {
    return h("svg", { viewBox: "0 0 16 16" }, [h("path", { d: "M0 0h16v16H0z" })]);
  },
});

describe("EntryActionButton", () => {
  it("renders the shared filled icon-only action treatment", () => {
    const wrapper = mount(EntryActionButton, {
      props: {
        icon: TestIcon,
        label: "New time entry",
      },
      attrs: {
        "data-testid": "entry-action",
      },
      global: {
        directives: {
          tooltip: {
            mounted(el, binding) {
              el.setAttribute("data-tooltip", String(binding.value));
            },
          },
        },
      },
    });

    const button = wrapper.get('button[data-testid="entry-action"]');
    const icon = wrapper.get("svg");

    expect(button.attributes("aria-label")).toBe("New time entry");
    expect(button.attributes("data-tooltip")).toBe("New time entry");
    expect(button.attributes("type")).toBe("button");
    expect(button.classes()).toContain("h-[38px]");
    expect(button.classes()).toContain("w-[38px]");
    expect(button.classes()).toContain("rounded-[6px]");
    expect(button.classes()).toContain("p-0");
    expect(icon.attributes("aria-hidden")).toBe("true");
    expect(icon.classes()).toContain("text-text-inverse");
    expect(icon.classes()).toContain("size-4");
    expect(icon.classes()).toContain("stroke-2");
  });

  it("re-emits click through an explicit component contract", async () => {
    const wrapper = mount(EntryActionButton, {
      props: {
        icon: TestIcon,
        label: "Add task",
      },
      global: {
        directives: {
          tooltip: {
            mounted(el, binding) {
              el.setAttribute("data-tooltip", String(binding.value));
            },
          },
        },
      },
    });

    await wrapper.get("button").trigger("click");

    expect(wrapper.emitted("click")).toHaveLength(1);
  });
});
