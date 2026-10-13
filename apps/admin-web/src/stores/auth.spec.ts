import { beforeEach, describe, expect, it, vi } from "vitest";
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
import { ApiError } from "@gitiempo/web-shared/http";

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
    exchangeGithubSession: async () => ({ accessToken: "github-access-token", accessTokenExpiresIn: 900, refreshToken: "github-refresh-token" }),
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

  it("refreshes the current authorization context and clears broader cached data", async () => {
    let role: UserResponse["role"] = "admin";
    const authStore = useAuthStore();
    authStore.accessToken = "existing-access-token";
    authStore.profile = {
      avatarUrl: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      displayName: "Admin User",
      email: "admin@example.com",
      id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
      role,
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    setAuthRuntimeForTesting(
      createRuntimeMock({
        getCurrentUser: async () => ({
          avatarUrl: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          displayName: "Admin User",
          email: "admin@example.com",
          id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
          role,
          updatedAt: "2026-01-01T00:00:00.000Z",
        }),
        listCurrentUserWorkspaces: async () => ({
          items: [
            {
              isCurrent: true,
              role,
              workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
              workspaceName: "Workspace Alpha",
            },
          ],
        }),
      }),
    );
    await authStore.loadWorkspaceMemberships();
    seedAuthenticatedQueryCache();

    role = "member";

    await expect(authStore.refreshAuthorizationContext()).resolves.toBe(true);

    expect(authStore.profile?.role).toBe("member");
    expect(authStore.workspaceMemberships[0]?.role).toBe("member");
    expectAuthenticatedQueryCacheCleared();
  });

  it("invalidates active scoped queries when membership role is unchanged", async () => {
    const authStore = useAuthStore();
    authStore.accessToken = "existing-access-token";
    authStore.profile = {
      avatarUrl: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      displayName: "PM User",
      email: "pm@example.com",
      id: "pm-user-id",
      role: "pm",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    authStore.workspaceMemberships = [
      {
        isCurrent: true,
        role: "pm",
        workspaceId: "workspace-id",
        workspaceName: "Workspace Alpha",
      },
    ];
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    setAuthRuntimeForTesting(
      createRuntimeMock({
        getCurrentUser: async () => authStore.profile!,
        listCurrentUserWorkspaces: async () => ({
          items: authStore.workspaceMemberships,
        }),
      }),
    );

    await expect(authStore.refreshAuthorizationContext()).resolves.toBe(false);

    expect(invalidateQueries).toHaveBeenCalledOnce();
  });

  it("ignores a stale focus refresh after the access token changes", async () => {
    let resolveProfile!: (profile: UserResponse) => void;
    const authStore = useAuthStore();
    authStore.accessToken = "old-access-token";
    authStore.profile = {
      avatarUrl: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      displayName: "New Admin",
      email: "new@example.com",
      id: "new-user-id",
      role: "admin",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    setAuthRuntimeForTesting(
      createRuntimeMock({
        getCurrentUser: () =>
          new Promise<UserResponse>((resolve) => {
            resolveProfile = resolve;
          }),
        listCurrentUserWorkspaces: async () => ({ items: [] }),
      }),
    );

    const refresh = authStore.refreshAuthorizationContext();
    authStore.accessToken = "new-access-token";
    resolveProfile({
      avatarUrl: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      displayName: "Old Member",
      email: "old@example.com",
      id: "old-user-id",
      role: "member",
      updatedAt: "2026-01-01T00:00:00.000Z",
    });

    await expect(refresh).resolves.toBe(false);
    expect(authStore.profile?.id).toBe("new-user-id");
  });

  it("does not let an older focus refresh overwrite newer memberships", async () => {
    const profiles: Array<(profile: UserResponse) => void> = [];
    const memberships: Array<
      (value: CurrentUserWorkspaceMembershipListResponse) => void
    > = [];
    const authStore = useAuthStore();
    authStore.accessToken = "access-token";
    setAuthRuntimeForTesting(
      createRuntimeMock({
        getCurrentUser: () => new Promise((resolve) => profiles.push(resolve)),
        listCurrentUserWorkspaces: () =>
          new Promise((resolve) => memberships.push(resolve)),
      }),
    );

    const older = authStore.refreshAuthorizationContext();
    const newer = authStore.refreshAuthorizationContext();
    await Promise.resolve();
    profiles[1]!({ avatarUrl: null, createdAt: "2026-01-01T00:00:00.000Z", displayName: "New", email: "new@example.com", id: "new", role: "admin", updatedAt: "2026-01-01T00:00:00.000Z" });
    memberships[1]!({
      items: [{ isCurrent: true, role: "admin", workspaceId: "new", workspaceName: "New" }],
    });
    await newer;
    profiles[0]!({ avatarUrl: null, createdAt: "2026-01-01T00:00:00.000Z", displayName: "Old", email: "old@example.com", id: "old", role: "member", updatedAt: "2026-01-01T00:00:00.000Z" });
    memberships[0]!({
      items: [{ isCurrent: true, role: "member", workspaceId: "old", workspaceName: "Old" }],
    });
    await older;

    expect(authStore.workspaceMemberships[0]?.workspaceId).toBe("new");
    expect(authStore.profile?.id).toBe("new");
    expect(authStore.workspaceName).toBe("New");
  });

  it("retains the session after a failed authorization read and recovers on retry", async () => {
    setRefreshToken("persisted-refresh-token");
    const authStore = useAuthStore();
    authStore.accessToken = "existing-access-token";
    const runtime = createRuntimeMock();
    setAuthRuntimeForTesting(runtime);
    await authStore.refreshAuthorizationContext();
    seedAuthenticatedQueryCache();
    setAuthRuntimeForTesting({
      ...runtime,
      listCurrentUserWorkspaces: async () => {
        throw new Error("network unavailable");
      },
    });

    await expect(authStore.refreshAuthorizationContext()).resolves.toBe(true);

    expect(authStore.profile).toBeNull();
    expect(authStore.workspaceMemberships).toEqual([]);
    expectAuthenticatedQueryCacheCleared();
    expect(authStore.accessToken).toBe("existing-access-token");
    expect(getRefreshToken()).toBe("persisted-refresh-token");

    setAuthRuntimeForTesting(runtime);
    await expect(authStore.refreshAuthorizationContext()).resolves.toBe(true);

    expect(authStore.profile?.role).toBe("admin");
    expect(authStore.workspaceMemberships[0]?.workspaceName).toBe("Workspace Alpha");
    expect(authStore.workspaceName).toBe("Workspace Alpha");
    expect(authStore.accessToken).toBe("existing-access-token");
  });

  it("refreshes an expired access token once before retrying authorization reads", async () => {
    setRefreshToken("persisted-refresh-token");
    const authStore = useAuthStore();
    authStore.accessToken = "expired-access-token";
    const runtime = createRuntimeMock();
    const readUser = vi.fn(async (token: string) => {
      if (token === "expired-access-token") {
        throw new ApiError("Expired access token", { status: 401 });
      }
      return runtime.getCurrentUser(token);
    });
    const readMemberships = vi.fn(runtime.listCurrentUserWorkspaces);
    const refreshSession = vi.fn(runtime.refreshSession);
    setAuthRuntimeForTesting({ ...runtime, getCurrentUser: readUser,
      listCurrentUserWorkspaces: readMemberships, refreshSession });

    await expect(authStore.refreshAuthorizationContext()).resolves.toBe(true);

    expect(refreshSession).toHaveBeenCalledExactlyOnceWith("persisted-refresh-token");
    expect(readUser.mock.calls.map(([token]) => token)).toEqual([
      "expired-access-token", "restored-access-token",
    ]);
    expect(readMemberships.mock.calls.map(([token]) => token)).toEqual([
      "expired-access-token", "restored-access-token",
    ]);
    expect(authStore.accessToken).toBe("restored-access-token");
    expect(getRefreshToken()).toBe("restored-refresh-token");
    expect(authStore.profile?.role).toBe("admin");
  });

  it("clears protected data if the authorization retry also returns 401", async () => {
    setRefreshToken("persisted-refresh-token");
    const authStore = useAuthStore();
    authStore.accessToken = "expired-access-token";
    const runtime = createRuntimeMock();
    setAuthRuntimeForTesting(runtime);
    await authStore.refreshAuthorizationContext();
    seedAuthenticatedQueryCache();
    const refreshSession = vi.fn(runtime.refreshSession);
    setAuthRuntimeForTesting({ ...runtime, refreshSession,
      getCurrentUser: async () => {
        throw new ApiError("Membership unavailable", { status: 401 });
      },
    });

    await expect(authStore.refreshAuthorizationContext()).resolves.toBe(true);

    expect(refreshSession).toHaveBeenCalledOnce();
    expect(authStore.profile).toBeNull();
    expect(authStore.workspaceMemberships).toEqual([]);
    expectAuthenticatedQueryCacheCleared();
  });

  it("ignores an older 401 instead of refreshing a newer session", async () => {
    let rejectProfile!: (error: Error) => void;
    const authStore = useAuthStore();
    authStore.accessToken = "old-access-token";
    const runtime = createRuntimeMock();
    const refreshSession = vi.fn(runtime.refreshSession);
    setAuthRuntimeForTesting({ ...runtime, refreshSession,
      getCurrentUser: () => new Promise<UserResponse>((_resolve, reject) => {
        rejectProfile = reject;
      }),
    });
    const older = authStore.refreshAuthorizationContext();
    authStore.accessToken = "new-access-token";
    rejectProfile(new ApiError("Expired old token", { status: 401 }));

    await expect(older).resolves.toBe(false);

    expect(refreshSession).not.toHaveBeenCalled();
    expect(authStore.accessToken).toBe("new-access-token");
  });

  it("clears the session when the expired-token refresh is rejected", async () => {
    setRefreshToken("revoked-refresh-token");
    const authStore = useAuthStore();
    authStore.accessToken = "expired-access-token";
    seedAuthenticatedQueryCache();
    setAuthRuntimeForTesting(createRuntimeMock({
      getCurrentUser: async () => {
        throw new ApiError("Expired access token", { status: 401 });
      },
      refreshSession: async () => {
        throw new ApiError("Revoked session", { status: 401 });
      },
    }));

    await authStore.refreshAuthorizationContext();

    expect(authStore.isAuthenticated).toBe(false);
    expect(authStore.profile).toBeNull();
    expect(authStore.workspaceMemberships).toEqual([]);
    expect(getRefreshToken()).toBeNull();
    expectAuthenticatedQueryCacheCleared();
  });

  it("invalidates an older focus read when a new login establishes its context", async () => {
    let resolveOlder!: (profile: UserResponse) => void;
    const authStore = useAuthStore();
    authStore.accessToken = "access-token";
    const runtime = createRuntimeMock();
    const readUser = vi.fn(runtime.getCurrentUser).mockImplementationOnce(
      () => new Promise<UserResponse>((resolve) => { resolveOlder = resolve; }),
    );
    setAuthRuntimeForTesting({ ...runtime, getCurrentUser: readUser });
    const older = authStore.refreshAuthorizationContext();
    // Reusing the fixture token proves that context versioning, rather than
    // token-string equality alone, protects the newly established profile.
    await authStore.loginWithEmailPassword("admin@example.com", "password123");
    seedAuthenticatedQueryCache();
    resolveOlder({ ...(await runtime.getCurrentUser("access-token")), role: "member" });

    await expect(older).resolves.toBe(false);

    expect(authStore.profile?.role).toBe("admin");
    expect(queryClient.getQueryData(authenticatedQueryCacheProbeKey)).toBe("stale-data");
  });

  it("does not clear a newer session when an older authorization read fails", async () => {
    let rejectProfile!: (error: Error) => void;
    const authStore = useAuthStore();
    authStore.accessToken = "old-access-token";
    setAuthRuntimeForTesting(createRuntimeMock({
      getCurrentUser: () => new Promise<UserResponse>((_resolve, reject) => {
        rejectProfile = reject;
      }),
    }));
    const older = authStore.refreshAuthorizationContext();

    authStore.accessToken = "new-access-token";
    setAuthRuntimeForTesting(createRuntimeMock());
    await authStore.refreshAuthorizationContext();
    seedAuthenticatedQueryCache();
    rejectProfile(new Error("old request failed"));

    await expect(older).resolves.toBe(false);

    expect(authStore.profile?.role).toBe("admin");
    expect(authStore.workspaceMemberships[0]?.workspaceName).toBe("Workspace Alpha");
    expect(authStore.accessToken).toBe("new-access-token");
    expect(queryClient.getQueryData(authenticatedQueryCacheProbeKey)).toBe("stale-data");
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

  it("exchanges a GitHub handoff code and persists the token pair", async () => {
    setAuthRuntimeForTesting(createRuntimeMock());

    const authStore = useAuthStore();

    await authStore.loginWithGithubSession("handoff-code");

    expect(authStore.isAuthenticated).toBe(true);
    expect(authStore.accessToken).toBe("github-access-token");
    expect(getRefreshToken()).toBe("github-refresh-token");
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
    setRefreshToken("persisted-refresh-token");
    authStore.accessToken = "current-access-token";
    seedAuthenticatedQueryCache();
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
      profileReloaded: true,
      profileReloadError: null,
      membershipsReloaded: true,
      reloadError: null,
    });

    expect(authStore.accessToken).toBe("switched-access-token");
    expect(getRefreshToken()).toBe("switched-refresh-token");
    expect(authStore.profile?.role).toBe("pm");
    expect(authStore.workspaceMemberships).toEqual(memberships.items);
    expect(authStore.workspaceName).toBe("Workspace Beta");
    expect(authStore.switchingWorkspaceId).toBeNull();
    expectAuthenticatedQueryCacheCleared();
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
    setRefreshToken("persisted-refresh-token");
    authStore.accessToken = "current-access-token";
    seedAuthenticatedQueryCache();
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
      profileReloaded: true,
      membershipsReloaded: false,
    });

    expect(authStore.accessToken).toBe("switched-access-token");
    expect(getRefreshToken()).toBe("switched-refresh-token");
    expect(authStore.profile?.role).toBe("pm");
    expect(authStore.switchingWorkspaceId).toBeNull();
    expectAuthenticatedQueryCacheCleared();
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
