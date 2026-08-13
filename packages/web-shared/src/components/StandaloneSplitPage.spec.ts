import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import StandaloneSplitPage from "./StandaloneSplitPage.vue";
import { authGradientPanelClass } from "./auth-panel";

function mountPage(props?: Record<string, unknown>) {
  return mount(StandaloneSplitPage, {
    props,
    slots: {
      left: '<p data-testid="left">left</p>',
      right: '<p data-testid="right">right</p>',
    },
  });
}

function leftPanel(wrapper: ReturnType<typeof mountPage>) {
  return wrapper.get('[data-testid="left"]').element.parentElement!
    .parentElement!;
}

describe("StandaloneSplitPage", () => {
  it("keeps the white left panel and centred column by default", () => {
    const panel = leftPanel(mountPage());

    expect(panel.className).toContain("bg-surface-primary");
    expect(panel.className).toContain("lg:justify-end");
    expect(panel.firstElementChild?.className).toContain("max-w-[600px]");
  });

  it("paints the brand half of the background and leaves the other half bare", () => {
    const wrapper = mountPage({
      leftPanelClass: authGradientPanelClass,
      leftPanelFullBleed: true,
    });
    const halves = wrapper.get('[data-testid="auth-split-background"]').element
      .children;

    // The gradient sits on a background half, so it reaches the page edge no
    // matter how narrow the content column above it is.
    expect(halves).toHaveLength(2);
    expect(halves[0]!.className).toContain(authGradientPanelClass);
    expect(halves[0]!.className).toContain("w-1/2");
    expect(halves[1]!.className).toContain("w-1/2");
    expect(halves[1]!.className).not.toContain(authGradientPanelClass);
  });

  it("bounds the auth content and centres it on the page", () => {
    const wrapper = mountPage({
      leftPanelClass: authGradientPanelClass,
      leftPanelFullBleed: true,
    });
    const content = wrapper.get('[data-testid="auth-split-content"]').element;

    expect(content.className).toContain("mx-auto");
    expect(content.className).toContain("max-w-[1400px]");
    expect(content.className).toContain("lg:justify-between");
  });

  it("pushes the intro and the form to opposite ends of that bounded row", () => {
    const wrapper = mountPage({
      leftPanelClass: authGradientPanelClass,
      leftPanelFullBleed: true,
    });
    const intro = wrapper.get('[data-testid="auth-split-intro"]').element;
    const form = wrapper.get('[data-testid="auth-split-form"]').element;

    for (const column of [intro, form]) {
      expect(column.className).toContain("lg:w-1/2");
      expect(column.className).toContain("lg:max-w-[640px]");
      expect(column.className).toContain("lg:flex-none");
    }
  });

  it("keeps the columns transparent so neither paints over a background half", () => {
    const wrapper = mountPage({
      leftPanelClass: authGradientPanelClass,
      leftPanelFullBleed: true,
    });
    const intro = wrapper.get('[data-testid="auth-split-intro"]').element;
    const form = wrapper.get('[data-testid="auth-split-form"]').element;

    expect(intro.className).not.toContain("bg-");
    expect(form.className).not.toContain("bg-");
  });

  it("keeps the intro column full height so its logo and footer stay pinned", () => {
    const wrapper = mountPage({
      leftPanelClass: authGradientPanelClass,
      leftPanelFullBleed: true,
    });
    const content = wrapper.get('[data-testid="auth-split-content"]').element;
    const introSlotParent = wrapper.get('[data-testid="left"]').element
      .parentElement!;

    expect(content.className).toContain("min-h-screen");
    expect(content.className).toContain("lg:items-stretch");
    expect(introSlotParent.className).toContain("flex-1");
  });

  it("carries the brand colour on the stacked intro below the split breakpoint", () => {
    const wrapper = mountPage({
      leftPanelClass: authGradientPanelClass,
      leftPanelFullBleed: true,
    });
    const intro = wrapper.get('[data-testid="auth-split-intro"]').element;
    const mobileBackdrop = intro.firstElementChild!;

    // Stacked layouts have no half to paint, so the intro carries the gradient
    // itself and drops it again once the halves appear.
    expect(mobileBackdrop.className).toContain(authGradientPanelClass);
    expect(mobileBackdrop.className).toContain("lg:hidden");
  });

  it("leaves the register and invite composition untouched", () => {
    const wrapper = mountPage();
    const panel = leftPanel(wrapper);
    const right = wrapper.get('[data-testid="right"]').element.parentElement!
      .parentElement!;

    expect(wrapper.find('[data-testid="auth-split-background"]').exists()).toBe(
      false,
    );
    expect(panel.className).toContain("lg:min-w-[50vw]");
    expect(right.className).toContain("lg:min-w-[50vw]");
    expect(right.firstElementChild?.className).toContain("max-w-[600px]");
  });
});
