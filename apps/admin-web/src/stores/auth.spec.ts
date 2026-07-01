import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
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
    signOutIdentityProvider: async () => undefined,
    updateCurrentUser: async (_accessToken, input) => ({
      ...currentUser,
      ...input,
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

    expect(authStore.displayName).toBe("Admin User");
    expect(authStore.userInitials).toBe("AU");
    expect(authStore.workspaceName).toBe("Workspace Admin");
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
    expect(authStore.displayName).toBe("Admin User");
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

    await authStore.loginWithEmailPassword("admin@example.com", "password123");

    expect(authStore.isAuthenticated).toBe(true);
    expect(authStore.accessToken).toBe("access-token");
    expect(getRefreshToken()).toBe("refresh-token-next");
    expect(authStore.bootstrapComplete).toBe(true);
    expect(authStore.profile?.email).toBe("admin@example.com");
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
      displayName: "Stale Admin",
      email: "stale@example.com",
      id: "stale-user-id",
      role: "admin",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    await expect(
      authStore.loginWithEmailPassword("admin@example.com", "password123"),
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
    expect(authStore.profile?.email).toBe("admin@example.com");
    expect(authStore.bootstrapComplete).toBe(true);
  });

  it("clears tokens and signs out identity provider on successful logout", async () => {
    let logoutCalls = 0;
    let identitySignOutCalls = 0;
    setRefreshToken("persisted-refresh-token");
    setAuthRuntimeForTesting(
      createRuntimeMock({
        logoutSession: async () => {
          logoutCalls += 1;
        },
        signOutIdentityProvider: async () => {
          identitySignOutCalls += 1;
        },
      }),
    );

    const authStore = useAuthStore();
    authStore.accessToken = "current-access-token";
    authStore.setWorkspaceName("Updated Workspace");
    seedAuthenticatedQueryCache();

    await authStore.logout();

    expect(logoutCalls).toBe(1);
    expect(identitySignOutCalls).toBe(1);
    expect(authStore.isAuthenticated).toBe(false);
    expect(authStore.accessToken).toBeNull();
    expect(authStore.profile).toBeNull();
    expect(authStore.workspaceName).toBe("Workspace Admin");
    expect(getRefreshToken()).toBeNull();
    expect(authStore.bootstrapComplete).toBe(true);
    expectAuthenticatedQueryCacheCleared();
  });

  it("updates the workspace label from workspace settings flows", () => {
    const authStore = useAuthStore();

    expect(authStore.workspaceName).toBe("Workspace Admin");

    authStore.setWorkspaceName("Updated Workspace");

    expect(authStore.workspaceName).toBe("Updated Workspace");
  });

  it("loads workspace memberships and updates the current workspace label", async () => {
    const memberships: CurrentUserWorkspaceMembershipListResponse = {
      items: [
        {
          isCurrent: false,
          role: "admin",
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
      displayName: "Admin User",
      email: "admin@example.com",
      id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
      role: "pm",
      updatedAt: "2026-01-02T00:00:00.000Z",
    };
    const memberships: CurrentUserWorkspaceMembershipListResponse = {
      items: [
        {
          isCurrent: false,
          role: "admin",
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
      }),
    );

    const authStore = useAuthStore();
    authStore.accessToken = "current-access-token";
    authStore.profile = {
      avatarUrl: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      displayName: "Admin User",
      email: "admin@example.com",
      id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
      role: "admin",
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

  it("keeps the switched admin session when membership reload fails after switching", async () => {
    const currentUser: UserResponse = {
      avatarUrl: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      displayName: "Admin User",
      email: "admin@example.com",
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
      displayName: "Admin User",
      email: "admin@example.com",
      id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
      role: "admin",
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

  it("clears tokens on logout even when API logout fails", async () => {
    let identitySignOutCalls = 0;
    setRefreshToken("persisted-refresh-token");
    setAuthRuntimeForTesting(
      createRuntimeMock({
        logoutSession: async () => {
          throw new Error("logout failed");
        },
        signOutIdentityProvider: async () => {
          identitySignOutCalls += 1;
        },
      }),
    );

    const authStore = useAuthStore();
    authStore.accessToken = "current-access-token";

    await authStore.logout();

    expect(identitySignOutCalls).toBe(1);
    expect(authStore.isAuthenticated).toBe(false);
    expect(authStore.accessToken).toBeNull();
    expect(authStore.profile).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(authStore.bootstrapComplete).toBe(true);
  });
});
