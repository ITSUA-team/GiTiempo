import { beforeEach, describe, expect, it } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import type {
  CurrentUserWorkspaceMembershipListResponse,
  UserResponse,
} from "@gitiempo/shared";

import {
  clearRefreshToken,
  getRefreshToken,
  setRefreshToken,
} from "@gitiempo/web-shared/session-storage";
import {
  resetAuthRuntimeForTesting,
  setAuthRuntimeForTesting,
  type AuthRuntime,
} from "@/services/auth-runtime";
import { queryClient } from "@/query-client";
import { useAuthStore } from "@/stores/auth";

const authenticatedQueryCacheProbeKey = ["auth-cache-probe"];

function seedAuthenticatedQueryCache(): void {
  queryClient.setQueryData(authenticatedQueryCacheProbeKey, "stale-data");
}

function expectAuthenticatedQueryCacheCleared(): void {
  expect(
    queryClient.getQueryData(authenticatedQueryCacheProbeKey),
  ).toBeUndefined();
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
    signOutIdentityProvider: async () => undefined,
    updateCurrentUser: async (_accessToken, input) => ({
      ...currentUser,
      ...input,
      updatedAt: "2026-01-02T00:00:00.000Z",
    }),
    ...overrides,
  };
}

describe("useAuthStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    clearRefreshToken();
    queryClient.clear();
    resetAuthRuntimeForTesting();
  });

  it("exposes guest auth labels from the app wrapper", () => {
    const authStore = useAuthStore();

    expect(authStore.displayName).toBe("Workspace member");
    expect(authStore.userInitials).toBe("WM");
    expect(authStore.workspaceName).toBe("Workspace");
  });

  it("restores a session from refresh token during bootstrap", async () => {
    setRefreshToken("persisted-refresh-token");
    setAuthRuntimeForTesting(createRuntimeMock());

    const authStore = useAuthStore();

    await authStore.bootstrapSession();

    expect(authStore.isAuthenticated).toBe(true);
    expect(authStore.accessToken).toBe("restored-access-token");
    expect(getRefreshToken()).toBe("restored-refresh-token");
    expect(authStore.bootstrapComplete).toBe(true);
    expect(authStore.displayName).toBe("Alexey Tsukanov");
  });

  it("stays in guest state when bootstrap starts without a persisted refresh token", async () => {
    let refreshCalls = 0;
    setAuthRuntimeForTesting(
      createRuntimeMock({
        refreshSession: async () => {
          refreshCalls += 1;
          throw new Error("refresh should not run without a token");
        },
      }),
    );

    const authStore = useAuthStore();
    seedAuthenticatedQueryCache();

    await authStore.bootstrapSession();

    expect(refreshCalls).toBe(0);
    expect(authStore.isAuthenticated).toBe(false);
    expect(authStore.profile).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(authStore.bootstrapComplete).toBe(true);
    expectAuthenticatedQueryCacheCleared();
  });

  it("clears invalid refresh token during bootstrap fallback", async () => {
    setRefreshToken("persisted-refresh-token");
    setAuthRuntimeForTesting(
      createRuntimeMock({
        refreshSession: async () => {
          throw new Error("invalid refresh token");
        },
      }),
    );

    const authStore = useAuthStore();
    seedAuthenticatedQueryCache();

    await authStore.bootstrapSession();

    expect(authStore.isAuthenticated).toBe(false);
    expect(authStore.accessToken).toBeNull();
    expect(authStore.profile).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(authStore.bootstrapComplete).toBe(true);
    expectAuthenticatedQueryCacheCleared();
  });

  it("clears authenticated query cache when access-token refresh fails", async () => {
    setRefreshToken("persisted-refresh-token");
    setAuthRuntimeForTesting(
      createRuntimeMock({
        refreshSession: async () => {
          throw new Error("refresh failed");
        },
      }),
    );

    const authStore = useAuthStore();
    authStore.accessToken = "stale-access-token";
    seedAuthenticatedQueryCache();

    await expect(authStore.refreshAccessToken()).rejects.toThrow(
      "refresh failed",
    );

    expect(authStore.isAuthenticated).toBe(false);
    expect(authStore.accessToken).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(authStore.bootstrapComplete).toBe(true);
    expectAuthenticatedQueryCacheCleared();
  });

  it("logs in with email/password and persists rotated token pair", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());

    const authStore = useAuthStore();
    seedAuthenticatedQueryCache();

    await authStore.loginWithEmailPassword("alex@example.com", "password123");

    expect(authStore.isAuthenticated).toBe(true);
    expect(authStore.accessToken).toBe("access-token");
    expect(getRefreshToken()).toBe("refresh-token-next");
    expect(authStore.bootstrapComplete).toBe(true);
    expect(authStore.profile?.email).toBe("alexey@example.com");
    expectAuthenticatedQueryCacheCleared();
  });

  it("keeps submitting state active through provider sign-in and token exchange", async () => {
    let releaseProviderStep!: () => void;
    let releaseExchangeStep!: () => void;
    const providerStep = new Promise<void>((resolve) => {
      releaseProviderStep = resolve;
    });
    const exchangeStep = new Promise<void>((resolve) => {
      releaseExchangeStep = resolve;
    });
    setAuthRuntimeForTesting(
      createRuntimeMock({
        loginWithFirebaseToken: async () => {
          await exchangeStep;
          return {
            accessToken: "access-token",
            accessTokenExpiresIn: 900,
            refreshToken: "refresh-token-next",
          };
        },
        signInWithEmailPassword: async () => {
          await providerStep;
          return "firebase-email-token";
        },
      }),
    );

    const authStore = useAuthStore();
    const loginPromise = authStore.loginWithEmailPassword(
      "alex@example.com",
      "password123",
    );

    expect(authStore.isSubmitting).toBe(true);

    releaseProviderStep();
    await Promise.resolve();

    expect(authStore.isSubmitting).toBe(true);

    releaseExchangeStep();
    await loginPromise;

    expect(authStore.isSubmitting).toBe(false);
  });

  it("updates the workspace label from shell workspace loading", () => {
    const authStore = useAuthStore();

    expect(authStore.workspaceName).toBe("Workspace");

    authStore.setWorkspaceName("Updated Workspace");

    expect(authStore.workspaceName).toBe("Updated Workspace");
  });

  it("loads workspace memberships and updates the current workspace label", async () => {
    const memberships: CurrentUserWorkspaceMembershipListResponse = {
      items: [
        {
          isCurrent: false,
          role: "member",
          workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
          workspaceName: "Workspace Alpha",
        },
        {
          isCurrent: true,
          role: "pm",
          workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002",
          workspaceName: "Workspace Beta",
        },
      ],
    };
    setAuthRuntimeForTesting(
      createRuntimeMock({
        listCurrentUserWorkspaces: async () => memberships,
      }),
    );

    const authStore = useAuthStore();
    authStore.accessToken = "current-access-token";

    await expect(authStore.loadWorkspaceMemberships()).resolves.toEqual(
      memberships.items,
    );
    expect(authStore.workspaceMemberships).toEqual(memberships.items);
    expect(authStore.workspaceName).toBe("Workspace Beta");
    expect(authStore.hasAlternativeWorkspaces).toBe(true);
  });

  it("switches workspace, reloads memberships, and resets switching state", async () => {
    const currentUser: UserResponse = {
      avatarUrl: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      displayName: "Alexey Tsukanov",
      email: "alexey@example.com",
      id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
      role: "pm",
      updatedAt: "2026-01-02T00:00:00.000Z",
    };
    const switchWorkspace = async () => ({
      accessToken: "switched-access-token",
      accessTokenExpiresIn: 900,
      refreshToken: "switched-refresh-token",
    });
    const memberships: CurrentUserWorkspaceMembershipListResponse = {
      items: [
        {
          isCurrent: false,
          role: "member",
          workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
          workspaceName: "Workspace Alpha",
        },
        {
          isCurrent: true,
          role: "pm",
          workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002",
          workspaceName: "Workspace Beta",
        },
      ],
    };

    setAuthRuntimeForTesting(
      createRuntimeMock({
        getCurrentUser: async () => currentUser,
        listCurrentUserWorkspaces: async () => memberships,
        switchWorkspace,
      }),
    );

    const authStore = useAuthStore();
    authStore.accessToken = "current-access-token";
    authStore.profile = {
      avatarUrl: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      displayName: "Alexey Tsukanov",
      email: "alexey@example.com",
      id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
      role: "member",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    const switchingPromise = authStore.switchWorkspace(
      "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002",
    );

    expect(authStore.switchingWorkspaceId).toBe(
      "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002",
    );

    await expect(switchingPromise).resolves.toEqual({
      membershipsReloaded: true,
      reloadError: null,
    });

    expect(authStore.accessToken).toBe("switched-access-token");
    expect(getRefreshToken()).toBe("switched-refresh-token");
    expect(authStore.profile?.role).toBe("pm");
    expect(authStore.workspaceMemberships).toEqual(memberships.items);
    expect(authStore.workspaceName).toBe("Workspace Beta");
    expect(authStore.switchingWorkspaceId).toBeNull();
  });

  it("keeps the switched session when membership reload fails after switching", async () => {
    const currentUser: UserResponse = {
      avatarUrl: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      displayName: "Alexey Tsukanov",
      email: "alexey@example.com",
      id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
      role: "pm",
      updatedAt: "2026-01-02T00:00:00.000Z",
    };
    setAuthRuntimeForTesting(
      createRuntimeMock({
        getCurrentUser: async () => currentUser,
        listCurrentUserWorkspaces: async () => {
          throw new Error("membership reload failed");
        },
      }),
    );

    const authStore = useAuthStore();
    authStore.accessToken = "current-access-token";
    authStore.profile = {
      avatarUrl: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      displayName: "Alexey Tsukanov",
      email: "alexey@example.com",
      id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
      role: "member",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    await expect(
      authStore.switchWorkspace("018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002"),
    ).resolves.toMatchObject({
      membershipsReloaded: false,
    });

    expect(authStore.accessToken).toBe("switched-access-token");
    expect(getRefreshToken()).toBe("switched-refresh-token");
    expect(authStore.profile?.role).toBe("pm");
    expect(authStore.switchingWorkspaceId).toBeNull();
  });

  it("resets switching state when workspace switching fails", async () => {
    setAuthRuntimeForTesting(
      createRuntimeMock({
        switchWorkspace: async () => {
          throw new Error("switch failed");
        },
      }),
    );

    const authStore = useAuthStore();
    authStore.accessToken = "current-access-token";
    authStore.profile = {
      avatarUrl: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      displayName: "Alexey Tsukanov",
      email: "alexey@example.com",
      id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
      role: "member",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    await expect(
      authStore.switchWorkspace("018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002"),
    ).rejects.toThrow("switch failed");

    expect(authStore.accessToken).toBe("current-access-token");
    expect(authStore.profile?.role).toBe("member");
    expect(authStore.switchingWorkspaceId).toBeNull();
  });

  it("logs in with a Firebase token and persists the token pair", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());

    const authStore = useAuthStore();

    await authStore.loginWithFirebaseToken("firebase-id-token");

    expect(authStore.isAuthenticated).toBe(true);
    expect(authStore.accessToken).toBe("access-token");
    expect(getRefreshToken()).toBe("refresh-token-next");
    expect(authStore.profile?.email).toBe("alexey@example.com");
    expect(authStore.bootstrapComplete).toBe(true);
  });

  it("establishes a session directly from an approved token pair", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());

    const authStore = useAuthStore();
    seedAuthenticatedQueryCache();

    await authStore.establishSessionFromTokenPair({
      accessToken: "registered-access-token",
      accessTokenExpiresIn: 900,
      refreshToken: "registered-refresh-token",
    });

    expect(authStore.isAuthenticated).toBe(true);
    expect(authStore.accessToken).toBe("registered-access-token");
    expect(getRefreshToken()).toBe("registered-refresh-token");
    expect(authStore.profile?.email).toBe("alexey@example.com");
    expect(authStore.bootstrapComplete).toBe(true);
    expectAuthenticatedQueryCacheCleared();
  });

  it("clears stale local session state when login exchange fails", async () => {
    setRefreshToken("stale-refresh-token");
    setAuthRuntimeForTesting(
      createRuntimeMock({
        loginWithFirebaseToken: async () => {
          throw new Error("login exchange failed");
        },
      }),
    );

    const authStore = useAuthStore();
    authStore.accessToken = "stale-access-token";
    authStore.profile = {
      avatarUrl: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      displayName: "Stale User",
      email: "stale@example.com",
      id: "stale-user-id",
      role: "member",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    await expect(
      authStore.loginWithEmailPassword("alex@example.com", "password123"),
    ).rejects.toThrow("login exchange failed");

    expect(authStore.isAuthenticated).toBe(false);
    expect(authStore.accessToken).toBeNull();
    expect(authStore.profile).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(authStore.bootstrapComplete).toBe(true);
    expect(authStore.isSubmitting).toBe(false);
  });

  it("logs in with Google and persists the token pair", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());

    const authStore = useAuthStore();

    await authStore.loginWithGoogle();

    expect(authStore.isAuthenticated).toBe(true);
    expect(authStore.accessToken).toBe("access-token");
    expect(getRefreshToken()).toBe("refresh-token-next");
    expect(authStore.profile?.email).toBe("alexey@example.com");
    expect(authStore.bootstrapComplete).toBe(true);
  });

  it("clears stale local session state when Google login fails", async () => {
    setRefreshToken("stale-refresh-token");
    setAuthRuntimeForTesting(
      createRuntimeMock({
        signInWithGoogle: async () => {
          throw new Error("google sign in failed");
        },
      }),
    );

    const authStore = useAuthStore();
    authStore.accessToken = "stale-access-token";
    authStore.profile = {
      avatarUrl: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      displayName: "Stale User",
      email: "stale@example.com",
      id: "stale-user-id",
      role: "member",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    await expect(authStore.loginWithGoogle()).rejects.toThrow(
      "google sign in failed",
    );

    expect(authStore.isAuthenticated).toBe(false);
    expect(authStore.accessToken).toBeNull();
    expect(authStore.profile).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(authStore.bootstrapComplete).toBe(true);
    expect(authStore.isSubmitting).toBe(false);
  });

  it("clears tokens on logout when API logout succeeds", async () => {
    let logoutCalls = 0;
    setRefreshToken("persisted-refresh-token");
    setAuthRuntimeForTesting(
      createRuntimeMock({
        logoutSession: async () => {
          logoutCalls += 1;
        },
      }),
    );

    const authStore = useAuthStore();
    authStore.accessToken = "current-access-token";
    authStore.setWorkspaceName("Updated Workspace");
    seedAuthenticatedQueryCache();

    await authStore.logout();

    expect(logoutCalls).toBe(1);
    expect(authStore.isAuthenticated).toBe(false);
    expect(authStore.accessToken).toBeNull();
    expect(authStore.profile).toBeNull();
    expect(authStore.workspaceName).toBe("Workspace");
    expect(getRefreshToken()).toBeNull();
    expect(authStore.bootstrapComplete).toBe(true);
    expectAuthenticatedQueryCacheCleared();
  });

  it("clears tokens on logout even when API logout fails", async () => {
    setRefreshToken("persisted-refresh-token");
    setAuthRuntimeForTesting(
      createRuntimeMock({
        logoutSession: async () => {
          throw new Error("logout failed");
        },
      }),
    );

    const authStore = useAuthStore();
    authStore.accessToken = "current-access-token";
    authStore.setWorkspaceName("Updated Workspace");

    await authStore.logout();

    expect(authStore.isAuthenticated).toBe(false);
    expect(authStore.accessToken).toBeNull();
    expect(authStore.profile).toBeNull();
    expect(authStore.workspaceName).toBe("Workspace");
    expect(getRefreshToken()).toBeNull();
    expect(authStore.bootstrapComplete).toBe(true);
  });

  it("updates the current user profile from the shared runtime boundary", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());

    const authStore = useAuthStore();
    authStore.accessToken = "current-access-token";
    authStore.profile = {
      avatarUrl: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      displayName: "Alexey Tsukanov",
      email: "alexey@example.com",
      id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
      role: "member",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    await authStore.updateProfile({ displayName: "Alexey Updated" });

    expect(authStore.profile?.displayName).toBe("Alexey Updated");
    expect(authStore.displayName).toBe("Alexey Updated");
  });
});
