import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import AuthIntroPanel from "./AuthIntroPanel.vue";

function mountPanel(slots?: Record<string, string>) {
  return mount(AuthIntroPanel, {
    slots,
    props: {
      badgeItems: ["Guest-only admin entry"],
      counterpartHref: "https://user.example.test/login",
      counterpartLabel: "the user workspace",
      counterpartPrompt: "Need time tracking? Open",
      featureCards: [
        {
          description: "Review team time from a single workspace.",
          title: "Admin-ready reports",
        },
      ],
      heroDescription: "Sign in with your workspace account.",
      heroTitle: "Manage reporting, members, and projects in one workspace.",
      productTagline: "GiTiempo",
      workspaceLabel: "Admin workspace access",
    },
  });
}

describe("AuthIntroPanel", () => {
  it("renders the approved brand logo tile treatment", () => {
    const wrapper = mountPanel();
    const logo = wrapper.get('[data-testid="auth-intro-logo"]');

    expect(logo.text()).toBe("GT");
    expect(logo.classes()).toContain("size-10");
    // The restyled auth screens put a white badge with the brand mark on the
    // gradient panel, replacing the earlier accent-tint tile.
    expect(logo.classes()).toContain("bg-surface-primary");
    expect(logo.classes()).toContain("text-brand");
    expect(logo.classes()).toContain("rounded-lg");
  });

  it("reverses its copy out for the gradient panel behind it", () => {
    const wrapper = mountPanel();

    expect(wrapper.get("h1").classes()).toContain("text-text-inverse");
    expect(wrapper.get("article").classes()).toContain("bg-white/10");
  });

  it("renders hero-footer content an app supplies", () => {
    const wrapper = mountPanel({
      "hero-footer": '<a href="https://landing.example.test">Browser extension</a>',
    });

    expect(wrapper.text()).toContain("Browser extension");
  });

  it("adds nothing when no hero-footer content is supplied", () => {
    const wrapper = mountPanel();

    expect(wrapper.html()).toBe(mountPanel().html());
    expect(wrapper.text()).not.toContain("Browser extension");
  });
});
