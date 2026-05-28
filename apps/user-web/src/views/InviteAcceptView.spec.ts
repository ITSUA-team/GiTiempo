// @vitest-environment jsdom

import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryHistory, type Router } from "vue-router";
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
import { useAuthStore } from "@/stores/auth";
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

async function waitForRoute(
  router: Router,
  matches: () => boolean,
): Promise<void> {
  if (matches()) return;

  await new Promise<void>((resolve, reject) => {
    let stop: (() => void) | undefined;
    const timeout = setTimeout(() => {
      stop?.();
      reject(new Error("Timed out waiting for route navigation."));
    }, 1000);

    stop = router.afterEach(() => {
      if (!matches()) return;

      clearTimeout(timeout);
      stop?.();
      resolve();
    });
  });
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

describe("InviteAcceptView", () => {
  beforeEach(() => {
    clearRefreshToken();
    resetAuthRuntimeForTesting();
    resetWorkspaceInvitesClientForTesting();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  it("clears an empty token query and keeps the invalid-link state", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());
    setWorkspaceInvitesClientForTesting(createWorkspaceInvitesClientMock());

    const { router, wrapper } = await mountInviteAcceptView(
      "/invites/accept?token=%20%20%20",
    );
    await flushPromises();

    expect(wrapper.text()).toContain("Invalid invite link");
    expect(router.currentRoute.value.fullPath).toBe("/invites/accept");
  });

  it("renders the sign-in form by default", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());
    setWorkspaceInvitesClientForTesting(createWorkspaceInvitesClientMock());

    const { wrapper } = await mountInviteAcceptView();

    expect(wrapper.text()).toContain("Accept invite");
    expect(wrapper.find('[data-testid="invite-accept-confirm-password"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="invite-accept-mode-switch"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="invite-accept-submit"]').text()).toContain(
      "Accept invite",
    );
    expect(wrapper.text()).toContain(
      "Need a password setup link? Check your invite email or ask an admin to send a fresh invite.",
    );
  });

  it("accepts the invite after email/password sign-in and redirects to the dashboard", async () => {
    const signInWithEmailPassword = vi.fn(async () => "firebase-email-token");
    const acceptInvite = vi.fn(async () => undefined);
    setAuthRuntimeForTesting(
      createRuntimeMock({ signInWithEmailPassword }),
    );
    setWorkspaceInvitesClientForTesting(
      createWorkspaceInvitesClientMock({ acceptInvite }),
    );
    const { router, wrapper } = await mountInviteAcceptView();
    let acceptInviteCompleted = false;
    const authStore = useAuthStore();
    const originalLoginWithFirebaseToken = authStore.loginWithFirebaseToken.bind(authStore);
    const loginWithFirebaseToken = vi
      .spyOn(authStore, "loginWithFirebaseToken")
      .mockImplementation(async (firebaseIdToken: string) => {
        expect(acceptInviteCompleted).toBe(true);
        return originalLoginWithFirebaseToken(firebaseIdToken);
      });
    acceptInvite.mockImplementation(async () => {
      acceptInviteCompleted = true;
    });
    const routeReady = waitForRoute(
      router,
      () => router.currentRoute.value.name === routeNames.dashboard,
    );

    await wrapper.get('[data-testid="invite-accept-email"]').setValue(
      "alexey@example.com",
    );
    await wrapper.get('[data-testid="invite-accept-password"]').setValue(
      "password123",
    );
    await wrapper.get("form").trigger("submit");
    await routeReady;

    expect(signInWithEmailPassword).toHaveBeenCalledWith(
      "alexey@example.com",
      "password123",
    );
    expect(acceptInvite).toHaveBeenCalledWith({
      firebaseIdToken: "firebase-email-token",
      token: "invite-token",
    });
    expect(loginWithFirebaseToken).toHaveBeenCalledWith("firebase-email-token");
    expect(router.currentRoute.value.name).toBe(routeNames.dashboard);
  });

  it("accepts the invite with Google and redirects to the dashboard", async () => {
    const signInWithGoogle = vi.fn(async () => "firebase-google-token");
    const acceptInvite = vi.fn(async () => undefined);
    setAuthRuntimeForTesting(
      createRuntimeMock({ signInWithGoogle }),
    );
    setWorkspaceInvitesClientForTesting(
      createWorkspaceInvitesClientMock({ acceptInvite }),
    );
    const { router, wrapper } = await mountInviteAcceptView();
    let acceptInviteCompleted = false;
    const authStore = useAuthStore();
    const originalLoginWithFirebaseToken = authStore.loginWithFirebaseToken.bind(authStore);
    const loginWithFirebaseToken = vi
      .spyOn(authStore, "loginWithFirebaseToken")
      .mockImplementation(async (firebaseIdToken: string) => {
        expect(acceptInviteCompleted).toBe(true);
        return originalLoginWithFirebaseToken(firebaseIdToken);
      });
    acceptInvite.mockImplementation(async () => {
      acceptInviteCompleted = true;
    });
    const routeReady = waitForRoute(
      router,
      () => router.currentRoute.value.name === routeNames.dashboard,
    );

    await wrapper.get('[data-testid="invite-accept-google"]').trigger("click");
    await routeReady;

    expect(signInWithGoogle).toHaveBeenCalled();
    expect(acceptInvite).toHaveBeenCalledWith({
      firebaseIdToken: "firebase-google-token",
      token: "invite-token",
    });
    expect(loginWithFirebaseToken).toHaveBeenCalledWith("firebase-google-token");
    expect(router.currentRoute.value.name).toBe(routeNames.dashboard);
  });

  it("shows invalid credentials guidance inline", async () => {
    setAuthRuntimeForTesting(
      createRuntimeMock({
        signInWithEmailPassword: async () => {
          throw createFirebaseError("auth/invalid-credential");
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
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain(
      "Could not sign in with that email and password.",
    );
  });

  it("shows password setup guidance when Firebase has no password sign-in yet", async () => {
    setAuthRuntimeForTesting(
      createRuntimeMock({
        signInWithEmailPassword: async () => {
          throw createFirebaseError("auth/user-not-found");
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
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain(
      "No Firebase password is set for this invited email yet.",
    );
  });

  it("shows disabled-account guidance inline", async () => {
    setAuthRuntimeForTesting(
      createRuntimeMock({
        signInWithEmailPassword: async () => {
          throw createFirebaseError("auth/user-disabled");
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
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain(
      "This Firebase account is disabled. Ask an admin for help.",
    );
  });

  it("shows too-many-requests guidance inline", async () => {
    setAuthRuntimeForTesting(
      createRuntimeMock({
        signInWithEmailPassword: async () => {
          throw createFirebaseError("auth/too-many-requests");
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
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain(
      "Too many attempts. Wait a moment, then try again.",
    );
  });

  it("shows Google popup cancellation inline", async () => {
    setAuthRuntimeForTesting(
      createRuntimeMock({
        signInWithGoogle: async () => {
          throw createFirebaseError("auth/popup-closed-by-user");
        },
      }),
    );
    setWorkspaceInvitesClientForTesting(createWorkspaceInvitesClientMock());
    const { wrapper } = await mountInviteAcceptView();

    await wrapper.get('[data-testid="invite-accept-google"]').trigger("click");
    await flushPromises();

    expect(wrapper.text()).toContain(
      "Google sign-in was cancelled. Try again when you are ready.",
    );
  });

  it("keeps the form visible for invite email mismatch so the user can retry", async () => {
    const signOutIdentityProvider = vi.fn(async () => undefined);
    setAuthRuntimeForTesting(createRuntimeMock({ signOutIdentityProvider }));
    setWorkspaceInvitesClientForTesting(
      createWorkspaceInvitesClientMock({
        acceptInvite: async () => {
          throw new Error("Invite email does not match identity");
        },
      }),
    );
    const { router, wrapper } = await mountInviteAcceptView();

    await wrapper.get('[data-testid="invite-accept-email"]').setValue(
      "other@example.com",
    );
    await wrapper.get('[data-testid="invite-accept-password"]').setValue(
      "password123",
    );
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain(
      "Invite email does not match identity. Sign out and retry with the invited email account.",
    );
    expect(signOutIdentityProvider).toHaveBeenCalled();
    expect(router.currentRoute.value.fullPath).toBe(
      "/invites/accept?token=invite-token",
    );
  });

  it("shows invalid-link recovery for terminal invite failures and clears the token", async () => {
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
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain("Invalid invite link");
    expect(wrapper.text()).toContain("Invite has expired");
    expect(router.currentRoute.value.fullPath).toBe("/invites/accept");
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
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain("Workspace access already exists");
    expect(wrapper.text()).toContain("Your account already has workspace access.");
    expect(wrapper.find('[data-testid="invite-accept-sign-in"]').exists()).toBe(true);
    expect(router.currentRoute.value.fullPath).toBe("/invites/accept");
  });

  it("keeps a recovery state when Firebase sign-in succeeded but invite acceptance failed", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());
    setWorkspaceInvitesClientForTesting(
      createWorkspaceInvitesClientMock({
        acceptInvite: async () => {
          throw new Error("Temporary outage");
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
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain(
      "Firebase sign-in succeeded, but workspace access was not created yet. Temporary outage",
    );
    expect(router.currentRoute.value.fullPath).toBe(
      "/invites/accept?token=invite-token",
    );
  });

  it("shows a recovery state when workspace access was created but app sign-in failed", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());
    setWorkspaceInvitesClientForTesting(createWorkspaceInvitesClientMock());
    const { router, wrapper } = await mountInviteAcceptView();
    const loginWithFirebaseToken = vi
      .spyOn(useAuthStore(), "loginWithFirebaseToken")
      .mockRejectedValueOnce(new Error("Session exchange failed"));

    await wrapper.get('[data-testid="invite-accept-email"]').setValue(
      "alexey@example.com",
    );
    await wrapper.get('[data-testid="invite-accept-password"]').setValue(
      "password123",
    );
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(loginWithFirebaseToken).toHaveBeenCalledWith("firebase-email-token");
    expect(wrapper.text()).toContain("Invite accepted");
    expect(wrapper.text()).toContain(
      "Workspace access was created, but app sign-in did not complete. Sign in again to continue.",
    );
    expect(wrapper.text()).not.toContain("Workspace access already exists");
    expect(wrapper.find('[data-testid="invite-accept-sign-in-again"]').exists()).toBe(true);
    expect(router.currentRoute.value.fullPath).toBe("/invites/accept");
  });
});
