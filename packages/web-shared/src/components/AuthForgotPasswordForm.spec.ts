import { flushPromises, mount } from "@vue/test-utils";
import PrimeVue from "primevue/config";
import { describe, expect, it } from "vitest";

import AuthForgotPasswordForm from "./AuthForgotPasswordForm.vue";

function mountForm(props?: Partial<InstanceType<typeof AuthForgotPasswordForm>["$props"]>) {
  return mount(AuthForgotPasswordForm, {
    props,
    global: {
      plugins: [PrimeVue],
    },
  });
}

describe("AuthForgotPasswordForm", () => {
  it("shows inline validation errors and blocks submit for an invalid email", async () => {
    const wrapper = mountForm();

    await wrapper.get('[data-testid="forgot-password-email"]').setValue("not-an-email");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain("Enter a valid email address.");
    expect(wrapper.find('[data-testid="forgot-password-error"]').exists()).toBe(false);
    expect(wrapper.emitted("submitted")).toBeUndefined();
    expect(wrapper.emitted("error")).toBeUndefined();
  });

  it("emits the submitted email for a valid submit", async () => {
    const wrapper = mountForm();

    await wrapper
      .get('[data-testid="forgot-password-email"]')
      .setValue("  alexey@example.com  ");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.emitted("submitted")).toEqual([["alexey@example.com"]]);
    expect(wrapper.emitted("error")).toBeUndefined();
  });

  it("does not emit a submit for an empty email", async () => {
    const wrapper = mountForm();

    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain("Enter a valid email address.");
    expect(wrapper.emitted("submitted")).toBeUndefined();
  });

  it("renders a parent-supplied failure inline for Firebase errors", () => {
    const wrapper = mountForm({
      errorMessage: "Could not send the reset email. Try again in a moment.",
    });

    const error = wrapper.get('[data-testid="forgot-password-error"]');

    expect(error.text()).toContain("Could not send the reset email.");
    expect(error.get(".p-message").classes()).toContain("p-message-error");
  });

  it("emits error when the form values diverge from the schema on a valid event", async () => {
    const wrapper = mountForm();
    // A `valid` event whose values the schema still rejects means the resolver
    // and the schema disagree; the typed `error` contract surfaces it.
    const formComponent = wrapper.findComponent({ name: "Form" });
    formComponent.vm.$emit("submit", { valid: true, values: { email: "not-an-email" } });
    await flushPromises();

    expect(wrapper.emitted("error")?.length).toBe(1);
    expect((wrapper.emitted("error")![0]![0] as Error).name).toBe("ZodError");
    expect(wrapper.emitted("submitted")).toBeUndefined();
  });

  it("reflects submitting state on the primary action", () => {
    const wrapper = mountForm({ isSubmitting: true });

    expect(
      wrapper.get('[data-testid="forgot-password-submit"]').attributes("disabled"),
    ).toBeDefined();
  });

  describe("renders fluid full-width inputs", () => {
    it("renders full-width without overflow sources", () => {
      const wrapper = mountForm();

      const card = wrapper.get('[data-testid="forgot-password-form"]');
      expect(card.classes()).toContain("w-full");
      expect(card.classes()).toContain("max-w-full");

      const email = wrapper.get('[data-testid="forgot-password-email"]');
      expect(email.classes()).toContain("w-full");
      expect(email.classes()).toContain("p-inputtext-fluid");

      const submit = wrapper.get('[data-testid="forgot-password-submit"]');
      expect(submit.classes()).toContain("w-full");
      expect(submit.classes()).toContain("h-11");
    });
  });
});