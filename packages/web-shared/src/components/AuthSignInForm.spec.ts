import { flushPromises, mount } from "@vue/test-utils";
import PrimeVue from "primevue/config";
import { describe, expect, it } from "vitest";

import AuthSignInForm from "./AuthSignInForm.vue";

function mountForm(props?: Partial<InstanceType<typeof AuthSignInForm>["$props"]>) {
  return mount(AuthSignInForm, {
    props: {
      description: "Use your workspace account to continue.",
      emailPlaceholder: "alex@example.com",
      errorMessage: null,
      isSubmitting: false,
      title: "Sign in",
      ...props,
    },
    global: {
      plugins: [PrimeVue],
    },
  });
}

function mountFormWithSlot() {
  return mount(AuthSignInForm, {
    props: {
      description: "Use your workspace account to continue.",
      emailPlaceholder: "alex@example.com",
      errorMessage: null,
      isSubmitting: false,
      title: "Sign in",
    },
    slots: {
      "secondary-actions":
        '<button type="button" data-testid="custom-secondary-action">Create workspace</button>',
    },
    global: {
      plugins: [PrimeVue],
    },
  });
}

describe("AuthSignInForm", () => {
  it("shows validation errors and blocks submit for invalid data", async () => {
    const wrapper = mountForm();

    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain("Enter a valid email address.");
    expect(wrapper.text()).toContain("Enter your password.");
    expect(wrapper.emitted("submitCredentials")).toBeUndefined();
  });

  it("emits parsed credentials for valid submit", async () => {
    const wrapper = mountForm();

    await wrapper.get('input[name="email"]').setValue("admin@example.com");
    await wrapper.get('[data-testid="sign-in-password"]').setValue("password123");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.emitted("submitCredentials")).toEqual([
      [{ email: "admin@example.com", password: "password123" }],
    ]);
  });

  it("emits Google submit", async () => {
    const wrapper = mountForm();

    await wrapper.get('[data-testid="sign-in-google"]').trigger("click");

    expect(wrapper.emitted("submitGoogle")).toEqual([[]]);
  });

  it("reflects submitting state", () => {
    const wrapper = mountForm({ isSubmitting: true });

    const submitButton = wrapper.get('[data-testid="sign-in-submit"]');
    const googleButton = wrapper.get('[data-testid="sign-in-google"]');

    expect(submitButton.attributes("disabled")).toBeDefined();
    expect(googleButton.attributes("disabled")).toBeDefined();
  });

  it("renders external sign-in errors", () => {
    const wrapper = mountForm({ errorMessage: "Invalid credentials" });

    expect(wrapper.get('[data-testid="sign-in-error"]').text()).toBe(
      "Invalid credentials",
    );
  });

  it("renders custom secondary actions below Google sign-in", () => {
    const wrapper = mountFormWithSlot();

    expect(wrapper.get('[data-testid="custom-secondary-action"]').text()).toBe(
      "Create workspace",
    );
  });
});
