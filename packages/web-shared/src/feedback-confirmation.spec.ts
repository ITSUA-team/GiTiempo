import { flushPromises, mount } from "@vue/test-utils";
import Button from "primevue/button";
import PrimeVue from "primevue/config";
import ConfirmationService from "primevue/confirmationservice";
import ConfirmDialog from "primevue/confirmdialog";
import { useConfirm } from "primevue/useconfirm";
import { defineComponent, h } from "vue";
import { describe, expect, it, vi } from "vitest";

import { createAppConfirm } from "./feedback";

describe("destructive confirmation focus", () => {
  it("focuses Cancel and restores the trigger without accepting when it is activated", async () => {
    const accept = vi.fn();
    const Host = defineComponent({
      setup() {
        const appConfirm = createAppConfirm(useConfirm());

        return () => [
          h(Button, {
            label: "Disconnect GitHub",
            onClick: () => appConfirm.confirmDestructive({
              accept,
              acceptLabel: "Disconnect",
              header: "Disconnect GitHub?",
              message: "This removes your GitHub connection.",
            }),
          }),
          h(ConfirmDialog),
        ];
      },
    });
    const wrapper = mount(Host, {
      attachTo: document.body,
      global: {
        plugins: [[PrimeVue, { unstyled: true }], ConfirmationService],
        stubs: { transition: false },
      },
    });

    try {
      const trigger = wrapper.get("button");
      trigger.element.focus();
      await trigger.trigger("click");
      await flushPromises();

      await vi.waitFor(() => {
        expect(document.activeElement?.textContent).toBe("Cancel");
      });
      const focusedAction = document.activeElement as HTMLButtonElement;
      expect(focusedAction.closest('[role="alertdialog"]')).not.toBeNull();
      focusedAction.click();

      await vi.waitFor(() => {
        expect(document.querySelector('[role="alertdialog"]')).toBeNull();
        expect(document.activeElement).toBe(trigger.element);
      });
      expect(accept).not.toHaveBeenCalled();
    } finally {
      wrapper.unmount();
    }
  });
});
