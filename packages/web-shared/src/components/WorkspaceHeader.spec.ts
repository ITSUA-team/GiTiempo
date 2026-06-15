/* eslint-disable vue/one-component-per-file */

import { mount, type VueWrapper } from "@vue/test-utils";
import PrimeVue from "primevue/config";
import { afterEach, describe, expect, it } from "vitest";
import { defineComponent, h, nextTick, type Component, type PropType } from "vue";
import type { RouteLocationRaw } from "vue-router";

import WorkspaceHeader from "./WorkspaceHeader.vue";

const baseProps = {
  counterpartHref: "https://admin.example.test/login",
  counterpartLabel: "Admin workspace",
  displayName: "Alexey Tsukanov",
  pageName: "Dashboard",
  settingsTo: "/profile",
  userInitials: "AT",
  workspaceName: "Workspace Alpha",
};

type HeaderProps = typeof baseProps & {
  centerContentAlign?: "center" | "end";
  pageName?: string;
  profileContextLabel?: string;
  settingsIcon?: Component;
  settingsLabel?: string;
  showDisplayName?: boolean;
  showSettings?: boolean;
};

type TestMenuItem = {
  command?: () => void;
  destructive?: boolean;
  href?: string;
  key?: string;
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
  setup(props, { attrs, slots }) {
    return () => {
      return h(
        "div",
        attrs,
        [
          h(
            "ul",
            { role: "menu" },
            props.model.map((item, index) => {
              if (item.separator) {
                return h("li", {
                  key: `separator-${index}`,
                  role: "separator",
                });
              }

              return h(
                "li",
                { key: item.key ?? index, role: "menuitem" },
                slots.item?.({
                  item,
                  props: {
                    action: {
                      "data-pc-section": "itemlink",
                      onClick: () => {
                        item.command?.();
                      },
                      tabindex: "-1",
                    },
                  },
                }),
              );
            }),
          ),
        ],
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

    return () =>
      slots.default?.({
        href,
        navigate: (event?: MouseEvent) => {
          event?.preventDefault();
        },
      });
  },
});

const mountedWrappers: VueWrapper[] = [];

function mountHeader(
  options: {
    attachTo?: HTMLElement;
    props?: Partial<HeaderProps>;
    stubMenu?: boolean;
    slots?: Record<string, string>;
  } = {},
) {
  const stubs = {
    Avatar: AvatarStub,
    Button: ButtonStub,
    RouterLink: RouterLinkStub,
    ...(options.stubMenu === false ? {} : { Menu: MenuStub }),
  };

  const wrapper = mount(WorkspaceHeader, {
    attachTo: options.attachTo,
    props: {
      ...baseProps,
      ...options.props,
    },
    slots: options.slots,
    global: {
      plugins: [PrimeVue],
      stubs,
    },
  });

  mountedWrappers.push(wrapper);

  return wrapper;
}

describe("WorkspaceHeader", () => {
  afterEach(() => {
    for (const wrapper of mountedWrappers) {
      wrapper.unmount();
    }

    mountedWrappers.length = 0;
    document.body.innerHTML = "";
  });

  it("renders breadcrumb identity without standalone counterpart link", () => {
    const wrapper = mountHeader();

    expect(wrapper.text()).toContain("GiTiempo");
    expect(wrapper.text()).toContain("Dashboard");
    expect(wrapper.text()).not.toContain("Workspace Alpha");
    expect(wrapper.text()).not.toContain("Alexey Tsukanov");
    expect(wrapper.text()).toContain("AT");
    expect(wrapper.find(`a[href="${baseProps.counterpartHref}"]`).exists()).toBe(false);
    expect(wrapper.get('[data-testid="profile-menu-trigger"]').text()).toContain(
      "AT",
    );
    expect(wrapper.get('[data-testid="profile-menu-trigger"]').attributes("aria-label")).toBe(
      "Open profile menu for Alexey Tsukanov",
    );
    expect(wrapper.findAll("[aria-label]")).toHaveLength(1);
    expect(wrapper.find('[data-testid="workspace-header-center-row"]').exists()).toBe(
      false,
    );
    expect(wrapper.text()).not.toContain("Running timer");
  });

  it("renders app and page breadcrumbs in the brand area", () => {
    const wrapper = mountHeader({
      props: {
        pageName: "Time Entries",
      },
    });

    const breadcrumb = wrapper.get('[data-testid="workspace-header-breadcrumb"]');

    expect(breadcrumb.text()).toContain("GiTiempo");
    expect(breadcrumb.text()).toContain("/");
    expect(breadcrumb.text()).toContain("Time Entries");
    expect(wrapper.text()).not.toContain("Workspace Alpha");
  });

  it("renders app-owned center slot content in the responsive center row", () => {
    const wrapper = mountHeader({
      props: {
        centerContentAlign: "end",
      },
      slots: {
        center:
          '<div class="rounded-lg border px-3 py-1" data-testid="header-center-slot">Running timer</div>',
      },
    });

    const centerRow = wrapper.get('[data-testid="workspace-header-center-row"]');
    const centerSlot = wrapper.get('[data-testid="header-center-slot"]');

    expect(centerRow.classes()).toContain("row-start-2");
    expect(centerRow.classes()).toContain("sm:row-start-1");
    expect(centerRow.classes()).not.toContain("sm:px-2");
    expect(wrapper.get('[data-testid="workspace-header-center-content"]').classes()).toContain(
      "sm:justify-end",
    );
    expect(centerSlot.text()).toBe("Running timer");
    expect(wrapper.findAll('[data-testid="header-center-slot"]')).toHaveLength(1);
    expect(wrapper.text()).not.toContain("Alexey Tsukanov");
  });

  it("supports an avatar-only profile trigger when the consuming app hides display text", () => {
    const wrapper = mountHeader({
      props: {
        showDisplayName: false,
      },
    });

    expect(wrapper.text()).not.toContain("Alexey Tsukanov");
    expect(wrapper.get('[data-testid="profile-menu-trigger"]').text()).toContain("AT");
    expect(wrapper.get('[data-testid="profile-avatar"]')).toBeTruthy();
  });

  it("keeps mobile timer actions usable beside the top-right profile menu overlay", async () => {
    const wrapper = mountHeader({
      attachTo: document.body,
      slots: {
        center: `
          <section class="flex w-full gap-3" data-testid="mobile-timer-strip">
            <div class="flex w-[132px] flex-col gap-[7px]" data-testid="mobile-timer-actions">
              <button type="button" data-testid="mobile-timer-primary-action">Start</button>
              <button type="button" data-testid="mobile-timer-change-action">Change</button>
            </div>
            <button type="button" aria-label="Change timer task" data-testid="mobile-timer-metadata">
              Project Orion / Improve reports filters
            </button>
          </section>
        `,
      },
      stubMenu: false,
    });
    const centerRow = wrapper.get('[data-testid="workspace-header-center-row"]');
    const profileRegion = wrapper.get('[data-testid="profile-menu-region"]');
    const trigger = wrapper.get('[data-testid="profile-menu-trigger"]');
    const timerStrip = wrapper.get('[data-testid="mobile-timer-strip"]');
    const timerActions = wrapper.get('[data-testid="mobile-timer-actions"]');
    const primaryAction = wrapper.get('[data-testid="mobile-timer-primary-action"]');
    const changeAction = wrapper.get('[data-testid="mobile-timer-change-action"]');
    const metadata = wrapper.get('[data-testid="mobile-timer-metadata"]');

    expect(centerRow.classes()).toContain("row-start-2");
    expect(centerRow.classes()).toContain("sm:row-start-1");
    expect(profileRegion.classes()).toContain("row-start-1");
    expect(profileRegion.classes()).toContain("col-start-3");
    expect(timerStrip.element.children[0]).toBe(timerActions.element);
    expect(timerStrip.element.children[1]).toBe(metadata.element);
    expect(primaryAction.attributes("disabled")).toBeUndefined();
    expect(changeAction.attributes("disabled")).toBeUndefined();

    await primaryAction.trigger("click");
    await changeAction.trigger("click");
    await trigger.trigger("click");
    await nextTick();

    const profileMenu = wrapper.get('[data-testid="profile-menu"]');

    expect(profileMenu.attributes("class")).toContain("absolute");
    expect(profileMenu.attributes("class")).toContain("right-0");
    expect(profileMenu.attributes("class")).toContain("z-30");
    expect(profileMenu.element.contains(primaryAction.element)).toBe(false);
    expect(profileMenu.element.contains(changeAction.element)).toBe(false);
    expect(primaryAction.isVisible()).toBe(true);
    expect(changeAction.isVisible()).toBe(true);
    expect(metadata.isVisible()).toBe(true);
  });

  it("opens the profile menu with settings and sign-out actions", async () => {
    const wrapper = mountHeader({ attachTo: document.body });
    const trigger = wrapper.get('[data-testid="profile-menu-trigger"]');
    const avatar = wrapper.get('[data-testid="profile-avatar"]');

    (trigger.element as HTMLElement).focus();

    expect(document.activeElement).toBe(trigger.element);
    expect(trigger.attributes("aria-expanded")).toBe("false");
    expect(trigger.attributes("aria-haspopup")).toBe("menu");
    expect(trigger.classes()).toContain("size-8");
    expect(trigger.classes()).toContain("rounded-full");
    expect(trigger.classes()).toContain("border-0");
    expect(avatar.classes()).toContain("border-0");
    expect(avatar.classes()).not.toContain("border-brand");

    await trigger.trigger("click");

    const settingsLink = wrapper.get('[data-testid="profile-menu-settings"]');
    const signOutAction = wrapper.get('[data-testid="profile-menu-sign-out"]');
    const counterpartAction = wrapper.get('[data-testid="profile-menu-counterpart"]');

    expect(trigger.attributes("aria-expanded")).toBe("true");
    expect(trigger.classes()).toContain("ring-divider");
    expect(trigger.classes()).toContain("h-10");
    expect(trigger.classes()).toContain("px-1.5");
    expect(trigger.classes()).toContain("py-1");
    expect(trigger.classes()).toContain("ring-1");
    expect(trigger.classes()).toContain("ring-inset");
    expect(trigger.classes()).toContain("rounded-lg");
    expect(avatar.classes()).toContain("border-2");
    expect(avatar.classes()).toContain("border-brand");
    expect(wrapper.find('[data-testid="profile-menu"] [role="menu"]').exists()).toBe(
      true,
    );
    expect(wrapper.get('[data-testid="profile-menu"]').attributes("class")).toContain(
      "absolute",
    );
    expect(wrapper.get('[data-testid="profile-menu"]').attributes("class")).toContain(
      "right-0",
    );
    expect(wrapper.get('[data-testid="profile-menu"]').attributes("class")).toContain(
      "z-30",
    );
    expect(wrapper.get('[data-testid="profile-menu"]').attributes("class")).toContain(
      "mt-5",
    );
    expect(wrapper.get('[data-testid="profile-menu"]').attributes("class")).toContain(
      "h-40",
    );
    expect(wrapper.get('[data-testid="profile-menu"]').attributes("class")).toContain(
      "before:right-4",
    );
    expect(wrapper.findAll('[data-testid="profile-menu"] [role="menuitem"]')).toHaveLength(
      3,
    );
    expect(counterpartAction.attributes("href")).toBe(baseProps.counterpartHref);
    expect(counterpartAction.classes()).not.toContain("sm:hidden");
    expect(counterpartAction.text()).toContain("Admin workspace");
    expect(wrapper.get('[data-testid="profile-menu"]').text()).toContain("Settings");
    expect(settingsLink.attributes("href")).toBe("/profile");
    expect(signOutAction.text()).toContain("Sign out");

    await signOutAction.trigger("click");

    expect(wrapper.emitted("signOut")).toHaveLength(1);
    expect(document.activeElement).toBe(trigger.element);
    expect(trigger.attributes("aria-expanded")).toBe("false");
    expect(trigger.classes()).toContain("size-8");
    expect(trigger.classes()).toContain("border-0");
    expect(avatar.classes()).toContain("border-0");
    expect(avatar.classes()).not.toContain("border-brand");
  });

  it("keeps admin profile context outside the trigger until the menu opens", async () => {
    const wrapper = mountHeader({
      props: {
        profileContextLabel: "GiTiempo Studio",
      },
    });
    const profileRegion = wrapper.get('[data-testid="profile-menu-region"]');
    const trigger = wrapper.get('[data-testid="profile-menu-trigger"]');

    expect(profileRegion.text()).toContain("GiTiempo Studio");
    expect(trigger.text()).not.toContain("GiTiempo Studio");
    expect(trigger.classes()).toContain("size-8");

    await trigger.trigger("click");

    expect(trigger.text()).toContain("GiTiempo Studio");
    expect(trigger.classes()).toContain("h-10");
    expect(trigger.classes()).toContain("gap-3");
    expect(trigger.classes()).toContain("px-1.5");
    expect(trigger.classes()).toContain("py-1");
    expect(trigger.classes()).toContain("ring-inset");
    expect(trigger.classes()).not.toContain("w-11");
  });

  it("activates sign out through the real PrimeVue menu keyboard handler", async () => {
    const wrapper = mountHeader({ attachTo: document.body, stubMenu: false });
    const trigger = wrapper.get('[data-testid="profile-menu-trigger"]');

    (trigger.element as HTMLElement).focus();
    await trigger.trigger("click");

    const menuList = wrapper.get('[data-testid="profile-menu"] [role="menu"]');

    expect(wrapper.findAll('[data-testid="profile-menu"] [role="menuitem"]')).toHaveLength(
      3,
    );

    await menuList.trigger("focus");
    await menuList.trigger("keydown", { code: "ArrowDown" });
    await menuList.trigger("keydown", { code: "ArrowDown" });
    await menuList.trigger("keydown", { code: "Enter" });
    await nextTick();

    expect(wrapper.emitted("signOut")).toHaveLength(1);
    expect(wrapper.find('[data-testid="profile-menu"]').exists()).toBe(false);
    expect(document.activeElement).toBe(trigger.element);
    expect(trigger.attributes("aria-expanded")).toBe("false");
  });

  it("closes the profile menu on Escape and restores focus", async () => {
    const wrapper = mountHeader({ attachTo: document.body });
    const trigger = wrapper.get('[data-testid="profile-menu-trigger"]');

    (trigger.element as HTMLElement).focus();
    await trigger.trigger("click");

    expect(wrapper.find('[data-testid="profile-menu"]').exists()).toBe(true);

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await nextTick();

    expect(wrapper.find('[data-testid="profile-menu"]').exists()).toBe(false);
    expect(document.activeElement).toBe(trigger.element);
    expect(trigger.attributes("aria-expanded")).toBe("false");
  });

  it("closes the profile menu on outside click", async () => {
    const wrapper = mountHeader({ attachTo: document.body });
    const trigger = wrapper.get('[data-testid="profile-menu-trigger"]');
    const outsideButton = document.createElement("button");
    document.body.append(outsideButton);

    (trigger.element as HTMLElement).focus();
    await trigger.trigger("click");

    expect(wrapper.find('[data-testid="profile-menu"]').exists()).toBe(true);

    outsideButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    await nextTick();

    expect(wrapper.find('[data-testid="profile-menu"]').exists()).toBe(false);
    expect(trigger.attributes("aria-expanded")).toBe("false");
  });

  it("closes the profile menu and restores focus when the settings action runs", async () => {
    const wrapper = mountHeader({ attachTo: document.body });
    const trigger = wrapper.get('[data-testid="profile-menu-trigger"]');

    (trigger.element as HTMLElement).focus();
    await trigger.trigger("click");
    await wrapper.get('[data-testid="profile-menu-settings"]').trigger("click");
    await nextTick();

    expect(wrapper.find('[data-testid="profile-menu"]').exists()).toBe(false);
    expect(document.activeElement).toBe(trigger.element);
    expect(trigger.attributes("aria-expanded")).toBe("false");
  });

  it("closes the profile menu when the counterpart workspace action runs", async () => {
    const wrapper = mountHeader({ attachTo: document.body });
    const trigger = wrapper.get('[data-testid="profile-menu-trigger"]');

    await trigger.trigger("click");
    const counterpartAction = wrapper.get('[data-testid="profile-menu-counterpart"]');
    counterpartAction.element.addEventListener(
      "click",
      (event) => event.preventDefault(),
      { once: true },
    );

    await counterpartAction.trigger("click");
    await nextTick();

    expect(wrapper.find('[data-testid="profile-menu"]').exists()).toBe(false);
    expect(trigger.attributes("aria-expanded")).toBe("false");
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

  it("omits the settings action when the app disables it", async () => {
    const wrapper = mountHeader({
      props: {
        showSettings: false,
      },
    });

    await wrapper.get('[data-testid="profile-menu-trigger"]').trigger("click");

    expect(wrapper.find('[data-testid="profile-menu-settings"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="profile-menu-counterpart"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="profile-menu-sign-out"]').exists()).toBe(true);
  });
});
