// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import PrimeVue from "primevue/config";
import { describe, expect, it } from "vitest";

import WorkspaceHeader from "./WorkspaceHeader.vue";

describe("WorkspaceHeader", () => {
  const baseProps = {
    counterpartHref: "https://admin.example.test/login",
    counterpartLabel: "Admin workspace",
    displayName: "Alexey Tsukanov",
    userInitials: "AT",
    workspaceName: "Workspace Alpha",
  };

  it("renders workspace identity and counterpart link without center content", () => {
    const counterpartHref = "https://admin.example.test/login";
    const wrapper = mount(WorkspaceHeader, {
      props: baseProps,
      global: {
        plugins: [PrimeVue],
      },
    });

    expect(wrapper.text()).toContain("GiTiempo");
    expect(wrapper.text()).toContain("Workspace Alpha");
    expect(wrapper.text()).toContain("Alexey Tsukanov");
    expect(wrapper.text()).toContain("AT");
    expect(wrapper.get(`a[href="${counterpartHref}"]`).text()).toBe(
      "Admin workspace",
    );
    expect(wrapper.findAll("[aria-label]")).toHaveLength(1);
    expect(wrapper.find('[data-testid="workspace-header-center-row"]').exists()).toBe(
      false,
    );
    expect(wrapper.text()).not.toContain("Running timer");
  });

  it("renders app-owned center slot content in the responsive center row", () => {
    const wrapper = mount(WorkspaceHeader, {
      props: baseProps,
      slots: {
        center:
          '<div class="rounded-lg border px-3 py-1" data-testid="header-center-slot">Running timer</div>',
      },
      global: {
        plugins: [PrimeVue],
      },
    });

    const centerRow = wrapper.get('[data-testid="workspace-header-center-row"]');
    const centerSlot = wrapper.get('[data-testid="header-center-slot"]');

    expect(centerRow.classes()).toContain("row-start-2");
    expect(centerRow.classes()).toContain("sm:row-start-1");
    expect(centerSlot.text()).toBe("Running timer");
    expect(wrapper.findAll('[data-testid="header-center-slot"]')).toHaveLength(1);
    expect(wrapper.text()).toContain("Alexey Tsukanov");
  });
});
