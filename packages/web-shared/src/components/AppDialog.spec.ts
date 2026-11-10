import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import AppDialog from "./AppDialog.vue";

function mountDialog(attrs: Record<string, unknown> = {}) {
  return mount(AppDialog, {
    attrs: {
      modal: true,
      visible: true,
      ...attrs,
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
              <p class="dialog-attrs">{{ JSON.stringify($attrs) }}</p>
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

  it("caps the dialog panel width by default", () => {
    const text = mountDialog().get(".dialog-attrs").text();

    expect(text).toContain('"root":"max-w-[calc(100vw-2rem)]"');
    expect(text).toContain('"header":"px-6 pt-6 pb-0"');
    expect(text).toContain('"content":"px-6 pb-6 pt-4"');
    expect(text).toContain('"footer":"px-6 pb-6 pt-0"');
  });

  it("replaces the default root cap when a consumer passes its own pt root", () => {
    const wrapper = mountDialog({
      pt: { root: "w-[min(480px,calc(100vw-2rem))]" },
    });
    const text = wrapper.get(".dialog-attrs").text();

    expect(text).toContain('"root":"w-[min(480px,calc(100vw-2rem))]"');
    expect(text).not.toContain("max-w-[calc(100vw-2rem)]");
    expect(text).toContain('"header":"px-6 pt-6 pb-0"');
    expect(text).toContain('"content":"px-6 pb-6 pt-4"');
    expect(text).toContain('"footer":"px-6 pb-6 pt-0"');
  });
});
