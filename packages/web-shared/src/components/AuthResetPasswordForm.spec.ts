import { flushPromises, mount } from "@vue/test-utils";
import PrimeVue from "primevue/config";
import { beforeAll, describe, expect, it } from "vitest";

import AuthResetPasswordForm from "./AuthResetPasswordForm.vue";

function mountForm(props?: Partial<InstanceType<typeof AuthResetPasswordForm>["$props"]>) {
  return mount(AuthResetPasswordForm, {
    props,
    global: {
      plugins: [PrimeVue],
    },
  });
}

const NARROW_VIEWPORT_WIDTH = 390;

describe("AuthResetPasswordForm", () => {
  beforeAll(() => {
    // Matches the `.pen` Register New Workflow Mobile frame width so the
    // full-width invariants below are evaluated at the narrowest supported
    // viewport.
    globalThis.innerWidth = NARROW_VIEWPORT_WIDTH;
    globalThis.dispatchEvent(new Event("resize"));
  });

  it("shows inline validation and blocks submit for a short password", async () => {
    const wrapper = mountForm();

    await wrapper.get('[data-testid="reset-password-password"]').setValue("short12");
    await wrapper.get('[data-testid="reset-password-confirm"]').setValue("short12");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain("Password must be at least 8 characters.");
    expect(wrapper.emitted("submitted")).toBeUndefined();
  });

  it("shows the mismatch inline and blocks submit when the confirmation differs", async () => {
    const wrapper = mountForm();

    await wrapper.get('[data-testid="reset-password-password"]').setValue("password123");
    await wrapper.get('[data-testid="reset-password-confirm"]').setValue("password456");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain("Passwords do not match.");
    expect(wrapper.emitted("submitted")).toBeUndefined();
  });

  it("emits the new password for a valid matching submit", async () => {
    const wrapper = mountForm();

    await wrapper.get('[data-testid="reset-password-password"]').setValue("password123");
    await wrapper.get('[data-testid="reset-password-confirm"]').setValue("password123");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.emitted("submitted")).toEqual([["password123"]]);
    expect(wrapper.emitted("error")).toBeUndefined();
  });

  it("keeps an empty confirmation inline-only without a submit", async () => {
    const wrapper = mountForm();

    await wrapper.get('[data-testid="reset-password-password"]').setValue("password123");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain("Confirm your password.");
    expect(wrapper.emitted("submitted")).toBeUndefined();
  });

  it("renders a parent-supplied failure inline for Firebase errors", () => {
    const wrapper = mountForm({
      errorMessage: "Could not save your password.",
    });

    const error = wrapper.get('[data-testid="reset-password-error"]');

    expect(error.text()).toContain("Could not save your password.");
    expect(error.get(".p-message").classes()).toContain("p-message-error");
  });

  it("emits error when the form values diverge from the schema on a valid event", async () => {
    const wrapper = mountForm();
    // A `valid` event whose values the schema still rejects means the resolver
    // and the schema disagree; the typed `error` contract surfaces it.
    const formComponent = wrapper.findComponent({ name: "Form" });
    formComponent.vm.$emit("submit", {
      valid: true,
      values: { password: "short12", confirmPassword: "short12" },
    });
    await flushPromises();

    expect(wrapper.emitted("error")?.length).toBe(1);
    expect((wrapper.emitted("error")![0]![0] as Error).name).toBe("ZodError");
    expect(wrapper.emitted("submitted")).toBeUndefined();
  });

  it("reflects submitting state on the primary action", () => {
    const wrapper = mountForm({ isSubmitting: true });

    expect(
      wrapper.get('[data-testid="reset-password-submit"]').attributes("disabled"),
    ).toBeDefined();
  });

  it("keeps password inputs masked with no strength meter", () => {
    const wrapper = mountForm();

    for (const input of wrapper.findAll("input[type='password']")) {
      expect(input.element.getAttribute("type")).toBe("password");
    }

    expect(wrapper.find(".p-password-meter").exists()).toBe(false);
  });

  describe("mobile (390px) layout invariants", () => {
    it("keeps the card, fields, and action full-width without horizontal overflow", () => {
      const wrapper = mountForm();

      const card = wrapper.get('[data-testid="reset-password-form"]');
      expect(card.classes()).toContain("w-full");
      expect(card.classes()).toContain("max-w-full");

      for (const selector of [
        '[data-testid="reset-password-password"]',
        '[data-testid="reset-password-confirm"]',
      ]) {
        const input = wrapper.get(selector);
        expect(input.classes()).toContain("w-full");
        expect(input.classes()).toContain("p-inputtext-fluid");
      }

      const submit = wrapper.get('[data-testid="reset-password-submit"]');
      expect(submit.classes()).toContain("w-full");
      expect(submit.classes()).toContain("h-11");
    });

    it("renders the password inputs full-width through their PrimeVue wrappers", () => {
      const wrapper = mountForm();
      const wrapperSpans = wrapper.findAll(".p-password");

      expect(wrapperSpans.length).toBe(2);
      for (const span of wrapperSpans) {
        expect(span.classes()).toContain("p-password-fluid");
      }
    });
  });
});