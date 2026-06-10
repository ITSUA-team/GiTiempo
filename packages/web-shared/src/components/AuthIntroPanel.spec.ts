import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import AuthIntroPanel from "./AuthIntroPanel.vue";

function mountPanel() {
  return mount(AuthIntroPanel, {
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
    expect(logo.classes()).toContain("bg-accent-tint");
    expect(logo.classes()).toContain("text-brand");
    expect(logo.classes()).toContain("rounded-[12px]");
    expect(logo.classes()).not.toContain("rounded-xl");
  });
});
