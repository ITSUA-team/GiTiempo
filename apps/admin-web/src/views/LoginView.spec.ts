import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import PrimeVue from "primevue/config";
import { createMemoryHistory } from "vue-router";
import type { CurrentUserWorkspaceMembershipListResponse, UserResponse } from "@gitiempo/shared";
import { giTiempoPrimeVueOptions } from "@gitiempo/web-config/theme";

import { clearRefreshToken } from "@gitiempo/web-shared/session-storage";
import { waitForRoute } from "@gitiempo/web-shared/testing";
import { createAppRouter, routeNames } from "@/router";
import {
  resetAuthRuntimeForTesting,
  setAuthRuntimeForTesting,
  type AuthRuntime,
} from "@/services/auth-runtime";
import LoginView from "./LoginView.vue";

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
    updateCurrentUser: async (_accessToken, input) => ({
      ...currentUser,
      ...input,
    }),
    ...overrides,
  };
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
    // The GitHub button is off by default; opt in so the button renders here.
    vi.stubEnv("VITE_GITHUB_SIGNIN_ENABLED", "true");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("signs in with email/password through the UI and redirects to the requested route", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());
    const { router, wrapper } = await mountLoginView(
      "/login?redirect=%2Freports",
    );

    await wrapper.get('[data-testid="sign-in-email"]').setValue("admin@example.com");
    await wrapper.get('[data-testid="sign-in-password"]').setValue("password123");
    const routeReady = waitForRoute(
      router,
      () => router.currentRoute.value.fullPath === "/reports",
    );
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

  it("redirects to the backend GitHub sign-in flow when GitHub is clicked", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());
    const { wrapper } = await mountLoginView();

    let redirectedTo = "";
    const original = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        origin: "http://localhost:5174",
        get href() {
          return redirectedTo;
        },
        set href(value: string) {
          redirectedTo = value;
        },
      },
    });

    await wrapper.get('[data-testid="sign-in-github"]').trigger("click");

    Object.defineProperty(window, "location", {
      configurable: true,
      value: original,
    });

    expect(redirectedTo).toContain("/auth/github/start?app=admin");
  });

  it("carries the protected-route redirect target into the GitHub start URL", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());
    const { wrapper } = await mountLoginView("/login?redirect=%2Freports");

    let redirectedTo = "";
    const original = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        origin: "http://localhost:5174",
        get href() {
          return redirectedTo;
        },
        set href(value: string) {
          redirectedTo = value;
        },
      },
    });

    await wrapper.get('[data-testid="sign-in-github"]').trigger("click");

    Object.defineProperty(window, "location", {
      configurable: true,
      value: original,
    });

    expect(redirectedTo).toContain("app=admin");
    expect(redirectedTo).toContain("redirect=%2Freports");
  });

  it("falls back to the dashboard for unsafe preserved redirects", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());
    const { router, wrapper } = await mountLoginView(
      "/login?redirect=%2F%2Fevil.example%2Fescape",
    );
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

  it("shows the GitHub sign-in error from the query and clears it from the URL", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());
    const { router, wrapper } = await mountLoginView(
      "/login?githubError=denied",
    );
    await flushPromises();

    expect(wrapper.text()).toContain("GitHub sign-in was cancelled.");
    expect(router.currentRoute.value.query.githubError).toBeUndefined();
    expect(router.currentRoute.value.name).toBe(routeNames.login);
  });

  it("offers the GitHub email settings link when no account matched", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());
    const { wrapper } = await mountLoginView("/login?githubError=nomember");
    await flushPromises();

    const help = wrapper.get('[data-testid="sign-in-error-help"]');
    expect(help.attributes("href")).toBe("https://github.com/settings/emails");
    expect(wrapper.text()).toContain("verified email");
  });

  it("explains an ambiguous match without offering a GitHub link", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());
    const { wrapper } = await mountLoginView("/login?githubError=ambiguous");
    await flushPromises();

    expect(wrapper.get('[data-testid="sign-in-error"]').text()).toContain(
      "more than one GiTiempo account",
    );
    expect(wrapper.find('[data-testid="sign-in-error-help"]').exists()).toBe(
      false,
    );
  });

  it("preserves the visible user workspace link", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());
    const { wrapper } = await mountLoginView();

    const workspaceLink = wrapper.get('[data-testid="auth-intro-counterpart"]');

    expect(workspaceLink.text()).toContain("Open the user workspace");
    expect(workspaceLink.attributes("href")).toBe(
      "https://user.example.test/login",
    );
  });

  it("offers the browser extension through the configured install page", async () => {
    vi.stubEnv(
      "VITE_EXTENSION_INSTALL_URL",
      "https://chromewebstore.google.com/detail/gitiempo/abc",
    );
    setAuthRuntimeForTesting(createRuntimeMock());
    const { wrapper } = await mountLoginView();

    const callout = wrapper.get('[data-testid="login-extension-callout"]');

    expect(callout.attributes("href")).toBe(
      "https://chromewebstore.google.com/detail/gitiempo/abc",
    );
    expect(callout.attributes("target")).toBe("_blank");
    expect(callout.text()).toContain("Browser extension");
  });

  it("hides the extension callout when no install page is configured", async () => {
    // Stub it empty rather than relying on absence: a developer's .env.local
    // sets this, and the suite must not depend on their machine.
    vi.stubEnv("VITE_EXTENSION_INSTALL_URL", "");
    setAuthRuntimeForTesting(createRuntimeMock());
    const { wrapper } = await mountLoginView();

    expect(wrapper.find('[data-testid="login-extension-callout"]').exists()).toBe(
      false,
    );
  });

  it("paints the whole left half with the auth gradient", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());
    const { wrapper } = await mountLoginView();

    // Guards the restyle: the gradient belongs to the half, not the inner
    // column, or a white strip reappears beside the intro copy.
    const panel = wrapper.get("h1").element.closest('[class*="linear-gradient"]');

    expect(panel).not.toBeNull();
    expect(panel?.className).toContain("lg:flex-1");
    expect(panel?.className).not.toContain("lg:min-w-[50vw]");
    expect(panel?.firstElementChild?.className).not.toContain("linear-gradient");
    expect(panel?.firstElementChild?.className).toContain("mx-auto");
    expect(panel?.firstElementChild?.className).toContain("max-w-[640px]");
  });
});
