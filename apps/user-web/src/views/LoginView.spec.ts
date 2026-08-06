import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory } from "vue-router";
import PrimeVue from "primevue/config";
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
    vi.stubEnv("VITE_ADMIN_APP_URL", "https://admin.example.test/login");
    // The GitHub button is off by default; opt in so the button renders here.
    vi.stubEnv("VITE_GITHUB_SIGNIN_ENABLED", "true");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("signs in with email/password through the UI and redirects to the requested route", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());
    const { router, wrapper } = await mountLoginView(
      "/login?redirect=%2Ftime-entries",
    );

    await wrapper.get('[data-testid="sign-in-email"]').setValue("alexey@example.com");
    await wrapper.get('[data-testid="sign-in-password"]').setValue("password123");
    const routeReady = waitForRoute(
      router,
      () => router.currentRoute.value.fullPath === "/time-entries",
    );
    await wrapper.get("form").trigger("submit");
    await routeReady;

    expect(router.currentRoute.value.fullPath).toBe("/time-entries");
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
        origin: "http://localhost:5173",
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

    expect(redirectedTo).toContain("/auth/github/start?app=user");
  });

  it("carries the protected-route redirect target into the GitHub start URL", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());
    const { wrapper } = await mountLoginView("/login?redirect=%2Ftime-entries");

    let redirectedTo = "";
    const original = window.location;
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        origin: "http://localhost:5173",
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

    expect(redirectedTo).toContain("app=user");
    expect(redirectedTo).toContain("redirect=%2Ftime-entries");
  });

  it("falls back to the dashboard when the login redirect query is unsafe", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());
    const { router, wrapper } = await mountLoginView(
      "/login?redirect=%2F%2Fevil.example.test%2Fescape",
    );

    await wrapper.get('[data-testid="sign-in-email"]').setValue("alexey@example.com");
    await wrapper.get('[data-testid="sign-in-password"]').setValue("password123");
    const routeReady = waitForRoute(
      router,
      () => router.currentRoute.value.name === routeNames.dashboard,
    );
    await wrapper.get("form").trigger("submit");
    await routeReady;

    expect(router.currentRoute.value.name).toBe(routeNames.dashboard);
  });

  it("shows sign-in errors without navigating away from login", async () => {
    setAuthRuntimeForTesting(
      createRuntimeMock({
        signInWithEmailPassword: async () => {
          throw new Error("Invalid user credentials");
        },
      }),
    );
    const { router, wrapper } = await mountLoginView();

    await wrapper.get('[data-testid="sign-in-email"]').setValue("alexey@example.com");
    await wrapper.get('[data-testid="sign-in-password"]').setValue("bad-password");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain("Invalid user credentials");
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

  it("keeps login actions disabled while Firebase sign-in is still in progress", async () => {
    let releaseProviderStep!: () => void;
    const providerStep = new Promise<void>((resolve) => {
      releaseProviderStep = resolve;
    });
    setAuthRuntimeForTesting(
      createRuntimeMock({
        signInWithEmailPassword: async () => {
          await providerStep;
          return "firebase-email-token";
        },
      }),
    );
    const { wrapper } = await mountLoginView();

    await wrapper.get('[data-testid="sign-in-email"]').setValue("alexey@example.com");
    await wrapper.get('[data-testid="sign-in-password"]').setValue("password123");
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.get('[data-testid="sign-in-submit"]').attributes("disabled")).toBeDefined();
    expect(wrapper.get('[data-testid="sign-in-google"]').attributes("disabled")).toBeDefined();

    releaseProviderStep();
    await flushPromises();
  });

  it("preserves the visible admin workspace link", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());
    const { wrapper } = await mountLoginView();

    const workspaceLink = wrapper.get('[data-testid="auth-intro-counterpart"]');

    expect(workspaceLink.text()).toContain("Open the admin workspace");
    expect(workspaceLink.attributes("href")).toBe(
      "https://admin.example.test/login",
    );
  });

  it("navigates to register from the create workspace action without reusing login errors", async () => {
    setAuthRuntimeForTesting(
      createRuntimeMock({
        signInWithEmailPassword: async () => {
          throw new Error("Invalid user credentials");
        },
      }),
    );
    const { router, wrapper } = await mountLoginView();

    await wrapper.get('[data-testid="sign-in-email"]').setValue("alexey@example.com");
    await wrapper.get('[data-testid="sign-in-password"]').setValue("bad-password");
    await wrapper.get("form").trigger("submit");
    await flushPromises();
    expect(wrapper.text()).toContain("Invalid user credentials");

    const routeReady = waitForRoute(
      router,
      () => router.currentRoute.value.name === routeNames.register,
    );
    await wrapper.get('[data-testid="sign-in-create-workspace"]').trigger("click");
    await routeReady;

    expect(router.currentRoute.value.name).toBe(routeNames.register);
  });

  it("sends the browser extension callout to the install page when configured", async () => {
    vi.stubEnv(
      "VITE_EXTENSION_INSTALL_URL",
      "https://chromewebstore.google.com/detail/gitiempo/abc",
    );
    setAuthRuntimeForTesting(createRuntimeMock());
    const { wrapper } = await mountLoginView();

    expect(
      wrapper.get('[data-testid="login-extension-callout"]').attributes("href"),
    ).toBe("https://chromewebstore.google.com/detail/gitiempo/abc");
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
    expect(callout.attributes("rel")).toBe("noreferrer");
    expect(callout.attributes("aria-label")).toContain("opens in a new tab");
    expect(callout.text()).toContain("Browser extension");
    expect(callout.text()).toContain("Track time right from your browser");
  });

  it("keeps the extension callout out of the sign-in form", async () => {
    vi.stubEnv(
      "VITE_EXTENSION_INSTALL_URL",
      "https://chromewebstore.google.com/detail/gitiempo/abc",
    );
    setAuthRuntimeForTesting(createRuntimeMock());
    const { wrapper } = await mountLoginView();

    expect(
      wrapper.find('form [data-testid="login-extension-callout"]').exists(),
    ).toBe(false);
    expect(wrapper.find('[data-testid="sign-in-create-workspace"]').exists()).toBe(
      true,
    );
    expect(wrapper.find('[data-testid="sign-in-email"]').exists()).toBe(true);
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
    expect(panel?.firstElementChild?.className).not.toContain("max-w-[600px]");
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
    expect(wrapper.text()).not.toContain("Browser extension");
  });
});
