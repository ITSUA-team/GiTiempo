// @vitest-environment jsdom
/* eslint-disable vue/one-component-per-file */

import { mount } from "@vue/test-utils";
import PrimeVue from "primevue/config";
import { describe, expect, it } from "vitest";
import { defineComponent, h, shallowRef, type PropType } from "vue";
import type { RouteLocationRaw } from "vue-router";

import WorkspaceHeader from "./WorkspaceHeader.vue";

const baseProps = {
  counterpartHref: "https://admin.example.test/login",
  counterpartLabel: "Admin workspace",
  displayName: "Alexey Tsukanov",
  settingsTo: "/profile",
  userInitials: "AT",
  workspaceName: "Workspace Alpha",
};

type TestMenuItem = {
  command?: () => void;
  label?: string;
  route?: RouteLocationRaw;
  separator?: boolean;
};

const ButtonStub = defineComponent({
  name: "PrimeButtonStub",
  setup(_, { attrs, slots }) {
    return () => h("button", attrs, slots.default?.());
  },
});

const AvatarStub = defineComponent({
  name: "Avatar",
  props: {
    label: {
      required: true,
      type: String,
    },
  },
  setup(props, { attrs }) {
    return () => h("span", attrs, props.label);
  },
});

const MenuStub = defineComponent({
  name: "PrimeMenuStub",
  props: {
    model: {
      required: true,
      type: Array as PropType<TestMenuItem[]>,
    },
  },
  setup(props, { attrs, expose, slots }) {
    const isOpen = shallowRef(false);

    expose({
      toggle: () => {
        isOpen.value = !isOpen.value;
      },
    });

    return () => {
      if (!isOpen.value) return null;

      return h(
        "div",
        attrs,
        props.model.map((item, index) => {
          if (item.separator) {
            return h("hr", { key: `separator-${index}` });
          }

          return slots.item?.({
            item,
            props: {
              action: item.command ? { onClick: item.command } : {},
            },
          });
        }),
      );
    };
  },
});

const RouterLinkStub = defineComponent({
  name: "RouterLink",
  props: {
    custom: {
      default: false,
      type: Boolean,
    },
    to: {
      required: true,
      type: [String, Object] as PropType<RouteLocationRaw>,
    },
  },
  setup(props, { slots }) {
    const href = typeof props.to === "string" ? props.to : "/settings";

    return () => slots.default?.({ href, navigate: () => undefined });
  },
});

function mountHeader(options: { slots?: Record<string, string> } = {}) {
  return mount(WorkspaceHeader, {
    props: baseProps,
    slots: options.slots,
    global: {
      plugins: [PrimeVue],
      stubs: {
        Avatar: AvatarStub,
        Button: ButtonStub,
        Menu: MenuStub,
        RouterLink: RouterLinkStub,
      },
    },
  });
}

describe("WorkspaceHeader", () => {
  it("renders workspace identity and counterpart link without center content", () => {
    const counterpartHref = "https://admin.example.test/login";
    const wrapper = mountHeader();

    expect(wrapper.text()).toContain("GiTiempo");
    expect(wrapper.text()).toContain("Workspace Alpha");
    expect(wrapper.text()).toContain("Alexey Tsukanov");
    expect(wrapper.text()).toContain("AT");
    expect(wrapper.get(`a[href="${counterpartHref}"]`).text()).toBe(
      "Admin workspace",
    );
    expect(wrapper.get('[aria-label="Open profile menu"]').text()).toContain(
      "AT",
    );
    expect(wrapper.text()).not.toContain("Running timer");
  });

  it("renders app-owned center slot content", () => {
    const wrapper = mountHeader({
      slots: {
        center:
          '<div class="rounded-lg border px-3 py-1" data-testid="header-center-slot">Running timer</div>',
      },
    });

    const centerSlot = wrapper.get('[data-testid="header-center-slot"]');

    expect(centerSlot.text()).toBe("Running timer");
    expect(wrapper.text()).toContain("Alexey Tsukanov");
  });

  it("opens the profile menu with settings and sign-out actions", async () => {
    const wrapper = mountHeader();

    await wrapper.get('[aria-label="Open profile menu"]').trigger("click");

    const settingsLink = wrapper.get('[data-testid="profile-menu-settings"]');
    const signOutAction = wrapper.get('[data-testid="profile-menu-sign-out"]');

    expect(wrapper.get('[data-testid="profile-menu"]').text()).toContain(
      "Settings",
    );
    expect(settingsLink.attributes("href")).toBe("/profile");
    expect(signOutAction.text()).toContain("Sign out");

    await signOutAction.trigger("click");

    expect(wrapper.emitted("signOut")).toHaveLength(1);
  });
});
