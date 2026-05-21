// @vitest-environment jsdom
/* eslint-disable vue/one-component-per-file */

import { mount } from "@vue/test-utils";
import PrimeVue from "primevue/config";
import { afterEach, describe, expect, it } from "vitest";
import {
  defineComponent,
  h,
  shallowRef,
  type Component,
  type PropType,
} from "vue";
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

type HeaderProps = typeof baseProps & {
  settingsIcon?: Component;
  settingsLabel?: string;
};

type TestMenuItem = {
  command?: () => void;
  label?: string;
  route?: RouteLocationRaw;
  separator?: boolean;
};

type TestPassThrough = {
  root?: {
    class?: string;
  };
};

const ButtonStub = defineComponent({
  name: "PrimeButtonStub",
  props: {
    pt: {
      default: undefined,
      type: Object as PropType<TestPassThrough>,
    },
  },
  setup(props, { attrs, slots }) {
    return () =>
      h(
        "button",
        { ...attrs, class: [attrs.class, props.pt?.root?.class] },
        slots.default?.(),
      );
  },
});

const AvatarStub = defineComponent({
  name: "Avatar",
  props: {
    label: {
      required: true,
      type: String,
    },
    pt: {
      default: undefined,
      type: Object as PropType<TestPassThrough>,
    },
  },
  setup(props, { attrs }) {
    return () =>
      h("span", { ...attrs, class: [attrs.class, props.pt?.root?.class] }, props.label);
  },
});

const ProfileIconStub = defineComponent({
  name: "ProfileIconStub",
  setup() {
    return () => h("svg", { "data-testid": "custom-profile-icon" });
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
  emits: ["hide", "show"],
  setup(props, { attrs, emit, expose, slots }) {
    const isOpen = shallowRef(false);
    const triggerTarget = shallowRef<HTMLElement | null>(null);

    function closeMenu() {
      isOpen.value = false;
      emit("hide");
      triggerTarget.value?.focus();
    }

    expose({
      hide: closeMenu,
      toggle: (event?: Event) => {
        if (event?.currentTarget instanceof HTMLElement) {
          triggerTarget.value = event.currentTarget;
        }

        isOpen.value = !isOpen.value;
        if (isOpen.value) {
          emit("show");
          return;
        }

        closeMenu();
      },
    });

    return () => {
      if (!isOpen.value) return null;

      return h(
        "div",
        { ...attrs, role: "menu" },
        props.model.map((item, index) => {
          if (item.separator) {
            return h("hr", { key: `separator-${index}` });
          }

          return slots.item?.({
            item,
            props: {
              action: {
                onClick: () => {
                  item.command?.();
                  closeMenu();
                },
                role: "menuitem",
              },
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

function mountHeader(
  options: {
    attachTo?: HTMLElement;
    props?: Partial<HeaderProps>;
    slots?: Record<string, string>;
  } = {},
) {
  return mount(WorkspaceHeader, {
    attachTo: options.attachTo,
    props: {
      ...baseProps,
      ...options.props,
    },
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
  afterEach(() => {
    document.body.innerHTML = "";
  });

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
    const wrapper = mountHeader({ attachTo: document.body });
    const trigger = wrapper.get('[data-testid="profile-menu-trigger"]');
    const avatar = wrapper.get('[data-testid="profile-avatar"]');

    (trigger.element as HTMLElement).focus();

    expect(document.activeElement).toBe(trigger.element);
    expect(trigger.attributes("aria-expanded")).toBe("false");
    expect(trigger.attributes("aria-haspopup")).toBe("menu");
    expect(trigger.classes()).toContain("border-transparent");
    expect(avatar.classes()).not.toContain("ring-brand");

    await trigger.trigger("click");

    const settingsLink = wrapper.get('[data-testid="profile-menu-settings"]');
    const signOutAction = wrapper.get('[data-testid="profile-menu-sign-out"]');

    expect(trigger.attributes("aria-expanded")).toBe("true");
    expect(trigger.classes()).toContain("border-divider");
    expect(avatar.classes()).toContain("ring-brand");
    expect(wrapper.get('[data-testid="profile-menu"]').attributes("role")).toBe("menu");
    expect(settingsLink.attributes("role")).toBe("menuitem");
    expect(signOutAction.attributes("role")).toBe("menuitem");
    expect(wrapper.get('[data-testid="profile-menu"]').text()).toContain("Settings");
    expect(settingsLink.attributes("href")).toBe("/profile");
    expect(signOutAction.text()).toContain("Sign out");

    await signOutAction.trigger("click");

    expect(wrapper.emitted("signOut")).toHaveLength(1);
    expect(document.activeElement).toBe(trigger.element);
    expect(trigger.attributes("aria-expanded")).toBe("false");
    expect(trigger.classes()).toContain("border-transparent");
    expect(avatar.classes()).not.toContain("ring-brand");
  });

  it("renders an app-provided profile action label and icon", async () => {
    const wrapper = mountHeader({
      props: {
        settingsIcon: ProfileIconStub,
        settingsLabel: "Profile",
      },
    });

    await wrapper.get('[data-testid="profile-menu-trigger"]').trigger("click");

    const profileLink = wrapper.get('[data-testid="profile-menu-settings"]');

    expect(profileLink.text()).toContain("Profile");
    expect(wrapper.find('[data-testid="custom-profile-icon"]').exists()).toBe(true);
  });
});
