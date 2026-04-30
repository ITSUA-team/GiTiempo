// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import PrimeVue from "primevue/config";
import { describe, expect, it } from "vitest";

import WorkspaceHeader from "./WorkspaceHeader.vue";

describe("WorkspaceHeader", () => {
  it("renders workspace identity and counterpart link", () => {
    const counterpartHref = "https://admin.example.test/login";
    const wrapper = mount(WorkspaceHeader, {
      props: {
        counterpartHref,
        counterpartLabel: "Admin workspace",
        displayName: "Alexey Tsukanov",
        userInitials: "AT",
        workspaceName: "Workspace Alpha",
      },
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
  });
});
