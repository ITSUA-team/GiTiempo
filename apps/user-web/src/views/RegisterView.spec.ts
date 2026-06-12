import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import PrimeVue from "primevue/config";
import ToastService from "primevue/toastservice";
import { createMemoryHistory } from "vue-router";
import type { TokenPairResponse, UserResponse } from "@gitiempo/shared";
import { giTiempoPrimeVueOptions } from "@gitiempo/web-config/theme";
import { waitForRoute } from "@gitiempo/web-shared/testing";

import { clearRefreshToken, getRefreshToken } from "@gitiempo/web-shared/session-storage";
import { createAppRouter, routeNames } from "@/router";
import {
  resetAuthRuntimeForTesting,
  setAuthRuntimeForTesting,
  type AuthRuntime,
} from "@/services/auth-runtime";
import {
  resetWorkspaceRegistrationClientForTesting,
  setWorkspaceRegistrationClientForTesting,
  type WorkspaceRegistrationClient,
} from "@/services/workspace-registration-client";

type TokenPairResolver = Parameters<
  ConstructorParameters<typeof Promise<TokenPairResponse>>[0]
>[0];

function createRuntimeMock(overrides?: Partial<AuthRuntime>): AuthRuntime {
  const currentUser: UserResponse = {
    avatarUrl: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    displayName: "Owner Name",
    email: "owner@example.com",
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

function createRegistrationClientMock(
  implementation?: WorkspaceRegistrationClient["register"],
): WorkspaceRegistrationClient & { register: ReturnType<typeof vi.fn> } {
  return {
    register: vi.fn(
      implementation ??
        (async () => ({
          accessToken: "registered-access-token",
          accessTokenExpiresIn: 900,
          refreshToken: "registered-refresh-token",
        })),
    ),
  };
}

async function mountRegisterView(initialPath = "/register") {
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createAppRouter({
    history: createMemoryHistory(),
    pinia,
  });
  await router.push(initialPath);
  await router.isReady();
  const RegisterView = (await import("./RegisterView.vue")).default;

  const wrapper = mount(RegisterView, {
    global: {
      plugins: [pinia, router, [PrimeVue, giTiempoPrimeVueOptions], ToastService],
    },
  });

  await flushPromises();

  return { router, wrapper };
}

async function fillValidRegistrationForm(
  wrapper: Awaited<ReturnType<typeof mountRegisterView>>["wrapper"],
): Promise<void> {
  await wrapper.get('[data-testid="register-email"]').setValue("owner@example.com");
  await wrapper.get('[data-testid="register-full-name"]').setValue("Owner Name");
  await wrapper.get('[data-testid="register-workspace-name"]').setValue("Workspace Alpha");
  await wrapper.get('[data-testid="register-password"]').setValue("password123");
  await wrapper.get('[data-testid="register-confirm-password"]').setValue(
    "password123",
  );
  await wrapper.get('input#register-owner-acknowledgement').setValue(true);
}

function createApiError(code: string, message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

describe("RegisterView", () => {
  beforeEach(() => {
    clearRefreshToken();
    resetAuthRuntimeForTesting();
    resetWorkspaceRegistrationClientForTesting();
    setAuthRuntimeForTesting(createRuntimeMock());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the default desktop and mobile register branches", async () => {
    setWorkspaceRegistrationClientForTesting(createRegistrationClientMock());
    const { wrapper } = await mountRegisterView();

    expect(wrapper.get('[data-testid="register-desktop-intro"]').text()).toContain(
      "Create the first workspace owner account.",
    );
    expect(wrapper.get('[data-testid="register-mobile-hero"]').text()).toContain(
      "Create workspace",
    );
    expect(wrapper.get('[data-testid="register-panel"]').text()).toContain(
      "Use a work email. This account becomes the initial workspace owner after registration succeeds.",
    );
  });

  it("shows required-field validation and blocks submission", async () => {
    const registerClient = createRegistrationClientMock();
    setWorkspaceRegistrationClientForTesting(registerClient);
    const { wrapper } = await mountRegisterView();

    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain("Enter your work email.");
    expect(wrapper.text()).toContain("Enter your full name.");
    expect(wrapper.text()).toContain("Enter your workspace name.");
    expect(wrapper.text()).toContain("Enter a password.");
    expect(wrapper.text()).toContain("Confirm your password.");
    expect(wrapper.text()).toContain(
      "Accept the workspace owner responsibility to continue.",
    );
    expect(registerClient.register).not.toHaveBeenCalled();
  });

  it("blocks submission when confirmation does not match", async () => {
    const registerClient = createRegistrationClientMock();
    setWorkspaceRegistrationClientForTesting(registerClient);
    const { wrapper } = await mountRegisterView();

    await wrapper.get('[data-testid="register-email"]').setValue("owner@example.com");
    await wrapper.get('[data-testid="register-full-name"]').setValue("Owner Name");
    await wrapper.get('[data-testid="register-workspace-name"]').setValue("Workspace Alpha");
    await wrapper.get('[data-testid="register-password"]').setValue("password123");
    await wrapper.get('[data-testid="register-confirm-password"]').setValue(
      "password456",
    );
    await wrapper.get('input#register-owner-acknowledgement').setValue(true);
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.text()).toContain("Passwords do not match.");
    expect(registerClient.register).not.toHaveBeenCalled();
  });

  it("prevents duplicate submissions while registration is in flight", async () => {
    const registerResolvers: TokenPairResolver[] = [];
    const registerClient = createRegistrationClientMock(
      () =>
        new Promise<TokenPairResponse>((resolve) => {
          registerResolvers.push(resolve);
        }),
    );
    setWorkspaceRegistrationClientForTesting(registerClient);
    const { wrapper } = await mountRegisterView();

    await fillValidRegistrationForm(wrapper);
    await wrapper.get("form").trigger("submit");
    await flushPromises();
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(registerClient.register).toHaveBeenCalledTimes(1);
    expect(wrapper.get('[data-testid="register-submit"]').attributes("disabled")).toBeDefined();

    registerResolvers[0]?.({
      accessToken: "registered-access-token",
      accessTokenExpiresIn: 900,
      refreshToken: "registered-refresh-token",
    });
    await flushPromises();
  });

  it("creates the workspace, establishes the session, and redirects to the requested route", async () => {
    const registerClient = createRegistrationClientMock();
    setWorkspaceRegistrationClientForTesting(registerClient);
    const { router, wrapper } = await mountRegisterView(
      "/register?redirect=%2Ftime-entries",
    );

    await fillValidRegistrationForm(wrapper);
    const routeReady = waitForRoute(
      router,
      () => router.currentRoute.value.fullPath === "/time-entries",
    );
    await wrapper.get("form").trigger("submit");
    await routeReady;

    expect(registerClient.register).toHaveBeenCalledWith({
      email: "owner@example.com",
      fullName: "Owner Name",
      ownerAcknowledgement: true,
      password: "password123",
      workspaceName: "Workspace Alpha",
    });
    expect(getRefreshToken()).toBe("registered-refresh-token");
    expect(router.currentRoute.value.fullPath).toBe("/time-entries");
  });

  it("routes existing users back to login from the inline sign-in link", async () => {
    setWorkspaceRegistrationClientForTesting(createRegistrationClientMock());
    const { router, wrapper } = await mountRegisterView();
    const routeReady = waitForRoute(
      router,
      () => router.currentRoute.value.name === routeNames.login,
    );

    await wrapper.get('[data-testid="register-sign-in-link"]').trigger("click");
    await routeReady;

    expect(router.currentRoute.value.name).toBe(routeNames.login);
  });

  it("shows duplicate-email feedback inline and keeps the user on the register route", async () => {
    const registerClient = createRegistrationClientMock(async () => {
      throw createApiError(
        "duplicate_email",
        "This work email is already registered.",
      );
    });
    setWorkspaceRegistrationClientForTesting(registerClient);
    const { router, wrapper } = await mountRegisterView();

    await fillValidRegistrationForm(wrapper);
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.get('[data-testid="register-inline-error"]').text()).toContain(
      "This work email is already registered.",
    );
    expect(router.currentRoute.value.name).toBe(routeNames.register);
  });

  it("shows workspace-name-unavailable feedback inline", async () => {
    const registerClient = createRegistrationClientMock(async () => {
      throw createApiError(
        "workspace_name_unavailable",
        "Workspace name is already in use.",
      );
    });
    setWorkspaceRegistrationClientForTesting(registerClient);
    const { wrapper } = await mountRegisterView();

    await fillValidRegistrationForm(wrapper);
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.get('[data-testid="register-inline-error"]').text()).toContain(
      "That workspace name is already in use. Choose another name.",
    );
  });

  it("shows weak-password guidance from the backend", async () => {
    const registerClient = createRegistrationClientMock(async () => {
      throw createApiError("weak_password", "Weak password");
    });
    setWorkspaceRegistrationClientForTesting(registerClient);
    const { wrapper } = await mountRegisterView();

    await fillValidRegistrationForm(wrapper);
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.get('[data-testid="register-inline-error"]').text()).toContain(
      "Choose a stronger password and try again.",
    );
  });

  it("shows rate-limit guidance from the backend", async () => {
    const registerClient = createRegistrationClientMock(async () => {
      throw createApiError("rate_limited", "Too many attempts");
    });
    setWorkspaceRegistrationClientForTesting(registerClient);
    const { wrapper } = await mountRegisterView();

    await fillValidRegistrationForm(wrapper);
    await wrapper.get("form").trigger("submit");
    await flushPromises();

    expect(wrapper.get('[data-testid="register-inline-error"]').text()).toContain(
      "Too many registration attempts. Wait a moment, then try again.",
    );
  });
});
