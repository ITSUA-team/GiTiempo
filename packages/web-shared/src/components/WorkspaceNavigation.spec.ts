// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it } from "vitest";

import WorkspaceNavigation from "./WorkspaceNavigation.vue";

function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { template: "<div />" }, name: "dashboard" },
      { path: "/timer", component: { template: "<div />" }, name: "timer" },
      {
        path: "/time-entries",
        component: { template: "<div />" },
        name: "time-entries",
      },
      {
        path: "/projects/:projectId",
        component: { template: "<div />" },
        name: "project",
      },
      { path: "/profile", component: { template: "<div />" }, name: "profile" },
      { path: "/settings", component: { template: "<div />" }, name: "settings" },
    ],
  });
}

describe("WorkspaceNavigation", () => {
  it("renders text-only navigation with active styling and to overrides", async () => {
    const router = createTestRouter();
    await router.push("/");
    await router.isReady();

    const wrapper = mount(WorkspaceNavigation, {
      props: {
        activeName: "project",
        items: [
          { label: "Dashboard", name: "dashboard" },
          { label: "Timer", name: "timer" },
          { label: "Time Entries", name: "time-entries" },
          {
            label: "Projects",
            name: "project",
            to: { name: "project", params: { projectId: "workspace-alpha" } },
          },
          { label: "Profile", name: "profile" },
        ],
      },
      global: {
        plugins: [router],
      },
    });

    expect(wrapper.findAll("svg")).toHaveLength(0);
    expect(wrapper.findAll('a[href="/projects/workspace-alpha"]')).toHaveLength(2);

    const activeLink = wrapper.get('a[href="/projects/workspace-alpha"]');

    expect(activeLink.classes()).toContain("bg-accent-tint");
    expect(activeLink.classes()).toContain("text-brand");
  });

  it("renders all provided items in mobile navigation", async () => {
    const router = createTestRouter();
    await router.push("/");
    await router.isReady();

    const wrapper = mount(WorkspaceNavigation, {
      props: {
        activeName: "dashboard",
        items: [
          { label: "Dashboard", name: "dashboard" },
          { label: "Reports", name: "timer", to: { name: "timer" } },
          { label: "Invoices", name: "time-entries", to: { name: "time-entries" } },
          { label: "Members", name: "profile", to: { name: "profile" } },
          {
            label: "Projects",
            name: "project",
            to: { name: "project", params: { projectId: "workspace-alpha" } },
          },
          { label: "Settings", name: "settings" },
        ],
      },
      global: {
        plugins: [router],
      },
    });

    expect(wrapper.text()).toContain("Settings");
    expect(wrapper.findAll('a[href="/settings"]')).toHaveLength(2);
  });
});
