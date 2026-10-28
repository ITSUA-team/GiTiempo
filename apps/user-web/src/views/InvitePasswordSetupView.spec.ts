import { flushPromises, mount } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
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
const invitedEmail = "invited.user@example.com";

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
    exchangeGithubSession: async () => ({
      accessToken: "github-access-token",
      accessTokenExpiresIn: 900,
      refreshToken: "github-refresh-token",
    }),
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
  const continueUrl = encodeURIComponent(
    `${window.location.origin}/invites/accept?token=invite-token`,
  );

  return `/invites/password-setup?mode=resetPassword&oobCode=valid-code&continueUrl=${continueUrl}`;
}

async function mountInvitePasswordSetupView(initialPath = createDefaultPath()) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createAppRouter({
    history: createMemoryHistory(),
    pinia,
  });
  await router.push(initialPath);
  await router.isReady();
  const InvitePasswordSetupView = (await import("./InvitePasswordSetupView.vue")).default;

  const wrapper = mount(InvitePasswordSetupView, {
    global: {
      plugins: [pinia, router, [PrimeVue, giTiempoPrimeVueOptions], ToastService],
    },
  });

  await flushPromises();

  return { router, wrapper };
}

async function submitPasswordForm(
  wrapper: VueWrapper,
  password = submittedPassword,
): Promise<void> {
  await wrapper.get('[data-testid="invite-password-setup-password"]').setValue(password);
  await wrapper
    .get('[data-testid="invite-password-setup-confirm-password"]')
    .setValue(password);
  await wrapper.get("form").trigger("submit");
  await flushPromises();
}

describe("InvitePasswordSetupView", () => {
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

  it("renders the invalid state without a verify call when the action code is missing", async () => {
    const verifyPasswordResetCode = vi.fn();
    const confirmPasswordReset = vi.fn();
    setAuthRuntimeForTesting(
      createRuntimeMock({ verifyPasswordResetCode, confirmPasswordReset }),
    );
    const continueUrl = encodeURIComponent(
      `${window.location.origin}/invites/accept?token=invite-token`,
    );
    const { wrapper } = await mountInvitePasswordSetupView(
      `/invites/password-setup?mode=resetPassword&continueUrl=${continueUrl}`,
    );

    expect(verifyPasswordResetCode).not.toHaveBeenCalled();
    expect(confirmPasswordReset).not.toHaveBeenCalled();
    expect(toastAdd).not.toHaveBeenCalled();
    expect(wrapper.text()).not.toContain("Checking password setup link...");
    expect(wrapper.get('[data-testid="invite-password-setup-invalid"]').text()).toContain(
      "Back to invite",
    );
  });

  it("renders the invalid state with an error toast for an expired action code", async () => {
    const verifyPasswordResetCode =
      vi.fn<() => Promise<string>>().mockRejectedValueOnce(
        createFirebaseError("auth/expired-action-code"),
      );
    const confirmPasswordReset = vi.fn();
    setAuthRuntimeForTesting(
      createRuntimeMock({ verifyPasswordResetCode, confirmPasswordReset }),
    );
    const { wrapper } = await mountInvitePasswordSetupView();

    expect(verifyPasswordResetCode).toHaveBeenCalledWith("valid-code");
    expect(confirmPasswordReset).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("Password setup link expired");
    expect(wrapper.find('[data-testid="invite-password-setup-submit"]').exists()).toBe(false);
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: "This password setup link is invalid, expired, or already used.",
        severity: "error",
        summary: "Password setup link is not usable",
      }),
    );
    expect(console.error).toHaveBeenCalledWith("Password setup link is not usable", {
      context: { action: "verify-password-setup-link", feature: "invite-password-setup" },
      error: expect.any(Error),
    });
  });

  it("renders the verified email and password form for a valid action code", async () => {
    const verifyPasswordResetCode = vi.fn();
    verifyPasswordResetCode.mockResolvedValue(invitedEmail);
    const confirmPasswordReset = vi.fn();
    setAuthRuntimeForTesting(
      createRuntimeMock({ verifyPasswordResetCode, confirmPasswordReset }),
    );
    const { wrapper } = await mountInvitePasswordSetupView();

    expect(verifyPasswordResetCode).toHaveBeenCalledWith("valid-code");
    expect(wrapper.get('[data-testid="invite-password-setup-email"]').text()).toContain(
      invitedEmail,
    );
    expect(wrapper.find('[data-testid="invite-password-setup-submit"]').exists()).toBe(true);
    expect(
      wrapper.find('[data-testid="invite-password-setup-invalid"]').exists(),
    ).toBe(false);
  });

  it("keeps the form visible when the confirmation does not match", async () => {
    const verifyPasswordResetCode = vi.fn();
    verifyPasswordResetCode.mockResolvedValue(invitedEmail);
    const confirmPasswordReset = vi.fn();
    setAuthRuntimeForTesting(
      createRuntimeMock({ verifyPasswordResetCode, confirmPasswordReset }),
    );
    const { wrapper } = await mountInvitePasswordSetupView();

    await wrapper.get('[data-testid="invite-password-setup-password"]').setValue(
      submittedPassword,
    );
    await wrapper.get('[data-testid="invite-password-setup-confirm-password"]').setValue(
      "differentPassword456",
    );
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(confirmPasswordReset).not.toHaveBeenCalled();
    expect(toastAdd).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("Passwords do not match.");
    expect(wrapper.find('[data-testid="invite-password-setup-submit"]').exists()).toBe(true);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("shows weak-password guidance inline and as an error toast without leaking the password", async () => {
    const verifyPasswordResetCode = vi.fn();
    verifyPasswordResetCode.mockResolvedValue(invitedEmail);
    const confirmPasswordReset =
      vi.fn<() => Promise<void>>().mockRejectedValueOnce(
        createFirebaseError("auth/weak-password"),
      );
    setAuthRuntimeForTesting(
      createRuntimeMock({ verifyPasswordResetCode, confirmPasswordReset }),
    );
    const { wrapper } = await mountInvitePasswordSetupView();

    await submitPasswordForm(wrapper);

    expect(confirmPasswordReset).toHaveBeenCalledWith("valid-code", submittedPassword);
    expect(wrapper.get('[data-testid="invite-password-setup-error"]').text()).toContain(
      "Choose a stronger password and try again.",
    );
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: "Choose a stronger password and try again.",
        severity: "error",
        summary: "Could not save password",
      }),
    );
    expect(console.error).toHaveBeenCalledWith("Could not save password", {
      context: { action: "confirm-password-reset", feature: "invite-password-setup" },
      error: expect.any(Error),
    });
    expect(wrapper.find('[data-testid="invite-password-setup-submit"]').exists()).toBe(true);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(wrapper.text()).not.toContain(submittedPassword);
    expect(JSON.stringify(toastAdd.mock.calls)).not.toContain(submittedPassword);
    expect(JSON.stringify(consoleErrorSpy.mock.calls)).not.toContain(submittedPassword);
  });

  it("shows too-many-requests guidance inline", async () => {
    const verifyPasswordResetCode = vi.fn();
    verifyPasswordResetCode.mockResolvedValue(invitedEmail);
    const confirmPasswordReset =
      vi.fn<() => Promise<void>>().mockRejectedValueOnce(
        createFirebaseError("auth/too-many-requests"),
      );
    setAuthRuntimeForTesting(
      createRuntimeMock({ verifyPasswordResetCode, confirmPasswordReset }),
    );
    const { wrapper } = await mountInvitePasswordSetupView();

    await submitPasswordForm(wrapper);

    expect(wrapper.get('[data-testid="invite-password-setup-error"]').text()).toContain(
      "Too many attempts. Wait a moment, then try again.",
    );
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: "Too many attempts. Wait a moment, then try again.",
        severity: "error",
        summary: "Could not save password",
      }),
    );
    expect(wrapper.find('[data-testid="invite-password-setup-submit"]').exists()).toBe(true);
  });

  it("shows network-failure guidance inline", async () => {
    const verifyPasswordResetCode = vi.fn();
    verifyPasswordResetCode.mockResolvedValue(invitedEmail);
    const confirmPasswordReset =
      vi.fn<() => Promise<void>>().mockRejectedValueOnce(
        createFirebaseError("auth/network-request-failed"),
      );
    setAuthRuntimeForTesting(
      createRuntimeMock({ verifyPasswordResetCode, confirmPasswordReset }),
    );
    const { wrapper } = await mountInvitePasswordSetupView();

    await submitPasswordForm(wrapper);

    expect(wrapper.get('[data-testid="invite-password-setup-error"]').text()).toContain(
      "Network error. Check your connection and try again.",
    );
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: "Network error. Check your connection and try again.",
        severity: "error",
        summary: "Could not save password",
      }),
    );
    expect(wrapper.find('[data-testid="invite-password-setup-submit"]').exists()).toBe(true);
  });

  it("shows expired-action-code guidance inline after submit", async () => {
    const verifyPasswordResetCode = vi.fn();
    verifyPasswordResetCode.mockResolvedValue(invitedEmail);
    const confirmPasswordReset =
      vi.fn<() => Promise<void>>().mockRejectedValueOnce(
        createFirebaseError("auth/expired-action-code"),
      );
    setAuthRuntimeForTesting(
      createRuntimeMock({ verifyPasswordResetCode, confirmPasswordReset }),
    );
    const { wrapper } = await mountInvitePasswordSetupView();

    await submitPasswordForm(wrapper);

    expect(wrapper.get('[data-testid="invite-password-setup-error"]').text()).toContain(
      "This password setup link is invalid, expired, or already used. Go back to your invite and ask an admin for a fresh link if needed.",
    );
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: "This password setup link is invalid, expired, or already used. Go back to your invite and ask an admin for a fresh link if needed.",
        severity: "error",
        summary: "Could not save password",
      }),
    );
    expect(wrapper.find('[data-testid="invite-password-setup-submit"]').exists()).toBe(true);
  });

  it("preserves the invite token and returns to invite acceptance after success", async () => {
    const verifyPasswordResetCode = vi.fn();
    verifyPasswordResetCode.mockResolvedValue(invitedEmail);
    const confirmPasswordReset = vi.fn(async () => undefined);
    setAuthRuntimeForTesting(
      createRuntimeMock({ verifyPasswordResetCode, confirmPasswordReset }),
    );
    const { router, wrapper } = await mountInvitePasswordSetupView();

    await submitPasswordForm(wrapper);

    expect(confirmPasswordReset).toHaveBeenCalledWith("valid-code", submittedPassword);
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("Password saved");
    expect(toastAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: "Return to your invite to sign in and accept access.",
        severity: "success",
        summary: "Password saved",
      }),
    );
    expect(wrapper.text()).not.toContain(submittedPassword);
    expect(JSON.stringify(toastAdd.mock.calls)).not.toContain(submittedPassword);
    expect(JSON.stringify(consoleErrorSpy.mock.calls)).not.toContain(submittedPassword);

    const routeReady = waitForRoute(
      router,
      () => router.currentRoute.value.name === routeNames.inviteAccept,
    );
    await wrapper.get('[data-testid="invite-password-setup-success"]').trigger("click");
    await routeReady;
    await flushPromises();

    expect(router.currentRoute.value.name).toBe(routeNames.inviteAccept);
    expect(router.currentRoute.value.fullPath).toBe(
      "/invites/accept?token=invite-token",
    );
  });

  it("falls back to login navigation when no invite return target exists", async () => {
    const verifyPasswordResetCode =
      vi.fn<() => Promise<string>>().mockRejectedValueOnce(
        createFirebaseError("auth/invalid-action-code"),
      );
    setAuthRuntimeForTesting(createRuntimeMock({ verifyPasswordResetCode }));
    const { router, wrapper } = await mountInvitePasswordSetupView(
      "/invites/password-setup?mode=resetPassword&oobCode=bad-code",
    );

    await wrapper.get('[data-testid="invite-password-setup-invalid"]').trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe(routeNames.login);
  });

  it("falls back to login navigation when the invite return target has no token", async () => {
    const verifyPasswordResetCode =
      vi.fn<() => Promise<string>>().mockRejectedValueOnce(
        createFirebaseError("auth/invalid-action-code"),
      );
    setAuthRuntimeForTesting(createRuntimeMock({ verifyPasswordResetCode }));
    const continueUrl = encodeURIComponent(`${window.location.origin}/invites/accept`);
    const { router, wrapper } = await mountInvitePasswordSetupView(
      `/invites/password-setup?mode=resetPassword&oobCode=bad-code&continueUrl=${continueUrl}`,
    );

    expect(wrapper.get('[data-testid="invite-password-setup-invalid"]').text()).toContain(
      "Go to login",
    );

    await wrapper.get('[data-testid="invite-password-setup-invalid"]').trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe(routeNames.login);
  });

  it("falls back to login navigation for hostile external continueUrl targets", async () => {
    const verifyPasswordResetCode =
      vi.fn<() => Promise<string>>().mockRejectedValueOnce(
        createFirebaseError("auth/invalid-action-code"),
      );
    setAuthRuntimeForTesting(createRuntimeMock({ verifyPasswordResetCode }));
    const continueUrl = encodeURIComponent(
      "https://evil.example/invites/accept?token=invite-token",
    );
    const { router, wrapper } = await mountInvitePasswordSetupView(
      `/invites/password-setup?mode=resetPassword&oobCode=bad-code&continueUrl=${continueUrl}`,
    );

    expect(wrapper.get('[data-testid="invite-password-setup-invalid"]').text()).toContain(
      "Go to login",
    );

    await wrapper.get('[data-testid="invite-password-setup-invalid"]').trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe(routeNames.login);
  });

  it("falls back to login navigation for hostile external continueUrl targets after success", async () => {
    const verifyPasswordResetCode = vi.fn();
    verifyPasswordResetCode.mockResolvedValue(invitedEmail);
    const confirmPasswordReset = vi.fn(async () => undefined);
    setAuthRuntimeForTesting(
      createRuntimeMock({ verifyPasswordResetCode, confirmPasswordReset }),
    );
    const continueUrl = encodeURIComponent(
      "https://evil.example/invites/accept?token=invite-token",
    );
    const { router, wrapper } = await mountInvitePasswordSetupView(
      `/invites/password-setup?mode=resetPassword&oobCode=valid-code&continueUrl=${continueUrl}`,
    );

    await submitPasswordForm(wrapper);

    expect(wrapper.text()).toContain("Password saved");

    await wrapper.get('[data-testid="invite-password-setup-success"]').trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe(routeNames.login);
    expect(router.currentRoute.value.fullPath).not.toContain("evil.example");
  });
});