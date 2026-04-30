// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import PrimeVue from "primevue/config";
import { describe, expect, it } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";

import WorkspaceHeader from "./WorkspaceHeader.vue";

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { template: "<div />" }, name: "home" },
      {
        path: "/settings",
        component: { template: "<div />" },
        name: "settings",
      },
    ],
  });
}

describe("WorkspaceHeader", () => {
  it("renders workspace identity and counterpart link", () => {
    const wrapper = mount(WorkspaceHeader, {
      props: {
        counterpartHref: "http://localhost:5174",
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
    expect(wrapper.get('a[href="http://localhost:5174"]').text()).toBe(
      "Admin workspace",
    );
    expect(wrapper.find('[aria-label="Settings"]').exists()).toBe(false);
  });

  it("renders an optional settings action", async () => {
    const router = createTestRouter();
    await router.push("/");
    await router.isReady();

    const wrapper = mount(WorkspaceHeader, {
      props: {
        counterpartHref: "http://localhost:5173",
        counterpartLabel: "User workspace",
        displayName: "Admin User",
        settingsLabel: "Open workspace settings",
        settingsTo: { name: "settings" },
        userInitials: "AU",
        workspaceName: "Workspace Admin",
      },
      global: {
        plugins: [router, PrimeVue],
      },
    });

    const settingsLink = wrapper.get(
      'a[aria-label="Open workspace settings"]',
    );

    expect(settingsLink.attributes("href")).toBe("/settings");
  });
});
