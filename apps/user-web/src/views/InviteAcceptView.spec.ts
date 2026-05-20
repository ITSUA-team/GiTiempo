// @vitest-environment jsdom

import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryHistory } from "vue-router";
import { createPinia, setActivePinia } from "pinia";
import type { UserResponse } from "@gitiempo/shared";
import PrimeVue from "primevue/config";
import ToastService from "primevue/toastservice";
import { giTiempoPrimeVueOptions } from "@gitiempo/web-config/theme";

import { createAppRouter, routeNames } from "@/router";
import {
  resetAuthRuntimeForTesting,
  setAuthRuntimeForTesting,
  type AuthRuntime,
} from "@/services/auth-runtime";
import {
  resetWorkspaceInvitesClientForTesting,
  setWorkspaceInvitesClientForTesting,
  type WorkspaceInvitesClient,
} from "@/services/workspace-invites-client";
import { clearRefreshToken } from "@gitiempo/web-shared/session-storage";

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

  return {
    createAccountWithEmailPassword: async () => "firebase-created-account-token",
    getCurrentUser: async () => currentUser,
    loginWithFirebaseToken: async () => ({
      accessToken: "access-token",
      accessTokenExpiresIn: 900,
      refreshToken: "refresh-token-next",
    }),
    logoutSession: async () => undefined,
    refreshSession: async () => ({
      accessToken: "restored-access-token",
      accessTokenExpiresIn: 900,
      refreshToken: "restored-refresh-token",
    }),
    signInWithEmailPassword: async () => "firebase-email-token",
    signInWithGoogle: async () => "firebase-google-token",
    signOutIdentityProvider: async () => undefined,
    updateCurrentUser: async (_accessToken, input) => ({
      ...currentUser,
      ...input,
    }),
    ...overrides,
  };
}

function createWorkspaceInvitesClientMock(
  overrides?: Partial<WorkspaceInvitesClient>,
): WorkspaceInvitesClient {
  return {
    acceptInvite: async () => undefined,
    ...overrides,
  };
}

async function mountInviteAcceptView(
  initialPath = "/invites/accept?token=invite-token",
) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createAppRouter({
    history: createMemoryHistory(),
    pinia,
  });
  await router.push(initialPath);
  await router.isReady();
  const InviteAcceptView = (await import("./InviteAcceptView.vue")).default;

  return {
    router,
    wrapper: mount(InviteAcceptView, {
      global: {
        plugins: [
          pinia,
          router,
          [PrimeVue, giTiempoPrimeVueOptions],
          ToastService,
        ],
      },
    }),
  };
}

async function switchToSignInMode(wrapper: Awaited<ReturnType<typeof mountInviteAcceptView>>["wrapper"]) {
  await wrapper.get('[data-testid="invite-accept-mode-switch"]').trigger("click");
}

describe("InviteAcceptView", () => {
  beforeEach(() => {
    clearRefreshToken();
    resetAuthRuntimeForTesting();
    resetWorkspaceInvitesClientForTesting();
  });

  afterEach(() => {
    clearRefreshToken();
    resetAuthRuntimeForTesting();
    resetWorkspaceInvitesClientForTesting();
  });

  it("renders the invalid-link state when the token is missing", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());
    setWorkspaceInvitesClientForTesting(createWorkspaceInvitesClientMock());

    const { wrapper } = await mountInviteAcceptView("/invites/accept");

    expect(wrapper.text()).toContain("Invalid invite link");
    expect(wrapper.find('[data-testid="invite-accept-email"]').exists()).toBe(false);
  });

  it("renders create-account mode by default", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());
    setWorkspaceInvitesClientForTesting(createWorkspaceInvitesClientMock());

    const { wrapper } = await mountInviteAcceptView();

    expect(wrapper.text()).toContain("Create account");
    expect(wrapper.find('[data-testid="invite-accept-confirm-password"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="invite-accept-mode-switch"]').text()).toContain(
      "Already have an account? Sign in",
    );
  });

  it("creates the Firebase account, accepts the invite, and redirects to the dashboard", async () => {
    const createAccountWithEmailPassword = vi.fn(
      async () => "firebase-created-account-token",
    );
    const acceptInvite = vi.fn(async () => undefined);
    setAuthRuntimeForTesting(createRuntimeMock({ createAccountWithEmailPassword }));
    setWorkspaceInvitesClientForTesting(
      createWorkspaceInvitesClientMock({ acceptInvite }),
    );
    const { router, wrapper } = await mountInviteAcceptView();

    await wrapper.get('[data-testid="invite-accept-email"]').setValue(
      "alexey@example.com",
    );
    await wrapper.get('[data-testid="invite-accept-password"]').setValue(
      "password123",
    );
    await wrapper.get('[data-testid="invite-accept-confirm-password"]').setValue(
      "password123",
    );
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(createAccountWithEmailPassword).toHaveBeenCalledWith(
      "alexey@example.com",
      "password123",
    );
    expect(acceptInvite).toHaveBeenCalledWith({
      firebaseIdToken: "firebase-created-account-token",
      token: "invite-token",
    });
    expect(router.currentRoute.value.name).toBe(routeNames.dashboard);
  });

  it("switches to sign-in mode when the Firebase account already exists", async () => {
    setAuthRuntimeForTesting(
      createRuntimeMock({
        createAccountWithEmailPassword: async () => {
          throw createFirebaseError("auth/email-already-in-use");
        },
      }),
    );
    setWorkspaceInvitesClientForTesting(createWorkspaceInvitesClientMock());
    const { wrapper } = await mountInviteAcceptView();

    await wrapper.get('[data-testid="invite-accept-email"]').setValue(
      "alexey@example.com",
    );
    await wrapper.get('[data-testid="invite-accept-password"]').setValue(
      "password123",
    );
    await wrapper.get('[data-testid="invite-accept-confirm-password"]').setValue(
      "password123",
    );
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain(
      "An account already exists for this email. Sign in instead.",
    );
    expect(wrapper.find('[data-testid="invite-accept-confirm-password"]').exists()).toBe(false);
    expect(wrapper.text()).toContain("Accept invite");
  });

  it("shows weak-password validation before calling Firebase account creation", async () => {
    const createAccountWithEmailPassword = vi.fn(
      async () => "firebase-created-account-token",
    );
    setAuthRuntimeForTesting(createRuntimeMock({ createAccountWithEmailPassword }));
    setWorkspaceInvitesClientForTesting(createWorkspaceInvitesClientMock());
    const { wrapper } = await mountInviteAcceptView();

    await wrapper.get('[data-testid="invite-accept-email"]').setValue(
      "alexey@example.com",
    );
    await wrapper.get('[data-testid="invite-accept-password"]').setValue("short");
    await wrapper.get('[data-testid="invite-accept-confirm-password"]').setValue(
      "short",
    );
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(createAccountWithEmailPassword).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("Password must be at least 6 characters.");
  });

  it("accepts the invite in sign-in mode and redirects to the dashboard", async () => {
    const signInWithEmailPassword = vi.fn(async () => "firebase-email-token");
    const acceptInvite = vi.fn(async () => undefined);
    setAuthRuntimeForTesting(createRuntimeMock({ signInWithEmailPassword }));
    setWorkspaceInvitesClientForTesting(
      createWorkspaceInvitesClientMock({ acceptInvite }),
    );
    const { router, wrapper } = await mountInviteAcceptView();

    await switchToSignInMode(wrapper);
    await wrapper.get('[data-testid="invite-accept-email"]').setValue(
      "alexey@example.com",
    );
    await wrapper.get('[data-testid="invite-accept-password"]').setValue(
      "password123",
    );
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(signInWithEmailPassword).toHaveBeenCalledWith(
      "alexey@example.com",
      "password123",
    );
    expect(acceptInvite).toHaveBeenCalledWith({
      firebaseIdToken: "firebase-email-token",
      token: "invite-token",
    });
    expect(router.currentRoute.value.name).toBe(routeNames.dashboard);
  });

  it("keeps sign-in mode visible for invite email mismatch so the user can retry", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());
    setWorkspaceInvitesClientForTesting(
      createWorkspaceInvitesClientMock({
        acceptInvite: async () => {
          throw new Error("Invite email does not match identity");
        },
      }),
    );
    const { router, wrapper } = await mountInviteAcceptView();

    await switchToSignInMode(wrapper);
    await wrapper.get('[data-testid="invite-accept-email"]').setValue(
      "other@example.com",
    );
    await wrapper.get('[data-testid="invite-accept-password"]').setValue(
      "password123",
    );
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain("Invite email does not match identity");
    expect(wrapper.find('[data-testid="invite-accept-confirm-password"]').exists()).toBe(false);
    expect(router.currentRoute.value.fullPath).toBe(
      "/invites/accept?token=invite-token",
    );
  });

  it("shows invalid-link recovery when account creation succeeded but invite acceptance is terminal", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());
    setWorkspaceInvitesClientForTesting(
      createWorkspaceInvitesClientMock({
        acceptInvite: async () => {
          throw new Error("Invite has expired");
        },
      }),
    );
    const { router, wrapper } = await mountInviteAcceptView();

    await wrapper.get('[data-testid="invite-accept-email"]').setValue(
      "alexey@example.com",
    );
    await wrapper.get('[data-testid="invite-accept-password"]').setValue(
      "password123",
    );
    await wrapper.get('[data-testid="invite-accept-confirm-password"]').setValue(
      "password123",
    );
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain("Invalid invite link");
    expect(wrapper.text()).toContain(
      "Your account was created, but workspace access was not granted.",
    );
    expect(router.currentRoute.value.fullPath).toBe("/invites/accept");
  });

  it("keeps a recovery state when account creation succeeded but invite acceptance has a retryable failure", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());
    setWorkspaceInvitesClientForTesting(
      createWorkspaceInvitesClientMock({
        acceptInvite: async () => {
          throw new Error("Temporary outage");
        },
      }),
    );
    const { wrapper } = await mountInviteAcceptView();

    await wrapper.get('[data-testid="invite-accept-email"]').setValue(
      "alexey@example.com",
    );
    await wrapper.get('[data-testid="invite-accept-password"]').setValue(
      "password123",
    );
    await wrapper.get('[data-testid="invite-accept-confirm-password"]').setValue(
      "password123",
    );
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain(
      "Your account was created, but workspace access could not be granted yet. Temporary outage",
    );
    expect(wrapper.find('[data-testid="invite-accept-confirm-password"]').exists()).toBe(false);
    expect(wrapper.text()).toContain("Accept invite");
  });

  it("accepts the invite with Google and redirects to the dashboard", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());
    setWorkspaceInvitesClientForTesting(createWorkspaceInvitesClientMock());
    const { router, wrapper } = await mountInviteAcceptView();

    await wrapper.get('[data-testid="invite-accept-google"]').trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe(routeNames.dashboard);
  });

  it("shows the already-member state and clears the query token", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());
    setWorkspaceInvitesClientForTesting(
      createWorkspaceInvitesClientMock({
        acceptInvite: async () => {
          throw new Error("User is already a workspace member");
        },
      }),
    );
    const { router, wrapper } = await mountInviteAcceptView();

    await wrapper.get('[data-testid="invite-accept-email"]').setValue(
      "alexey@example.com",
    );
    await wrapper.get('[data-testid="invite-accept-password"]').setValue(
      "password123",
    );
    await wrapper.get('[data-testid="invite-accept-confirm-password"]').setValue(
      "password123",
    );
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain("Workspace access already exists");
    expect(wrapper.find('[data-testid="invite-accept-sign-in"]').exists()).toBe(true);
    expect(router.currentRoute.value.fullPath).toBe("/invites/accept");
  });
});
