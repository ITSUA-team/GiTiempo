// @vitest-environment jsdom

import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryHistory } from "vue-router";
import { createPinia, setActivePinia } from "pinia";
import PrimeVue from "primevue/config";
import ToastService from "primevue/toastservice";
import type { UserResponse } from "@gitiempo/shared";
import { giTiempoPrimeVueOptions } from "@gitiempo/web-config/theme";

import { createAppRouter, routeNames } from "@/router";
import { clearRefreshToken } from "@gitiempo/web-shared/session-storage";
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

  it("accepts the invite with email/password and redirects to the dashboard", async () => {
    const acceptInvite = vi.fn(async () => undefined);
    setAuthRuntimeForTesting(createRuntimeMock());
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
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(acceptInvite).toHaveBeenCalledWith({
      firebaseIdToken: "firebase-email-token",
      token: "invite-token",
    });
    expect(router.currentRoute.value.name).toBe(routeNames.dashboard);
  });

  it("accepts the invite with Google and redirects to the dashboard", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());
    setWorkspaceInvitesClientForTesting(createWorkspaceInvitesClientMock());
    const { router, wrapper } = await mountInviteAcceptView();

    await wrapper.get('[data-testid="invite-accept-google"]').trigger("click");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe(routeNames.dashboard);
  });

  it("keeps the form visible for invite email mismatch so the user can retry", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());
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

    expect(wrapper.text()).toContain("Invite email does not match identity");
    expect(wrapper.find('[data-testid="invite-accept-email"]').exists()).toBe(true);
    expect(router.currentRoute.value.fullPath).toBe(
      "/invites/accept?token=invite-token",
    );
  });

  it("handles terminal invalid invite failures and clears the query token", async () => {
    for (const message of [
      "Invite not found",
      "Invite has expired",
      "Invite cannot be accepted",
    ]) {
      setAuthRuntimeForTesting(createRuntimeMock());
      setWorkspaceInvitesClientForTesting(
        createWorkspaceInvitesClientMock({
          acceptInvite: async () => {
            throw new Error(message);
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
      expect(wrapper.text()).toContain(message);
      expect(router.currentRoute.value.fullPath).toBe("/invites/accept");

      wrapper.unmount();
      resetAuthRuntimeForTesting();
      resetWorkspaceInvitesClientForTesting();
    }
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
    expect(wrapper.find('[data-testid="invite-accept-sign-in"]').exists()).toBe(true);
    expect(router.currentRoute.value.fullPath).toBe("/invites/accept");
  });
});
