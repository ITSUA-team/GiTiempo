import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import AppDialog from "./AppDialog.vue";

function mountDialog() {
  return mount(AppDialog, {
    attrs: {
      modal: true,
      visible: true,
    },
    slots: {
      default: "Dialog body",
      footer: "Dialog footer",
      header: "Dialog header",
    },
    global: {
      stubs: {
        Dialog: {
          inheritAttrs: false,
          template: `
            <section v-bind="$attrs">
              <header><slot name="header" /></header>
              <main><slot /></main>
              <footer><slot name="footer" /></footer>
            </section>
          `,
        },
      },
    },
  });
}

describe("AppDialog", () => {
  it("adds an initial focus target before dialog body content", () => {
    const wrapper = mountDialog();
    const focusTarget = wrapper.get("[data-gitiempo-dialog-initial-focus]");

    expect(focusTarget.attributes("autofocus")).toBe("");
    expect(focusTarget.attributes("tabindex")).toBe("-1");
    expect(focusTarget.classes()).toContain("sr-only");
    expect(wrapper.text()).toContain("Dialog header");
    expect(wrapper.text()).toContain("Dialog body");
    expect(wrapper.text()).toContain("Dialog footer");
  });
});
