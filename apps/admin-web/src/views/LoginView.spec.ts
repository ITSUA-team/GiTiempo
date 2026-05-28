import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import PrimeVue from "primevue/config";
import { createMemoryHistory, type Router } from "vue-router";
import type { UserResponse } from "@gitiempo/shared";
import { giTiempoPrimeVueOptions } from "@gitiempo/web-config/theme";

import { clearRefreshToken } from "@gitiempo/web-shared/session-storage";
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

async function mountLoginView(initialPath = "/login") {
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createAppRouter({
    history: createMemoryHistory(),
    pinia,
  });
  await router.push(initialPath);
  await router.isReady();
  const LoginView = (await import("./LoginView.vue")).default;

  return {
    router,
    wrapper: mount(LoginView, {
      global: {
        plugins: [pinia, router, [PrimeVue, giTiempoPrimeVueOptions]],
      },
    }),
  };
}

describe("LoginView", () => {
  beforeEach(() => {
    clearRefreshToken();
    resetAuthRuntimeForTesting();
    vi.stubEnv("VITE_USER_APP_URL", "https://user.example.test/login");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("signs in with email/password through the UI and redirects to the requested route", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());
    const { router, wrapper } = await mountLoginView(
      "/login?redirect=%2Freports",
    );
    const routeReady = waitForRoute(
      router,
      () => router.currentRoute.value.fullPath === "/reports",
    );

    await wrapper.get('[data-testid="sign-in-email"]').setValue("admin@example.com");
    await wrapper.get('[data-testid="sign-in-password"]').setValue("password123");
    await wrapper.get("form").trigger("submit");
    await routeReady;

    expect(router.currentRoute.value.fullPath).toBe("/reports");
  });

  it("signs in with Google through the UI and redirects to the dashboard", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());
    const { router, wrapper } = await mountLoginView();
    const routeReady = waitForRoute(
      router,
      () => router.currentRoute.value.name === routeNames.dashboard,
    );

    await wrapper.get('[data-testid="sign-in-google"]').trigger("click");
    await routeReady;

    expect(router.currentRoute.value.name).toBe(routeNames.dashboard);
  });

  it("shows sign-in errors without navigating away from login", async () => {
    setAuthRuntimeForTesting(
      createRuntimeMock({
        signInWithEmailPassword: async () => {
          throw new Error("Invalid admin credentials");
        },
      }),
    );
    const { router, wrapper } = await mountLoginView();

    await wrapper.get('[data-testid="sign-in-email"]').setValue("admin@example.com");
    await wrapper.get('[data-testid="sign-in-password"]').setValue("bad-password");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain("Invalid admin credentials");
    expect(router.currentRoute.value.name).toBe(routeNames.login);
  });

  it("preserves the visible user workspace link", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());
    const { wrapper } = await mountLoginView();

    const workspaceLink = wrapper.get("a");

    expect(workspaceLink.text()).toContain("Open the user workspace");
    expect(workspaceLink.attributes("href")).toBe(
      "https://user.example.test/login",
    );
  });
});
