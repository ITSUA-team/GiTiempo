import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import PrimeVue from "primevue/config";
import ToastService from "primevue/toastservice";
import { createMemoryHistory } from "vue-router";
import type {
  CurrentUserWorkspaceMembershipListResponse,
  UserResponse,
} from "@gitiempo/shared";
import { giTiempoPrimeVueOptions } from "@gitiempo/web-config/theme";
import { clearRefreshToken } from "@gitiempo/web-shared/session-storage";
import { waitForRoute } from "@gitiempo/web-shared/testing";

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

const successToastDetail =
  "If an account exists for the entered email, a password reset link is on its way. Open it to choose a new password, then sign in again.";

function createRuntimeMock(overrides?: Partial<AuthRuntime>): AuthRuntime {
  const currentUser: UserResponse = {
    avatarUrl: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    displayName: "Admin User",
    email: "admin@example.com",
    id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
    role: "admin",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  const workspaceMemberships: CurrentUserWorkspaceMembershipListResponse = {
    items: [
      {
        isCurrent: true,
        role: "admin",
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
    verifyPasswordResetCode: async () => "admin@example.com",
    confirmPasswordReset: async () => undefined,
    updateCurrentUser: async (_accessToken, input) => ({
      ...currentUser,
      ...input,
    }),
    ...overrides,
  };
}

async function mountForgotPasswordView(
  initialPath = "/auth/forgot-password",
) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createAppRouter({
    history: createMemoryHistory(),
    pinia,
  });
  await router.push(initialPath);
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
    vi.stubEnv("VITE_USER_APP_URL", "https://user.example.test/login");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
  });

  it("shows inline validation for an invalid email without any toast or runtime call", async () => {
    const runtime = createRuntimeMock({ requestPasswordReset: vi.fn() });
    setAuthRuntimeForTesting(runtime);
    const { wrapper } = await mountForgotPasswordView();

    await wrapper.get('[data-testid="forgot-password-email"]').setValue("not-an-email");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain("Enter a valid email address.");
    expect(runtime.requestPasswordReset).not.toHaveBeenCalled();
    expect(toastAdd).not.toHaveBeenCalled();
  });

  it("sends the reset request, swaps to the success panel, and returns to admin login", async () => {
    const runtime = createRuntimeMock({ requestPasswordReset: vi.fn() });
    setAuthRuntimeForTesting(runtime);
    const { router, wrapper } = await mountForgotPasswordView();

    await wrapper.get('[data-testid="forgot-password-email"]').setValue("admin@example.com");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(runtime.requestPasswordReset).toHaveBeenCalledOnce();
    expect(runtime.requestPasswordReset).toHaveBeenCalledWith("admin@example.com");
    expect(toastAdd).toHaveBeenCalledTimes(1);
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: successToastDetail,
        severity: "success",
        summary: "Success",
      }),
    );
    expect(console.error).not.toHaveBeenCalled();
    expect(wrapper.find('[data-testid="forgot-password-success-panel"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="forgot-password-form"]').exists()).toBe(false);

    // The whole flow talks only to Firebase; no GiTiempo API is touched.
    expect(globalThis.fetch).not.toHaveBeenCalled();

    const routeReady = waitForRoute(
      router,
      () => router.currentRoute.value.name === routeNames.login,
    );
    await wrapper.get('[data-testid="forgot-password-back-to-login"]').trigger("click");
    await routeReady;

    expect(router.currentRoute.value.name).toBe(routeNames.login);
    expect(router.currentRoute.value.fullPath).toBe("/login");
  });

  it("shows the same success copy for an unknown email so account existence is never disclosed", async () => {
    const runtime = createRuntimeMock({ requestPasswordReset: vi.fn() });
    setAuthRuntimeForTesting(runtime);
    const { wrapper } = await mountForgotPasswordView();

    await wrapper.get('[data-testid="forgot-password-email"]').setValue("unknown@example.com");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(runtime.requestPasswordReset).toHaveBeenCalledWith("unknown@example.com");
    expect(toastAdd).toHaveBeenCalledTimes(1);
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: successToastDetail,
        severity: "success",
        summary: "Success",
      }),
    );

    const panelText = wrapper
      .get('[data-testid="forgot-password-success-panel"]')
      .text()
      .toLowerCase();
    const toastCall = toastAdd.mock.calls[0]?.[0] as Record<string, string>;
    const toastText = `${toastCall.summary} ${toastCall.detail}`.toLowerCase();

    expect(panelText).toContain("check your email");
    expect(panelText).toContain("if an account exists for the address you entered");
    expect(toastText).toContain(successToastDetail.toLowerCase());

    for (const text of [panelText, toastText]) {
      expect(text).not.toContain("not found");
      expect(text).not.toContain("does not exist");
      expect(text).not.toContain("no such");
      expect(text).not.toContain("user-not-found");
    }
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("keeps the form available with inline guidance and an error toast when Firebase rejects the request", async () => {
    const runtime = createRuntimeMock({
      requestPasswordReset: vi.fn().mockRejectedValue(
        createFirebaseError("auth/network-request-failed", "reset send failed"),
      ),
    });
    setAuthRuntimeForTesting(runtime);
    const { wrapper } = await mountForgotPasswordView();

    await wrapper.get('[data-testid="forgot-password-email"]').setValue("admin@example.com");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.get('[data-testid="forgot-password-error"]').text()).toContain(
      "Network error. Check your connection and try again.",
    );
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: expect.stringContaining("Network error"),
        severity: "error",
        summary: "Error",
      }),
    );
    expect(console.error).toHaveBeenCalledWith("Error", {
      context: { action: "send-password-reset", feature: "forgot-password" },
      error: expect.any(Error),
    });
    expect(toastAdd).toHaveBeenCalledTimes(1);
    expect(wrapper.find('[data-testid="forgot-password-success-panel"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="forgot-password-submit"]').exists()).toBe(true);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("keeps an unknown-account failure neutral without echoing Firebase codes or the email", async () => {
    const runtime = createRuntimeMock({
      requestPasswordReset: vi.fn().mockRejectedValue(
        createFirebaseError(
          "auth/user-not-found",
          "Firebase: Error (auth/user-not-found).",
        ),
      ),
    });
    setAuthRuntimeForTesting(runtime);
    const { wrapper } = await mountForgotPasswordView();

    await wrapper.get('[data-testid="forgot-password-email"]').setValue("unknown@example.com");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    const inlineError = wrapper.get('[data-testid="forgot-password-error"]');

    expect(inlineError.text()).toContain(
      "Could not send the reset email. Try again in a moment.",
    );
    expect(inlineError.text()).not.toContain("user-not-found");
    expect(inlineError.text()).not.toContain("Firebase: Error");
    expect(wrapper.text()).not.toContain("unknown@example.com");
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: "Could not send the reset email. Try again in a moment.",
        severity: "error",
        summary: "Error",
      }),
    );
    expect(console.error).toHaveBeenCalledWith("Error", {
      context: { action: "send-password-reset", feature: "forgot-password" },
      error: expect.any(Error),
    });
    expect(toastAdd).toHaveBeenCalledTimes(1);
    expect(wrapper.find('[data-testid="forgot-password-submit"]').exists()).toBe(true);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("keeps a client-side form error inline with the neutral copy and no toast or API call", async () => {
    const runtime = createRuntimeMock({ requestPasswordReset: vi.fn() });
    setAuthRuntimeForTesting(runtime);
    const { wrapper } = await mountForgotPasswordView();
    const formComponent = wrapper.findComponent({ name: "Form" });

    formComponent.vm.$emit("submit", { valid: true, values: { email: "not-an-email" } });
    await flushPromises();

    expect(wrapper.get('[data-testid="forgot-password-error"]').text()).toContain(
      "Please check the form fields and try again.",
    );
    expect(runtime.requestPasswordReset).not.toHaveBeenCalled();
    expect(toastAdd).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});