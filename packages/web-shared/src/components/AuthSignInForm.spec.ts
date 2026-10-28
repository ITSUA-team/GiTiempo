import { flushPromises, mount } from "@vue/test-utils";
import PrimeVue from "primevue/config";
import { describe, expect, it } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";

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

async function mountFormWithRouter(
  props?: Partial<InstanceType<typeof AuthSignInForm>["$props"]>,
  slots?: Record<string, string>,
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "login", component: { template: "<div />" } },
      {
        path: "/auth/forgot-password",
        name: "forgot-password",
        component: { template: "<div />" },
      },
    ],
  });
  await router.push("/");
  await router.isReady();

  const wrapper = mount(AuthSignInForm, {
    props: {
      description: "Use your workspace account to continue.",
      emailPlaceholder: "alex@example.com",
      errorMessage: null,
      isSubmitting: false,
      title: "Sign in",
      ...props,
    },
    slots,
    global: {
      plugins: [PrimeVue, router],
    },
  });

  return { router, wrapper };
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

  it("renders no forgot-password link by default", () => {
    const wrapper = mountForm();

    expect(wrapper.find('[data-testid="sign-in-forgot-password"]').exists()).toBe(false);
  });

  it("renders the Forgot? link inline with the password label when forgotPasswordTo is set", async () => {
    const { wrapper } = await mountFormWithRouter({
      forgotPasswordTo: { name: "forgot-password" },
    });

    const row = wrapper
      .get('label[for="sign-in-password"]')
      .element.parentElement!;
    const link = wrapper.get('[data-testid="sign-in-forgot-password"]');

    expect(row.className).toContain("justify-between");
    expect(link.text()).toBe("Forgot?");
    expect(link.classes()).toContain("text-brand");
    expect(link.classes()).toContain("text-[13px]");
    expect(link.classes()).toContain("font-semibold");
  });

  it("renders forgot-password slot content when the prop is not set", async () => {
    const { wrapper } = await mountFormWithRouter(
      {},
      {
        "forgot-password":
          '<a href="#" data-testid="custom-forgot-link">Custom forgot</a>',
      },
    );

    expect(wrapper.get('[data-testid="custom-forgot-link"]').text()).toBe(
      "Custom forgot",
    );
    expect(
      wrapper.find('[data-testid="sign-in-forgot-password"]').exists(),
    ).toBe(false);
  });

  it("navigates via the Forgot? link without submitting the login form", async () => {
    const { router, wrapper } = await mountFormWithRouter({
      forgotPasswordTo: { name: "forgot-password" },
    });

    await wrapper.get('[data-testid="sign-in-email"]').setValue("alex@example.com");
    await wrapper.get('[data-testid="sign-in-password"]').setValue("password123");
    await wrapper.get('[data-testid="sign-in-forgot-password"]').trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe("forgot-password");
    expect(wrapper.emitted("submitCredentials")).toBeUndefined();
    // The login attempt state survives the navigation untouched.
    expect(
      (wrapper.get('[data-testid="sign-in-email"]').element as HTMLInputElement).value,
    ).toBe("alex@example.com");
  });

  describe("renders mobile-friendly class hooks", () => {
    it("keeps the Forgot? link visible and unwrapped in the password row", async () => {
      const { wrapper } = await mountFormWithRouter({
        forgotPasswordTo: { name: "forgot-password" },
      });

      const row = wrapper
        .get('label[for="sign-in-password"]')
        .element.parentElement!;
      const link = wrapper.get('[data-testid="sign-in-forgot-password"]');

      expect(row.className).toContain("items-center");
      expect(row.className).toContain("gap-2");
      // shrink-0 + whitespace-nowrap keep the single-word label intact rather
      // than wrapping or being squeezed out below the breakpoint.
      expect(link.classes()).toContain("shrink-0");
      expect(link.classes()).toContain("whitespace-nowrap");
      expect(link.isVisible()).toBe(true);
    });
  });
});
