import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";

import SkipToContentLink from "./SkipToContentLink.vue";
import { MAIN_CONTENT_ELEMENT_ID } from "./skip-link";

function renderMainRegion(id: string = MAIN_CONTENT_ELEMENT_ID): HTMLElement {
  const main = document.createElement("main");
  main.id = id;
  main.tabIndex = -1;
  document.body.appendChild(main);

  return main;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("SkipToContentLink", () => {
  it("renders a link pointing at the main region", () => {
    const wrapper = mount(SkipToContentLink, { attachTo: document.body });
    const link = wrapper.get("a");

    expect(link.text()).toBe("Skip to main content");
    expect(link.attributes("href")).toBe(`#${MAIN_CONTENT_ELEMENT_ID}`);
  });

  it("stays visually hidden until it is focused", () => {
    const wrapper = mount(SkipToContentLink, { attachTo: document.body });
    const linkClass = wrapper.get("a").classes();

    expect(linkClass).toContain("sr-only");
    expect(linkClass).toContain("focus:not-sr-only");
    expect(linkClass).not.toContain("hidden");
    expect(linkClass).not.toContain("outline-none");
  });

  it("moves focus into the main region when activated", async () => {
    const main = renderMainRegion();
    const wrapper = mount(SkipToContentLink, { attachTo: document.body });

    await wrapper.get("a").trigger("click");

    expect(document.activeElement).toBe(main);
  });

  it("takes focus without scrolling the page", async () => {
    const main = renderMainRegion();
    const focusSpy = vi.spyOn(main, "focus");
    const wrapper = mount(SkipToContentLink, { attachTo: document.body });

    await wrapper.get("a").trigger("click");

    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("moves focus into a custom target region", async () => {
    const main = renderMainRegion("report-content");
    const wrapper = mount(SkipToContentLink, {
      attachTo: document.body,
      props: { targetId: "report-content" },
    });

    await wrapper.get("a").trigger("click");

    expect(document.activeElement).toBe(main);
  });

  it("leaves navigation to the browser when the target is missing", async () => {
    const wrapper = mount(SkipToContentLink, { attachTo: document.body });
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });

    wrapper.get("a").element.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(false);
  });

  it("prevents the browser fragment navigation once it has taken focus", () => {
    renderMainRegion();
    const wrapper = mount(SkipToContentLink, { attachTo: document.body });
    const event = new MouseEvent("click", { bubbles: true, cancelable: true });

    wrapper.get("a").element.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it("renders a custom label", () => {
    const wrapper = mount(SkipToContentLink, {
      attachTo: document.body,
      props: { label: "Skip to report" },
    });

    expect(wrapper.get("a").text()).toBe("Skip to report");
  });
});
