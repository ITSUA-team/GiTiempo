import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryHistory } from "vue-router";
import { createPinia, setActivePinia } from "pinia";
import PrimeVue from "primevue/config";
import ToastService from "primevue/toastservice";
import type {
  CurrentUserWorkspaceMembershipListResponse,
  UserResponse,
} from "@gitiempo/shared";
import { giTiempoPrimeVueOptions } from "@gitiempo/web-config/theme";
import { waitForRoute } from "@gitiempo/web-shared/testing";

import { clearRefreshToken } from "@gitiempo/web-shared/session-storage";
import { createAppRouter, routeNames } from "@/router";
import {
  resetAuthRuntimeForTesting,
  setAuthRuntimeForTesting,
  type AuthRuntime,
} from "@/services/auth-runtime";

const toastAdd = vi.fn();

vi.mock("primevue/usetoast", () => ({
  useToast: () => ({ add: toastAdd }),
}));

function createFirebaseError(code: string, message = code): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

function createRuntimeMock(overrides?: Partial<AuthRuntime>): AuthRuntime {
  const currentUser: UserResponse = {
    avatarUrl: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    displayName: "Alexey Tsukanov",
    email: "alexey@example.com",
    id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
    role: "member",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  const workspaceMemberships: CurrentUserWorkspaceMembershipListResponse = {
    items: [
      {
        isCurrent: true,
        role: "member",
        workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
        workspaceName: "Workspace Alpha",
      },
    ],
  };

  return {
    getCurrentUser: async () => currentUser,
    listCurrentUserWorkspaces: async () => workspaceMemberships,
    loginWithFirebaseToken: async () => ({
      accessToken: "access-token",
      accessTokenExpiresIn: 900,
      refreshToken: "refresh-token-next",
    }),
    logoutSession: async () => undefined,
    registerWorkspaceOwner: async () => ({
      accessToken: "registered-access-token",
      accessTokenExpiresIn: 900,
      refreshToken: "registered-refresh-token",
    }),
    refreshSession: async () => ({
      accessToken: "restored-access-token",
      accessTokenExpiresIn: 900,
      refreshToken: "restored-refresh-token",
    }),
    switchWorkspace: async () => ({
      accessToken: "switched-access-token",
      accessTokenExpiresIn: 900,
      refreshToken: "switched-refresh-token",
    }),
    signInWithEmailPassword: async () => "firebase-email-token",
    signInWithGoogle: async () => "firebase-google-token",
    exchangeGithubSession: async () => ({ accessToken: "github-access-token", accessTokenExpiresIn: 900, refreshToken: "github-refresh-token" }),
    signOutIdentityProvider: async () => undefined,
    requestPasswordReset: async () => undefined,
    verifyPasswordResetCode: async () => "user@example.com",
    confirmPasswordReset: async () => undefined,
    updateCurrentUser: async (_accessToken, input) => ({
      ...currentUser,
      ...input,
    }),
    ...overrides,
  };
}

async function mountForgotPasswordView() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createAppRouter({
    history: createMemoryHistory(),
    pinia,
  });
  await router.push("/auth/forgot-password");
  await router.isReady();
  const ForgotPasswordView = (await import("./ForgotPasswordView.vue")).default;

  return {
    router,
    wrapper: mount(ForgotPasswordView, {
      global: {
        plugins: [pinia, router, [PrimeVue, giTiempoPrimeVueOptions], ToastService],
      },
    }),
  };
}

describe("ForgotPasswordView", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    clearRefreshToken();
    resetAuthRuntimeForTesting();
    toastAdd.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
  });

  it("rejects an invalid email inline without sending or toasting", async () => {
    const requestPasswordReset = vi.fn();
    setAuthRuntimeForTesting(createRuntimeMock({ requestPasswordReset }));
    const { wrapper } = await mountForgotPasswordView();

    await wrapper.get('[data-testid="forgot-password-email"]').setValue("not-an-email");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(requestPasswordReset).not.toHaveBeenCalled();
    expect(toastAdd).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("Enter a valid email address.");
  });

  it("sends the reset email and shows the success panel with a success toast", async () => {
    const requestPasswordReset = vi.fn();
    setAuthRuntimeForTesting(createRuntimeMock({ requestPasswordReset }));
    const { router, wrapper } = await mountForgotPasswordView();

    await wrapper.get('[data-testid="forgot-password-email"]').setValue("alexey@example.com");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(requestPasswordReset).toHaveBeenCalledWith("alexey@example.com");
    expect(toastAdd).toHaveBeenCalledTimes(1);
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: "If an account exists for that email, a password reset link has been sent.",
        severity: "success",
        summary: "Check your email",
      }),
    );
    expect(wrapper.find('[data-testid="forgot-password-form"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="forgot-password-success-panel"]').exists()).toBe(true);
    expect(globalThis.fetch).not.toHaveBeenCalled();

    const routeReady = waitForRoute(
      router,
      () => router.currentRoute.value.name === routeNames.login,
    );
    await wrapper.get('[data-testid="forgot-password-back-to-login"]').trigger("click");
    await routeReady;
    await flushPromises();

    expect(router.currentRoute.value.name).toBe(routeNames.login);
  });

  it("shows identical success copy for an unknown account (no enumeration)", async () => {
    const requestPasswordReset = vi.fn();
    setAuthRuntimeForTesting(createRuntimeMock({ requestPasswordReset }));
    const { wrapper } = await mountForgotPasswordView();

    await wrapper.get('[data-testid="forgot-password-email"]').setValue("unknown.account@example.com");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(requestPasswordReset).toHaveBeenCalledWith("unknown.account@example.com");
    const panel = wrapper.get('[data-testid="forgot-password-success-panel"]');
    const panelText = panel.text().toLowerCase();
    const toastCall = toastAdd.mock.calls[0]?.[0] as Record<string, string>;
    const toastText = `${toastCall.summary} ${toastCall.detail}`.toLowerCase();

    expect(panelText).toContain("check your email");
    expect(panelText).toContain("if an account exists for that email");
    expect(toastText).toContain("check your email");
    expect(toastText).toContain("if an account exists for that email");

    for (const text of [panelText, toastText]) {
      expect(text).not.toContain("not found");
      expect(text).not.toContain("does not exist");
      expect(text).not.toContain("unknown account");
      expect(text).not.toContain("no such");
    }
  });

  it("shows the firebase failure inline and as an error toast with the send log context", async () => {
    const requestPasswordReset =
      vi.fn<() => Promise<void>>().mockRejectedValueOnce(
        createFirebaseError("auth/network-request-failed"),
      );
    setAuthRuntimeForTesting(createRuntimeMock({ requestPasswordReset }));
    const { wrapper } = await mountForgotPasswordView();

    await wrapper.get('[data-testid="forgot-password-email"]').setValue("alexey@example.com");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    const inlineError = wrapper.get('[data-testid="forgot-password-error"]');

    expect(inlineError.text()).toContain(
      "Network error. Check your connection and try again.",
    );
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: "Network error. Check your connection and try again.",
        severity: "error",
        summary: "Could not send reset link",
      }),
    );
    expect(console.error).toHaveBeenCalledWith("Could not send reset link", {
      context: { action: "send-password-reset", feature: "forgot-password" },
      error: expect.any(Error),
    });
    expect(wrapper.find('[data-testid="forgot-password-success-panel"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="forgot-password-form"]').exists()).toBe(true);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("shows the neutral fallback instead of the raw message when the account is unknown", async () => {
    const requestPasswordReset =
      vi.fn<() => Promise<void>>().mockRejectedValueOnce(
        createFirebaseError(
          "auth/user-not-found",
          "Firebase: Error (auth/user-not-found).",
        ),
      );
    setAuthRuntimeForTesting(createRuntimeMock({ requestPasswordReset }));
    const { wrapper } = await mountForgotPasswordView();

    await wrapper.get('[data-testid="forgot-password-email"]').setValue("unknown.account@example.com");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    const inlineError = wrapper.get('[data-testid="forgot-password-error"]');

    expect(inlineError.text()).toContain(
      "Could not send the reset link. Try again in a moment.",
    );
    expect(inlineError.text()).not.toContain("user-not-found");
    expect(inlineError.text()).not.toContain("Firebase: Error");
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: "Could not send the reset link. Try again in a moment.",
        severity: "error",
        summary: "Could not send reset link",
      }),
    );
    expect(requestPasswordReset).toHaveBeenCalledWith("unknown.account@example.com");
    expect(wrapper.find('[data-testid="forgot-password-success-panel"]').exists()).toBe(false);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("renders the neutral inline error on form-schema divergence without toasting or fetching", async () => {
    const requestPasswordReset = vi.fn();
    setAuthRuntimeForTesting(createRuntimeMock({ requestPasswordReset }));
    const { wrapper } = await mountForgotPasswordView();

    const formComponent = wrapper.findComponent({ name: "Form" });
    formComponent.vm.$emit("submit", { valid: true, values: { email: "not-an-email" } });
    await flushPromises();

    expect(wrapper.get('[data-testid="forgot-password-error"]').text()).toContain(
      "Please check the form fields and try again.",
    );
    expect(requestPasswordReset).not.toHaveBeenCalled();
    expect(toastAdd).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});