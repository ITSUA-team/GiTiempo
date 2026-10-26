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

const consoleErrorSpy = vi.fn();
const submittedPassword = "newPassword123";

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

function createDefaultPath(): string {
  return "/auth/reset-password?mode=resetPassword&oobCode=valid-code";
}

async function mountResetPasswordView(initialPath = createDefaultPath()) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createAppRouter({
    history: createMemoryHistory(),
    pinia,
  });
  await router.push(initialPath);
  await router.isReady();
  const ResetPasswordView = (await import("./ResetPasswordView.vue")).default;

  const wrapper = mount(ResetPasswordView, {
    global: {
      plugins: [pinia, router, [PrimeVue, giTiempoPrimeVueOptions], ToastService],
    },
  });

  await flushPromises();

  return { router, wrapper };
}

describe("ResetPasswordView", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    toastAdd.mockReset();
    clearRefreshToken();
    resetAuthRuntimeForTesting();
    consoleErrorSpy.mockReset();
    consoleErrorSpy.mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(consoleErrorSpy);
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
  });

  it("renders the invalid panel when oobCode is missing", async () => {
    const verifyPasswordResetCode = vi.fn();
    const confirmPasswordReset = vi.fn();
    setAuthRuntimeForTesting(
      createRuntimeMock({ verifyPasswordResetCode, confirmPasswordReset }),
    );
    const { wrapper } = await mountResetPasswordView("/auth/reset-password?mode=resetPassword");

    expect(verifyPasswordResetCode).not.toHaveBeenCalled();
    expect(confirmPasswordReset).not.toHaveBeenCalled();
    expect(toastAdd).not.toHaveBeenCalled();
    expect(console.error).not.toHaveBeenCalled();
    expect(wrapper.get('[data-testid="reset-password-invalid-panel"]').text()).toContain(
      "This password reset link is invalid or incomplete.",
    );
    expect(wrapper.find('[data-testid="reset-password-form"]').exists()).toBe(false);
  });

  it("renders the invalid panel when mode is not resetPassword", async () => {
    const verifyPasswordResetCode = vi.fn();
    setAuthRuntimeForTesting(createRuntimeMock({ verifyPasswordResetCode }));
    const { wrapper } = await mountResetPasswordView("/auth/reset-password?oobCode=valid-code");

    expect(verifyPasswordResetCode).not.toHaveBeenCalled();
    expect(toastAdd).not.toHaveBeenCalled();
    expect(wrapper.get('[data-testid="reset-password-invalid-panel"]').text()).toContain(
      "This password reset link is invalid or incomplete.",
    );
  });

  it("shows the verified email and the password form for a valid action code", async () => {
    const verifyPasswordResetCode = vi.fn();
    verifyPasswordResetCode.mockResolvedValue("user@example.com");
    setAuthRuntimeForTesting(createRuntimeMock({ verifyPasswordResetCode }));
    const { wrapper } = await mountResetPasswordView();

    expect(verifyPasswordResetCode).toHaveBeenCalledWith("valid-code");
    expect(wrapper.get('[data-testid="reset-password-email-display"]').text()).toContain(
      "user@example.com",
    );
    expect(wrapper.find('[data-testid="reset-password-form"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="reset-password-invalid-panel"]').exists()).toBe(false);
  });

  it("renders the invalid panel with an error toast for an expired action code", async () => {
    const verifyPasswordResetCode =
      vi.fn<() => Promise<string>>().mockRejectedValueOnce(
        createFirebaseError("auth/expired-action-code"),
      );
    const confirmPasswordReset = vi.fn();
    setAuthRuntimeForTesting(
      createRuntimeMock({ verifyPasswordResetCode, confirmPasswordReset }),
    );
    const { wrapper } = await mountResetPasswordView("/auth/reset-password?mode=resetPassword&oobCode=expired-code");

    expect(wrapper.get('[data-testid="reset-password-invalid-panel"]').text()).toContain(
      "invalid, expired, or already used",
    );
    expect(wrapper.find('[data-testid="reset-password-form"]').exists()).toBe(false);
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: "This password reset link is invalid, expired, or already used. Request a new one to continue.",
        severity: "error",
        summary: "Password reset link is not usable",
      }),
    );
    expect(console.error).toHaveBeenCalledWith("Password reset link is not usable", {
      context: { action: "verify-password-reset-link", feature: "reset-password" },
      error: expect.any(Error),
    });
    expect(confirmPasswordReset).not.toHaveBeenCalled();
  });

  it("offers the password recovery page from the invalid panel", async () => {
    const verifyPasswordResetCode =
      vi.fn<() => Promise<string>>().mockRejectedValueOnce(
        createFirebaseError("auth/invalid-action-code"),
      );
    setAuthRuntimeForTesting(createRuntimeMock({ verifyPasswordResetCode }));
    const { router, wrapper } = await mountResetPasswordView("/auth/reset-password?mode=resetPassword&oobCode=bad-code");

    const routeReady = waitForRoute(
      router,
      () => router.currentRoute.value.name === routeNames.forgotPassword,
    );
    await wrapper.get('[data-testid="reset-password-back-to-forgot"]').trigger("click");
    await routeReady;
    await flushPromises();

    expect(router.currentRoute.value.fullPath).toBe("/auth/forgot-password");
  });

  it("rejects a short password inline without confirming and without toasting", async () => {
    const verifyPasswordResetCode = vi.fn();
    verifyPasswordResetCode.mockResolvedValue("user@example.com");
    const confirmPasswordReset = vi.fn();
    setAuthRuntimeForTesting(
      createRuntimeMock({ verifyPasswordResetCode, confirmPasswordReset }),
    );
    const { wrapper } = await mountResetPasswordView();

    await wrapper.get('[data-testid="reset-password-password"]').setValue("short12");
    await wrapper.get('[data-testid="reset-password-confirm"]').setValue("short12");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(confirmPasswordReset).not.toHaveBeenCalled();
    expect(toastAdd).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("Password must be at least 8 characters.");
  });

  it("rejects mismatched passwords inline without confirming and without toasting", async () => {
    const verifyPasswordResetCode = vi.fn();
    verifyPasswordResetCode.mockResolvedValue("user@example.com");
    const confirmPasswordReset = vi.fn();
    setAuthRuntimeForTesting(
      createRuntimeMock({ verifyPasswordResetCode, confirmPasswordReset }),
    );
    const { wrapper } = await mountResetPasswordView();

    await wrapper.get('[data-testid="reset-password-password"]').setValue(submittedPassword);
    await wrapper.get('[data-testid="reset-password-confirm"]').setValue("differentPassword456");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(confirmPasswordReset).not.toHaveBeenCalled();
    expect(toastAdd).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("Passwords do not match.");
  });

  it("shows the firebase confirm failure inline and as an error toast with the confirm log context", async () => {
    const verifyPasswordResetCode = vi.fn();
    verifyPasswordResetCode.mockResolvedValue("user@example.com");
    const confirmPasswordReset =
      vi.fn<() => Promise<void>>().mockRejectedValueOnce(
        createFirebaseError("auth/invalid-action-code"),
      );
    setAuthRuntimeForTesting(
      createRuntimeMock({ verifyPasswordResetCode, confirmPasswordReset }),
    );
    const { wrapper } = await mountResetPasswordView();

    await wrapper.get('[data-testid="reset-password-password"]').setValue(submittedPassword);
    await wrapper.get('[data-testid="reset-password-confirm"]').setValue(submittedPassword);
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(confirmPasswordReset).toHaveBeenCalledWith("valid-code", submittedPassword);

    const inlineError = wrapper.get('[data-testid="reset-password-error"]');

    expect(inlineError.text()).toContain(
      "This password reset link is invalid, expired, or already used.",
    );
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: "This password reset link is invalid, expired, or already used. Request a new one to continue.",
        severity: "error",
        summary: "Could not update password",
      }),
    );
    expect(console.error).toHaveBeenCalledWith("Could not update password", {
      context: { action: "confirm-password-reset", feature: "reset-password" },
      error: expect.any(Error),
    });
    expect(wrapper.find('[data-testid="forgot-password-error"]').exists()).toBe(false);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(wrapper.text()).not.toContain(submittedPassword);
    expect(JSON.stringify(toastAdd.mock.calls)).not.toContain(submittedPassword);
    expect(JSON.stringify(consoleErrorSpy.mock.calls)).not.toContain(submittedPassword);
  });

  it("never leaks the submitted password in toasts or inline messages after a failed confirm", async () => {
    const verifyPasswordResetCode = vi.fn();
    verifyPasswordResetCode.mockResolvedValue("user@example.com");
    const confirmPasswordReset =
      vi.fn<() => Promise<void>>().mockRejectedValueOnce(
        createFirebaseError("auth/weak-password"),
      );
    setAuthRuntimeForTesting(
      createRuntimeMock({ verifyPasswordResetCode, confirmPasswordReset }),
    );
    const { wrapper } = await mountResetPasswordView();

    await wrapper.get('[data-testid="reset-password-password"]').setValue(submittedPassword);
    await wrapper.get('[data-testid="reset-password-confirm"]').setValue(submittedPassword);
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.get('[data-testid="reset-password-error"]').text()).toContain(
      "Choose a stronger password and try again.",
    );
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: "Choose a stronger password and try again.",
        severity: "error",
        summary: "Could not update password",
      }),
    );
    expect(wrapper.text()).not.toContain(submittedPassword);
    expect(JSON.stringify(toastAdd.mock.calls)).not.toContain(submittedPassword);
    expect(JSON.stringify(consoleErrorSpy.mock.calls)).not.toContain(submittedPassword);
  });

  it("renders the neutral inline error on form-schema divergence without toasting or fetching", async () => {
    const verifyPasswordResetCode = vi.fn();
    verifyPasswordResetCode.mockResolvedValue("user@example.com");
    const confirmPasswordReset = vi.fn();
    setAuthRuntimeForTesting(
      createRuntimeMock({ verifyPasswordResetCode, confirmPasswordReset }),
    );
    const { wrapper } = await mountResetPasswordView();

    const formComponent = wrapper.findComponent({ name: "Form" });
    formComponent.vm.$emit("submit", {
      valid: true,
      values: { password: "short12", confirmPassword: "short12" },
    });
    await flushPromises();

    expect(wrapper.get('[data-testid="reset-password-error"]').text()).toContain(
      "Please check the form fields and try again.",
    );
    expect(confirmPasswordReset).not.toHaveBeenCalled();
    expect(toastAdd).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("confirms the new password, toasts success, and redirects to login", async () => {
    const verifyPasswordResetCode = vi.fn();
    verifyPasswordResetCode.mockResolvedValue("user@example.com");
    const confirmPasswordReset = vi.fn(async () => undefined);
    setAuthRuntimeForTesting(
      createRuntimeMock({ verifyPasswordResetCode, confirmPasswordReset }),
    );
    const { router, wrapper } = await mountResetPasswordView();

    await wrapper.get('[data-testid="reset-password-password"]').setValue(submittedPassword);
    await wrapper.get('[data-testid="reset-password-confirm"]').setValue(submittedPassword);
    const routeReady = waitForRoute(
      router,
      () => router.currentRoute.value.name === routeNames.login,
    );
    await wrapper.get("form").trigger("submit");
    await routeReady;
    await flushPromises();

    expect(confirmPasswordReset).toHaveBeenCalledWith("valid-code", submittedPassword);
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: "You can now sign in with your new password.",
        severity: "success",
        summary: "Password updated",
      }),
    );
    expect(router.currentRoute.value.name).toBe(routeNames.login);
    expect(router.currentRoute.value.fullPath).toBe("/login");
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(wrapper.text()).not.toContain(submittedPassword);
    expect(JSON.stringify(toastAdd.mock.calls)).not.toContain(submittedPassword);
    expect(JSON.stringify(consoleErrorSpy.mock.calls)).not.toContain(submittedPassword);
  });
});