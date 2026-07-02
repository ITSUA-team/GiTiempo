import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import type { CurrentUserWorkspaceMembershipResponse } from "@gitiempo/shared";

import WorkspaceSwitchDialog from "./WorkspaceSwitchDialog.vue";

const workspaceMemberships: CurrentUserWorkspaceMembershipResponse[] = [
  {
    isCurrent: true,
    role: "member",
    workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
    workspaceName: "Workspace Alpha",
  },
  {
    isCurrent: false,
    role: "admin",
    workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002",
    workspaceName: "Workspace Beta",
  },
];

function mountDialog(
  overrides: Partial<InstanceType<typeof WorkspaceSwitchDialog>["$props"]> = {},
) {
  return mount(WorkspaceSwitchDialog, {
    props: {
      visible: true,
      workspaceMemberships,
      ...overrides,
    },
    global: {
      stubs: {
        Button: {
          props: ["disabled", "label", "severity", "variant"],
          emits: ["click"],
          template:
            '<button :disabled="disabled" type="button" @click="$emit(\'click\')">{{ label }}</button>',
        },
        Dialog: {
          props: [
            "closable",
            "dismissableMask",
            "header",
            "modal",
            "style",
            "visible",
          ],
          emits: ["update:visible"],
          template:
            '<div v-if="visible" data-testid="workspace-switch-dialog" :data-closable="String(closable)" :data-dismissable-mask="String(dismissableMask)"><button data-testid="dialog-close" type="button" @click="$emit(\'update:visible\', false)">Close dialog</button><slot /></div>',
        },
      },
    },
  });
}

describe("WorkspaceSwitchDialog", () => {
  it("marks the current workspace and emits switching only for alternate memberships", async () => {
    const wrapper = mountDialog();
    const currentWorkspace = wrapper.get(
      '[data-testid="workspace-switch-dialog-option-018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001"]',
    );
    const alternateWorkspace = wrapper.get(
      '[data-testid="workspace-switch-dialog-option-018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002"]',
    );

    expect(currentWorkspace.text()).toContain("Workspace Alpha");
    expect(currentWorkspace.text()).toContain("Current");
    expect(currentWorkspace.attributes("aria-current")).toBe("true");
    expect(currentWorkspace.attributes("disabled")).toBeDefined();
    expect(alternateWorkspace.text()).toContain("Workspace Beta");
    expect(alternateWorkspace.text()).toContain("Admin");
    expect(alternateWorkspace.text()).toContain("Select");
    expect(alternateWorkspace.attributes("disabled")).toBeUndefined();

    await alternateWorkspace.trigger("click");

    expect(wrapper.emitted("switchWorkspace")).toEqual([
      ["018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002"],
    ]);
  });

  it("allows both dialog dismissal paths when no workspace switch is in progress", async () => {
    const dialogDismissWrapper = mountDialog();
    await dialogDismissWrapper.get('[data-testid="dialog-close"]').trigger("click");

    expect(dialogDismissWrapper.emitted("update:visible")).toEqual([[false]]);

    const buttonDismissWrapper = mountDialog();
    await buttonDismissWrapper.get('button:not([data-testid])').trigger("click");

    expect(buttonDismissWrapper.emitted("update:visible")).toEqual([[false]]);
  });

  it("locks dismissal and workspace actions while switching", async () => {
    const wrapper = mountDialog({
      switchingWorkspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002",
    });
    const currentWorkspace = wrapper.get(
      '[data-testid="workspace-switch-dialog-option-018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001"]',
    );
    const alternateWorkspace = wrapper.get(
      '[data-testid="workspace-switch-dialog-option-018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002"]',
    );
    const dialog = wrapper.get('[data-testid="workspace-switch-dialog"]');
    const closeButton = wrapper.get('button:not([data-testid])');

    expect(dialog.attributes("data-closable")).toBe("false");
    expect(dialog.attributes("data-dismissable-mask")).toBe("false");
    expect(currentWorkspace.attributes("disabled")).toBeDefined();
    expect(alternateWorkspace.attributes("disabled")).toBeDefined();
    expect(alternateWorkspace.text()).toContain("Switching...");
    expect(closeButton.attributes("disabled")).toBeDefined();

    await wrapper.get('[data-testid="dialog-close"]').trigger("click");
    await closeButton.trigger("click");
    await alternateWorkspace.trigger("click");

    expect(wrapper.emitted("update:visible")).toBeUndefined();
    expect(wrapper.emitted("switchWorkspace")).toBeUndefined();
  });
});
