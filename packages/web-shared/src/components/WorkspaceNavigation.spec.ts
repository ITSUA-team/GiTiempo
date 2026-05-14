// @vitest-environment jsdom

import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it } from "vitest";

import WorkspaceNavigation from "./WorkspaceNavigation.vue";

const TestIcon = defineComponent({
  name: "TestIcon",
  render() {
    return h("svg", { viewBox: "0 0 20 20" }, [h("path", { d: "M0 0h20v20H0z" })]);
  },
});

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
        path: "/projects",
        component: { template: "<div />" },
        name: "project",
      },
      { path: "/profile", component: { template: "<div />" }, name: "profile" },
      { path: "/settings", component: { template: "<div />" }, name: "settings" },
    ],
  });
}

describe("WorkspaceNavigation", () => {
  it("renders icon-only navigation with active styling, labels, tooltips, and to overrides", async () => {
    const router = createTestRouter();
    await router.push("/");
    await router.isReady();

    const wrapper = mount(WorkspaceNavigation, {
      props: {
        activeName: "project",
        items: [
          { icon: TestIcon, label: "Dashboard", name: "dashboard" },
          { icon: TestIcon, label: "Timer", name: "timer" },
          { icon: TestIcon, label: "Time Entries", name: "time-entries" },
          {
            icon: TestIcon,
            label: "Projects",
            name: "project",
            to: { name: "project" },
          },
          { icon: TestIcon, label: "Profile", name: "profile" },
        ],
      },
      global: {
        directives: {
          tooltip: {
            mounted(el, binding) {
              el.setAttribute("data-tooltip", String(binding.value));
            },
          },
        },
        plugins: [router],
      },
    });

    expect(wrapper.findAll("svg")).toHaveLength(10);
    expect(wrapper.findAll('a[href="/projects/workspace-alpha"]')).toHaveLength(2);

    const activeLink = wrapper.get('a[href="/projects/workspace-alpha"]');
    const desktopRail = wrapper.get("aside");

    expect(desktopRail.classes()).toContain("w-fit");
    expect(desktopRail.classes()).not.toContain("lg:w-60");
    expect(activeLink.attributes("aria-label")).toBe("Projects");
    expect(activeLink.attributes("aria-current")).toBe("page");
    expect(activeLink.attributes("data-tooltip")).toBe("Projects");
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
          { icon: TestIcon, label: "Dashboard", name: "dashboard" },
          { icon: TestIcon, label: "Reports", name: "timer", to: { name: "timer" } },
          { icon: TestIcon, label: "Invoices", name: "time-entries", to: { name: "time-entries" } },
          { icon: TestIcon, label: "Members", name: "profile", to: { name: "profile" } },
          {
            icon: TestIcon,
            label: "Projects",
            name: "project",
            to: { name: "project" },
          },
          { icon: TestIcon, label: "Settings", name: "settings" },
        ],
      },
      global: {
        directives: {
          tooltip: {
            mounted(el, binding) {
              el.setAttribute("data-tooltip", String(binding.value));
            },
          },
        },
        plugins: [router],
      },
    });

    const dashboardLinks = wrapper.findAll('a[aria-label="Dashboard"]');

    expect(dashboardLinks).toHaveLength(2);
    expect(dashboardLinks[1]?.attributes("aria-current")).toBe("page");
    expect(dashboardLinks[1]?.attributes("data-tooltip")).toBe("Dashboard");
    expect(wrapper.get("nav.fixed").classes()).toContain("inset-x-0");
    expect(wrapper.findAll('a[href="/settings"]')).toHaveLength(2);
  });
});
