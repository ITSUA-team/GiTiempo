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

  it("paints the whole left half for the auth screens", () => {
    const panel = leftPanel(
      mountPage({
        leftPanelClass: authGradientPanelClass,
        leftPanelFullBleed: true,
      }),
    );

    // The gradient sits on the half itself, not the inner column, so it reaches
    // the page edge instead of leaving an unpainted strip beside the content.
    expect(panel.className).toContain(authGradientPanelClass);
    expect(panel.className).toContain("lg:justify-start");
    expect(panel.firstElementChild?.className).not.toContain(
      authGradientPanelClass,
    );
  });

  it("centres the auth intro column instead of pinning it to the page edge", () => {
    const panel = leftPanel(
      mountPage({
        leftPanelClass: authGradientPanelClass,
        leftPanelFullBleed: true,
      }),
    );

    expect(panel.firstElementChild?.className).toContain("mx-auto");
    expect(panel.firstElementChild?.className).toContain("max-w-[640px]");
  });

  it("gives the brand panel the space the auth form does not need", () => {
    const wrapper = mountPage({
      leftPanelClass: authGradientPanelClass,
      leftPanelFullBleed: true,
    });
    const left = leftPanel(wrapper);
    const right = wrapper.get('[data-testid="right"]').element.parentElement!
      .parentElement!;

    // Design: the form column keeps its own width and the brand panel takes the
    // rest, rather than the halves splitting the viewport evenly.
    expect(left.className).toContain("lg:flex-1");
    expect(left.className).not.toContain("lg:min-w-[50vw]");
    expect(right.className).toContain("lg:flex-none");
    expect(right.className).not.toContain("lg:flex-1");
  });

  it("keeps the auth form column within readable bounds", () => {
    const wrapper = mountPage({
      leftPanelClass: authGradientPanelClass,
      leftPanelFullBleed: true,
    });
    const right = wrapper.get('[data-testid="right"]').element.parentElement!
      .parentElement!;

    // Ratio rather than the design's raw 520px, so the form does not read as a
    // narrow strip on large displays; bounded so it stays sane at both ends.
    expect(right.className).toContain("lg:w-[41%]");
    expect(right.className).toContain("lg:min-w-[520px]");
    expect(right.className).toContain("lg:max-w-[640px]");
  });
});
