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

  it("emits GitHub submit", async () => {
    const wrapper = mountForm();

    await wrapper.get('[data-testid="sign-in-github"]').trigger("click");

    expect(wrapper.emitted("submitGithub")).toEqual([[]]);
  });

  it("hides the GitHub button when GitHub sign-in is disabled", () => {
    const wrapper = mountForm({ githubEnabled: false });

    expect(wrapper.find('[data-testid="sign-in-github"]').exists()).toBe(false);
  });

  it("reflects submitting state", () => {
    const wrapper = mountForm({ isSubmitting: true });

    const submitButton = wrapper.get('[data-testid="sign-in-submit"]');
    const googleButton = wrapper.get('[data-testid="sign-in-google"]');
    const githubButton = wrapper.get('[data-testid="sign-in-github"]');

    expect(submitButton.attributes("disabled")).toBeDefined();
    expect(googleButton.attributes("disabled")).toBeDefined();
    expect(githubButton.attributes("disabled")).toBeDefined();
  });

  it("exposes the input purpose on the rendered password input", () => {
    const wrapper = mountForm();
    const password = wrapper.get('[data-testid="sign-in-password"]');

    expect(password.element.tagName).toBe("INPUT");
    expect(password.attributes("autocomplete")).toBe("current-password");
  });

  it("exposes the input purpose on the rendered email input", () => {
    const wrapper = mountForm();
    const email = wrapper.get('[data-testid="sign-in-email"]');

    expect(email.element.tagName).toBe("INPUT");
    expect(email.attributes("autocomplete")).toBe("email");
  });

  it("renders external sign-in errors", () => {
    const wrapper = mountForm({ errorMessage: "Invalid credentials" });

    expect(wrapper.get('[data-testid="sign-in-error"]').text()).toBe(
      "Invalid credentials",
    );
  });

  it("announces a sign-in failure through a live region", () => {
    const wrapper = mountForm({ errorMessage: "Invalid credentials" });

    expect(
      wrapper.get('[data-testid="sign-in-error"]').attributes("role"),
    ).toBe("alert");
  });

  it("announces the help link as part of the same failure message", () => {
    const wrapper = mountForm({
      errorHelpHref: "https://github.com/settings/emails",
      errorHelpLabel: "Check your verified emails",
      errorMessage: "That GitHub account has no verified workspace email.",
    });
    const alert = wrapper.get('[data-testid="sign-in-error"]');

    expect(alert.attributes("role")).toBe("alert");
    expect(alert.text()).toContain("Check your verified emails");
  });

  it("renders no live region while sign-in has not failed", () => {
    const wrapper = mountForm();

    expect(wrapper.find('[data-testid="sign-in-error"]').exists()).toBe(false);
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });

  it("renders custom secondary actions below Google sign-in", () => {
    const wrapper = mountFormWithSlot();

    expect(wrapper.get('[data-testid="custom-secondary-action"]').text()).toBe(
      "Create workspace",
    );
  });

  it("associates the email label with the rendered input", () => {
    const wrapper = mountForm();

    expect(wrapper.get('label[for="sign-in-email"]').text()).toBe("Email");
    expect(wrapper.get("input#sign-in-email").attributes("name")).toBe("email");
  });
});
