// @vitest-environment jsdom

import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryHistory } from "vue-router";
import { createPinia, setActivePinia } from "pinia";
import PrimeVue from "primevue/config";
import ToastService from "primevue/toastservice";
import { giTiempoPrimeVueOptions } from "@gitiempo/web-config/theme";

import { createAppRouter, routeNames } from "@/router";

const firebaseAuth = {};
const confirmPasswordReset = vi.fn();
const verifyPasswordResetCode = vi.fn();

vi.mock("@/lib/firebase", () => ({
  getFirebaseAuth: () => firebaseAuth,
  hasFirebaseConfig: () => true,
}));

vi.mock("firebase/auth", () => ({
  confirmPasswordReset: (...args: unknown[]) => confirmPasswordReset(...args),
  verifyPasswordResetCode: (...args: unknown[]) => verifyPasswordResetCode(...args),
}));

function createFirebaseError(code: string, message = code): Error & { code: string } {
  return Object.assign(new Error(message), { code });
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

describe("InvitePasswordSetupView", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    confirmPasswordReset.mockReset();
    verifyPasswordResetCode.mockReset();
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = originalFetch;
  });

  it("renders the invalid state when the action code is missing", async () => {
    const continueUrl = encodeURIComponent(
      `${window.location.origin}/invites/accept?token=invite-token`,
    );
    const { wrapper } = await mountInvitePasswordSetupView(
      `/invites/password-setup?mode=resetPassword&continueUrl=${continueUrl}`,
    );

    expect(verifyPasswordResetCode).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("Password setup link expired");
    expect(wrapper.get('[data-testid="invite-password-setup-invalid"]').text()).toContain(
      "Back to invite",
    );
  });

  it("renders the invalid state for an invalid or expired action code", async () => {
    verifyPasswordResetCode.mockRejectedValueOnce(
      createFirebaseError("auth/expired-action-code"),
    );
    const { wrapper } = await mountInvitePasswordSetupView();

    expect(wrapper.text()).toContain("Password setup link expired");
    expect(wrapper.find('[data-testid="invite-password-setup-submit"]').exists()).toBe(false);
  });

  it("renders the verified email and password form for a valid action code", async () => {
    verifyPasswordResetCode.mockResolvedValueOnce("invited.user@example.com");
    const { wrapper } = await mountInvitePasswordSetupView();

    expect(verifyPasswordResetCode).toHaveBeenCalledWith(firebaseAuth, "valid-code");
    expect(wrapper.text()).toContain("Set your password");
    expect(wrapper.get('[data-testid="invite-password-setup-email"]').text()).toContain(
      "invited.user@example.com",
    );
  });

  it("keeps the form visible when the confirmation does not match", async () => {
    verifyPasswordResetCode.mockResolvedValueOnce("invited.user@example.com");
    const { wrapper } = await mountInvitePasswordSetupView();

    await wrapper.get('[data-testid="invite-password-setup-password"]').setValue(
      "password123",
    );
    await wrapper.get('[data-testid="invite-password-setup-confirm-password"]').setValue(
      "password456",
    );
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(confirmPasswordReset).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("Passwords do not match.");
  });

  it("shows weak-password guidance inline", async () => {
    verifyPasswordResetCode.mockResolvedValueOnce("invited.user@example.com");
    confirmPasswordReset.mockRejectedValueOnce(createFirebaseError("auth/weak-password"));
    const { wrapper } = await mountInvitePasswordSetupView();

    await wrapper.get('[data-testid="invite-password-setup-password"]').setValue(
      "password123",
    );
    await wrapper.get('[data-testid="invite-password-setup-confirm-password"]').setValue(
      "password123",
    );
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain("Choose a stronger password and try again.");
  });

  it("shows too-many-requests guidance inline", async () => {
    verifyPasswordResetCode.mockResolvedValueOnce("invited.user@example.com");
    confirmPasswordReset.mockRejectedValueOnce(
      createFirebaseError("auth/too-many-requests"),
    );
    const { wrapper } = await mountInvitePasswordSetupView();

    await wrapper.get('[data-testid="invite-password-setup-password"]').setValue(
      "password123",
    );
    await wrapper.get('[data-testid="invite-password-setup-confirm-password"]').setValue(
      "password123",
    );
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain(
      "Too many attempts. Wait a moment, then try again.",
    );
    expect(wrapper.find('[data-testid="invite-password-setup-submit"]').exists()).toBe(true);
  });

  it("shows network-failure guidance inline", async () => {
    verifyPasswordResetCode.mockResolvedValueOnce("invited.user@example.com");
    confirmPasswordReset.mockRejectedValueOnce(
      createFirebaseError("auth/network-request-failed"),
    );
    const { wrapper } = await mountInvitePasswordSetupView();

    await wrapper.get('[data-testid="invite-password-setup-password"]').setValue(
      "password123",
    );
    await wrapper.get('[data-testid="invite-password-setup-confirm-password"]').setValue(
      "password123",
    );
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain(
      "Network error. Check your connection and try again.",
    );
    expect(wrapper.find('[data-testid="invite-password-setup-submit"]').exists()).toBe(true);
  });

  it("shows expired-action-code guidance inline after submit", async () => {
    verifyPasswordResetCode.mockResolvedValueOnce("invited.user@example.com");
    confirmPasswordReset.mockRejectedValueOnce(
      createFirebaseError("auth/expired-action-code"),
    );
    const { wrapper } = await mountInvitePasswordSetupView();

    await wrapper.get('[data-testid="invite-password-setup-password"]').setValue(
      "password123",
    );
    await wrapper.get('[data-testid="invite-password-setup-confirm-password"]').setValue(
      "password123",
    );
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain(
      "This password setup link is invalid, expired, or already used. Go back to your invite and ask an admin for a fresh link if needed.",
    );
    expect(wrapper.find('[data-testid="invite-password-setup-submit"]').exists()).toBe(true);
  });

  it("preserves the invite token and returns to invite acceptance after success", async () => {
    verifyPasswordResetCode.mockResolvedValueOnce("invited.user@example.com");
    confirmPasswordReset.mockResolvedValueOnce(undefined);
    const { router, wrapper } = await mountInvitePasswordSetupView();

    await wrapper.get('[data-testid="invite-password-setup-password"]').setValue(
      "password123",
    );
    await wrapper.get('[data-testid="invite-password-setup-confirm-password"]').setValue(
      "password123",
    );
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(confirmPasswordReset).toHaveBeenCalledWith(
      firebaseAuth,
      "valid-code",
      "password123",
    );
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("Password saved");

    await wrapper.get('[data-testid="invite-password-setup-success"]').trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe(routeNames.inviteAccept);
    expect(router.currentRoute.value.fullPath).toBe(
      "/invites/accept?token=invite-token",
    );
  });

  it("falls back to login navigation when no invite return target exists", async () => {
    verifyPasswordResetCode.mockRejectedValueOnce(
      createFirebaseError("auth/invalid-action-code"),
    );
    const { router, wrapper } = await mountInvitePasswordSetupView(
      "/invites/password-setup?mode=resetPassword&oobCode=bad-code",
    );

    await wrapper.get('[data-testid="invite-password-setup-invalid"]').trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe(routeNames.login);
  });

  it("falls back to login navigation when the invite return target has no token", async () => {
    verifyPasswordResetCode.mockRejectedValueOnce(
      createFirebaseError("auth/invalid-action-code"),
    );
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
});
