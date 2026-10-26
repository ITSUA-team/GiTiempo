import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import PrimeVue from "primevue/config";
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
import ResetPasswordView from "./ResetPasswordView.vue";

const toastMocks = vi.hoisted(() => ({
  errorToast: vi.fn(),
  infoToast: vi.fn(),
  successToast: vi.fn(),
}));

vi.mock("@/composables/feedback/useToasts", () => ({
  useToasts: () => toastMocks,
}));

function createFirebaseError(code: string, message = code): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

function createDefaultPath(): string {
  return "/auth/reset-password?mode=resetPassword&oobCode=valid-code";
}

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

function expectNoToastArgContainsPassword(submittedPassword: string): void {
  const recordedArgs = [
    ...toastMocks.successToast.mock.calls,
    ...toastMocks.errorToast.mock.calls,
  ];

  for (const call of recordedArgs) {
    expect(JSON.stringify(call)).not.toContain(submittedPassword);
  }
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

  const wrapper = mount(ResetPasswordView, {
    global: {
      plugins: [pinia, router, [PrimeVue, giTiempoPrimeVueOptions]],
    },
  });

  await flushPromises();

  return { router, wrapper };
}

describe("ResetPasswordView", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    clearRefreshToken();
    resetAuthRuntimeForTesting();
    toastMocks.errorToast.mockReset();
    toastMocks.infoToast.mockReset();
    toastMocks.successToast.mockReset();
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
  });

  it("renders the invalid panel without a runtime call when the action link is missing parameters", async () => {
    const runtime = createRuntimeMock({
      verifyPasswordResetCode: vi.fn(),
    });
    setAuthRuntimeForTesting(runtime);
    const { wrapper } = await mountResetPasswordView("/auth/reset-password");

    expect(runtime.verifyPasswordResetCode).not.toHaveBeenCalled();
    expect(wrapper.find('[data-testid="reset-password-view"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="reset-password-invalid-panel"]').exists()).toBe(true);
    expect(toastMocks.errorToast).not.toHaveBeenCalled();
    expect(toastMocks.successToast).not.toHaveBeenCalled();
  });

  it("renders the invalid panel when the mode is not resetPassword", async () => {
    const runtime = createRuntimeMock({
      verifyPasswordResetCode: vi.fn(),
    });
    setAuthRuntimeForTesting(runtime);
    const { wrapper } = await mountResetPasswordView(
      "/auth/reset-password?mode=outOfBand&oobCode=valid-code",
    );

    expect(runtime.verifyPasswordResetCode).not.toHaveBeenCalled();
    expect(wrapper.find('[data-testid="reset-password-invalid-panel"]').exists()).toBe(true);
    expect(toastMocks.errorToast).not.toHaveBeenCalled();
  });

  it("renders the invalid panel and shows the verify error toast when the action code is rejected", async () => {
    const runtime = createRuntimeMock({
      verifyPasswordResetCode: vi
        .fn()
        .mockRejectedValue(createFirebaseError("auth/expired-action-code")),
    });
    setAuthRuntimeForTesting(runtime);
    const { wrapper } = await mountResetPasswordView();

    expect(runtime.verifyPasswordResetCode).toHaveBeenCalledOnce();
    expect(wrapper.find('[data-testid="reset-password-invalid-panel"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="reset-password-submit"]').exists()).toBe(false);
    expect(toastMocks.errorToast).toHaveBeenCalledWith(
      "This password reset link is invalid, expired, or already used. Request a new one to continue.",
      expect.objectContaining({
        logContext: {
          action: "verify-password-reset-link",
          feature: "reset-password",
        },
      }),
    );
    expect(toastMocks.successToast).not.toHaveBeenCalled();
  });

  it("returns to the recovery request page from the invalid panel", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());
    const { router, wrapper } = await mountResetPasswordView(
      "/auth/reset-password?mode=resetPassword",
    );
    const routeReady = waitForRoute(
      router,
      () => router.currentRoute.value.name === routeNames.forgotPassword,
    );

    await wrapper
      .get('[data-testid="reset-password-back-to-forgot"]')
      .trigger("click");
    await routeReady;

    expect(router.currentRoute.value.name).toBe(routeNames.forgotPassword);
    expect(router.currentRoute.value.fullPath).toBe("/auth/forgot-password");
  });

  it("shows the verified email and password form for a valid action code", async () => {
    const runtime = createRuntimeMock({
      verifyPasswordResetCode: vi.fn().mockResolvedValue("admin@example.com"),
    });
    setAuthRuntimeForTesting(runtime);
    const { wrapper } = await mountResetPasswordView();

    expect(runtime.verifyPasswordResetCode).toHaveBeenCalledWith("valid-code");
    expect(wrapper.find('[data-testid="reset-password-password"]').exists()).toBe(true);
    expect(wrapper.get('[data-testid="reset-password-verified-email"]').text()).toContain(
      "admin@example.com",
    );
  });

  it("keeps weak-password validation inline without any toast or runtime confirm call", async () => {
    const runtime = createRuntimeMock({
      confirmPasswordReset: vi.fn(),
    });
    setAuthRuntimeForTesting(runtime);
    const { wrapper } = await mountResetPasswordView();

    await wrapper.get('[data-testid="reset-password-password"]').setValue("short");
    await wrapper.get('[data-testid="reset-password-confirm"]').setValue("short");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(runtime.confirmPasswordReset).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("Password must be at least 8 characters.");
    expect(toastMocks.errorToast).not.toHaveBeenCalled();
    expect(toastMocks.successToast).not.toHaveBeenCalled();
  });

  it("keeps mismatched-confirmation validation inline without any toast or runtime confirm call", async () => {
    const runtime = createRuntimeMock({
      confirmPasswordReset: vi.fn(),
    });
    setAuthRuntimeForTesting(runtime);
    const { wrapper } = await mountResetPasswordView();

    await wrapper.get('[data-testid="reset-password-password"]').setValue("password123");
    await wrapper.get('[data-testid="reset-password-confirm"]').setValue("password456");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(runtime.confirmPasswordReset).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("Passwords do not match.");
    expect(toastMocks.errorToast).not.toHaveBeenCalled();
    expect(toastMocks.successToast).not.toHaveBeenCalled();
  });

  it("shows the inline failure and confirm error toast when the runtime rejects the update", async () => {
    const submittedPassword = "br4nd-new-pass-777";
    const runtime = createRuntimeMock({
      confirmPasswordReset: vi
        .fn()
        .mockRejectedValue(createFirebaseError("auth/weak-password")),
    });
    setAuthRuntimeForTesting(runtime);
    const { router, wrapper } = await mountResetPasswordView();

    await wrapper.get('[data-testid="reset-password-password"]').setValue(submittedPassword);
    await wrapper.get('[data-testid="reset-password-confirm"]').setValue(submittedPassword);
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(runtime.confirmPasswordReset).toHaveBeenCalledOnce();
    expect(wrapper.get('[data-testid="reset-password-error"]').text()).toContain(
      "Choose a stronger password and try again.",
    );
    expect(toastMocks.errorToast).toHaveBeenCalledWith(
      expect.stringContaining("Choose a stronger password"),
      expect.objectContaining({
        logContext: { action: "confirm-password-reset", feature: "reset-password" },
      }),
    );
    expect(toastMocks.successToast).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
    // The form stays available for retry and the route stays on the reset page.
    expect(wrapper.find('[data-testid="reset-password-submit"]').exists()).toBe(true);
    expect(router.currentRoute.value.name).toBe(routeNames.resetPassword);
    expectNoToastArgContainsPassword(submittedPassword);
    expect(wrapper.text()).not.toContain(submittedPassword);
  });

  it("shows the success toast and redirects to admin login without leaking the password", async () => {
    const submittedPassword = "br4nd-new-pass-888";
    const runtime = createRuntimeMock({
      confirmPasswordReset: vi.fn().mockResolvedValue(undefined),
    });
    setAuthRuntimeForTesting(runtime);
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

    expect(runtime.confirmPasswordReset).toHaveBeenCalledWith(
      "valid-code",
      submittedPassword,
    );
    // The whole flow talks only to Firebase; no GiTiempo API is touched.
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(toastMocks.successToast).toHaveBeenCalledOnce();
    expect(toastMocks.successToast).toHaveBeenCalledWith(
      expect.stringContaining("Password updated"),
    );
    expect(router.currentRoute.value.name).toBe(routeNames.login);
    expect(router.currentRoute.value.fullPath).toBe("/login");
    expectNoToastArgContainsPassword(submittedPassword);
  });

  it("rejects an invalid action code on confirm with the shared neutral copy inline and as the error toast", async () => {
    const submittedPassword = "br4nd-new-pass-999";
    const runtime = createRuntimeMock({
      confirmPasswordReset: vi
        .fn()
        .mockRejectedValue(createFirebaseError("auth/invalid-action-code")),
    });
    setAuthRuntimeForTesting(runtime);
    const { wrapper } = await mountResetPasswordView();

    await wrapper.get('[data-testid="reset-password-password"]').setValue(submittedPassword);
    await wrapper.get('[data-testid="reset-password-confirm"]').setValue(submittedPassword);
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.get('[data-testid="reset-password-error"]').text()).toContain(
      "This password reset link is invalid, expired, or already used. Request a new one to continue.",
    );
    expect(toastMocks.errorToast).toHaveBeenCalledWith(
      "This password reset link is invalid, expired, or already used. Request a new one to continue.",
      expect.objectContaining({
        logContext: { action: "confirm-password-reset", feature: "reset-password" },
      }),
    );
    expect(toastMocks.successToast).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expectNoToastArgContainsPassword(submittedPassword);
  });

  it("keeps a client-side form error inline with the neutral copy and no toast or API call", async () => {
    const runtime = createRuntimeMock({
      confirmPasswordReset: vi.fn(),
    });
    setAuthRuntimeForTesting(runtime);
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
    expect(runtime.confirmPasswordReset).not.toHaveBeenCalled();
    expect(toastMocks.successToast).not.toHaveBeenCalled();
    expect(toastMocks.errorToast).not.toHaveBeenCalled();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});