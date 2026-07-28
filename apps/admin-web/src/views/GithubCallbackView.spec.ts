import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryHistory } from "vue-router";
import { createPinia, setActivePinia } from "pinia";
import type {
  CurrentUserWorkspaceMembershipListResponse,
  UserResponse,
} from "@gitiempo/shared";
import PrimeVue from "primevue/config";
import { giTiempoPrimeVueOptions } from "@gitiempo/web-config/theme";

import { clearRefreshToken } from "@gitiempo/web-shared/session-storage";
import { waitForRoute } from "@gitiempo/web-shared/testing";
import { createAppRouter, routeNames } from "@/router";
import {
  resetAuthRuntimeForTesting,
  setAuthRuntimeForTesting,
  type AuthRuntime,
} from "@/services/auth-runtime";

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
  const pair = {
    accessToken: "github-access-token",
    accessTokenExpiresIn: 900,
    refreshToken: "github-refresh-token",
  };

  return {
    getCurrentUser: async () => currentUser,
    listCurrentUserWorkspaces: async () => workspaceMemberships,
    loginWithFirebaseToken: async () => pair,
    logoutSession: async () => undefined,
    registerWorkspaceOwner: async () => pair,
    refreshSession: async () => pair,
    switchWorkspace: async () => pair,
    signInWithEmailPassword: async () => "firebase-email-token",
    signInWithGoogle: async () => "firebase-google-token",
    exchangeGithubSession: async () => pair,
    signOutIdentityProvider: async () => undefined,
    updateCurrentUser: async (_accessToken, input) => ({
      ...currentUser,
      ...input,
    }),
    ...overrides,
  };
}

async function mountCallbackView(initialPath: string) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createAppRouter({
    history: createMemoryHistory(),
    pinia,
  });
  await router.push(initialPath);
  await router.isReady();
  const GithubCallbackView = (await import("./GithubCallbackView.vue")).default;

  return {
    router,
    wrapper: mount(GithubCallbackView, {
      global: {
        plugins: [pinia, router, [PrimeVue, giTiempoPrimeVueOptions]],
      },
    }),
  };
}

describe("GithubCallbackView (admin)", () => {
  beforeEach(() => {
    clearRefreshToken();
    resetAuthRuntimeForTesting();
  });

  it("exchanges the handoff code and redirects to the dashboard", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());
    const { router, wrapper } = await mountCallbackView(
      "/auth/github/callback?code=handoff-code",
    );
    await waitForRoute(
      router,
      () => router.currentRoute.value.name === routeNames.dashboard,
    );

    expect(router.currentRoute.value.name).toBe(routeNames.dashboard);
    wrapper.unmount();
  });

  it("returns the user to a preserved redirect target after sign-in", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());
    const { router, wrapper } = await mountCallbackView(
      "/auth/github/callback?code=handoff-code&redirect=%2Freports",
    );
    await waitForRoute(
      router,
      () => router.currentRoute.value.fullPath === "/reports",
    );

    expect(router.currentRoute.value.fullPath).toBe("/reports");
    wrapper.unmount();
  });

  it("falls back to the dashboard when the preserved redirect is unsafe", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());
    const { router, wrapper } = await mountCallbackView(
      "/auth/github/callback?code=handoff-code&redirect=%2F%2Fevil.example%2Fescape",
    );
    await waitForRoute(
      router,
      () => router.currentRoute.value.name === routeNames.dashboard,
    );

    expect(router.currentRoute.value.name).toBe(routeNames.dashboard);
    wrapper.unmount();
  });

  it("funnels a callback githubError to the login page as a code", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());
    const { router } = await mountCallbackView(
      "/auth/github/callback?githubError=state",
    );
    await flushPromises();

    expect(router.currentRoute.value.name).toBe(routeNames.login);
    expect(router.currentRoute.value.query.githubError).toBe("state");
  });

  it("funnels a failed session exchange to the login page", async () => {
    setAuthRuntimeForTesting(
      createRuntimeMock({
        exchangeGithubSession: async () => {
          throw new Error("boom");
        },
      }),
    );
    const { router } = await mountCallbackView(
      "/auth/github/callback?code=bad-code",
    );
    await flushPromises();

    expect(router.currentRoute.value.name).toBe(routeNames.login);
    expect(router.currentRoute.value.query.githubError).toBe("failed");
  });
});
