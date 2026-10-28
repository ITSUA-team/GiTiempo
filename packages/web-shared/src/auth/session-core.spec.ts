import type { TokenPairResponse, UserResponse } from "@gitiempo/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearRefreshToken,
  getRefreshToken,
  setRefreshToken,
} from "../session-storage";
import { createAuthSessionCore } from "./session-core";
import { SessionContextChangedError } from "./session-context-changed-error";
import type { AuthRuntime } from "./runtime";

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
    listCurrentUserWorkspaces: async () => ({
      items: [
        {
          workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
          workspaceName: "GiTiempo Studio",
          role: "member",
          isCurrent: true,
        },
      ],
    }),
    loginWithFirebaseToken: async () => ({
      accessToken: "access-token",
      accessTokenExpiresIn: 900,
      refreshToken: "refresh-token-next",
    }),
    exchangeGithubSession: async () => ({
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

const oldPair: TokenPairResponse = {
  accessToken: "old-access",
  refreshToken: "old-refresh",
  accessTokenExpiresIn: 900,
};
const newPair: TokenPairResponse = {
  accessToken: "new-access",
  refreshToken: "new-refresh",
  accessTokenExpiresIn: 900,
};

describe("createAuthSessionCore", () => {
  beforeEach(() => {
    clearRefreshToken();
  });

  it.each(["logout", "login", "workspace"] as const)(
    "rejects an old refresh after %s without replacing the current session",
    async (transition) => {
      const pending = deferred<TokenPairResponse>();
      const runtime = createRuntimeMock({ refreshSession: () => pending.promise });
      const session = createAuthSessionCore({ getAuthRuntime: () => runtime });
      await session.establishSessionFromTokenPair(oldPair);
      const refresh = session.refreshAccessToken();
      const rejected = expect(refresh).rejects.toBeInstanceOf(SessionContextChangedError);
      if (transition === "logout") await session.logout();
      if (transition === "login") await session.establishSessionFromTokenPair(newPair);
      if (transition === "workspace") await session.switchWorkspace("other-workspace");
      const expectedAccess = session.accessToken.value;
      const expectedRefresh = getRefreshToken();
      const expectedProfile = session.profile.value;
      pending.resolve({ ...oldPair, accessToken: "late-access", refreshToken: "late-refresh" });
      await rejected;
      expect(session.accessToken.value).toBe(expectedAccess);
      expect(getRefreshToken()).toBe(expectedRefresh);
      expect(session.profile.value).toBe(expectedProfile);
      if (transition === "logout") expect(session.isAuthenticated.value).toBe(false);
    },
  );

  it.each(["logout", "login", "workspace"] as const)(
    "does not clear the current session when an old refresh fails after %s",
    async (transition) => {
      const pending = deferred<TokenPairResponse>();
      const session = createAuthSessionCore({
        getAuthRuntime: () => createRuntimeMock({ refreshSession: () => pending.promise }),
      });
      await session.establishSessionFromTokenPair(oldPair);
      const rejected = expect(session.refreshAccessToken()).rejects.toBeInstanceOf(SessionContextChangedError);
      if (transition === "logout") await session.logout();
      if (transition === "login") await session.establishSessionFromTokenPair(newPair);
      if (transition === "workspace") await session.switchWorkspace("other-workspace");
      const expectedAccess = session.accessToken.value;
      const expectedRefresh = getRefreshToken();
      const expectedProfile = session.profile.value;
      pending.reject(new Error("old refresh revoked"));
      await rejected;
      expect(session.accessToken.value).toBe(expectedAccess);
      expect(getRefreshToken()).toBe(expectedRefresh);
      expect(session.profile.value).toBe(expectedProfile);
    },
  );

  it.each(["success", "failure"] as const)(
    "preserves a new login when the previous bootstrap completes with %s",
    async (outcome) => {
      setRefreshToken(oldPair.refreshToken);
      const pending = deferred<TokenPairResponse>();
      const session = createAuthSessionCore({
        getAuthRuntime: () => createRuntimeMock({ refreshSession: () => pending.promise }),
      });
      const bootstrap = session.bootstrapSession();
      await session.establishSessionFromTokenPair(newPair);
      if (outcome === "success") pending.resolve(oldPair);
      else pending.reject(new Error("old bootstrap revoked"));
      await bootstrap;
      expect(session.accessToken.value).toBe(newPair.accessToken);
      expect(getRefreshToken()).toBe(newPair.refreshToken);
      expect(session.profile.value?.email).toBe("alexey@example.com");
    },
  );

  it("clears locally before waiting for the logout endpoint", async () => {
    const pendingLogout = deferred<void>();
    const pendingRefresh = deferred<TokenPairResponse>();
    const session = createAuthSessionCore({ getAuthRuntime: () => createRuntimeMock({
      logoutSession: () => pendingLogout.promise,
      refreshSession: () => pendingRefresh.promise,
    }) });
    await session.establishSessionFromTokenPair(oldPair);
    const rejected = expect(session.refreshAccessToken()).rejects.toBeInstanceOf(SessionContextChangedError);
    const logout = session.logout();
    expect(session.accessToken.value).toBeNull();
    pendingRefresh.resolve(oldPair);
    await rejected;
    expect(getRefreshToken()).toBeNull();
    pendingLogout.resolve();
    await logout;
  });

  it("does not sign out a new identity when an earlier logout finishes", async () => {
    const pendingLogout = deferred<void>();
    const signOutIdentityProvider = vi.fn(async () => undefined);
    const session = createAuthSessionCore({ getAuthRuntime: () => createRuntimeMock({
      logoutSession: () => pendingLogout.promise,
      signOutIdentityProvider,
    }) });
    await session.establishSessionFromTokenPair(oldPair);
    const logout = session.logout();
    await session.loginWithFirebaseToken("new-firebase-login");
    pendingLogout.resolve();
    await logout;
    expect(signOutIdentityProvider).not.toHaveBeenCalled();
    expect(session.accessToken.value).toBe("access-token");
    expect(getRefreshToken()).toBe("refresh-token-next");
  });

  it("does not restore an old profile after a new login", async () => {
    const pendingProfile = deferred<UserResponse>();
    const runtime = createRuntimeMock();
    const currentUser = await runtime.getCurrentUser("fixture");
    runtime.getCurrentUser = vi.fn()
      .mockReturnValueOnce(pendingProfile.promise)
      .mockResolvedValue({ ...currentUser, id: "new-user", email: "new@example.com" });
    const session = createAuthSessionCore({ getAuthRuntime: () => runtime });
    const rejected = expect(session.establishSessionFromTokenPair(oldPair)).rejects.toBeInstanceOf(SessionContextChangedError);
    await session.establishSessionFromTokenPair(newPair);
    pendingProfile.resolve(currentUser);
    await rejected;
    expect(session.profile.value?.email).toBe("new@example.com");
    expect(session.accessToken.value).toBe(newPair.accessToken);
  });

  it("restores and rotates a persisted refresh token", async () => {
    setRefreshToken("persisted-refresh-token");
    const runtime = createRuntimeMock();
    const session = createAuthSessionCore({ getAuthRuntime: () => runtime });

    await session.bootstrapSession();

    expect(session.isAuthenticated.value).toBe(true);
    expect(session.accessToken.value).toBe("restored-access-token");
    expect(getRefreshToken()).toBe("restored-refresh-token");
    expect(session.profile.value?.email).toBe("alexey@example.com");
  });

  it("clears stale state on login failure", async () => {
    setRefreshToken("stale-refresh-token");
    const runtime = createRuntimeMock({
      loginWithFirebaseToken: async () => {
        throw new Error("login exchange failed");
      },
    });
    const session = createAuthSessionCore({ getAuthRuntime: () => runtime });

    session.accessToken.value = "stale-access-token";
    session.profile.value = {
      avatarUrl: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      displayName: "Stale User",
      email: "stale@example.com",
      id: "stale-user-id",
      role: "member",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    await expect(
      session.loginWithEmailPassword("alex@example.com", "password123"),
    ).rejects.toThrow("login exchange failed");

    expect(session.isAuthenticated.value).toBe(false);
    expect(session.accessToken.value).toBeNull();
    expect(session.profile.value).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(session.bootstrapComplete.value).toBe(true);
    expect(session.isSubmitting.value).toBe(false);
  });

  it("exchanges a GitHub handoff code into an app session", async () => {
    const runtime = createRuntimeMock();
    const session = createAuthSessionCore({ getAuthRuntime: () => runtime });

    await session.loginWithGithubSession("handoff-code");

    expect(session.isAuthenticated.value).toBe(true);
    expect(session.profile.value?.email).toBe("alexey@example.com");
    expect(session.isSubmitting.value).toBe(false);
  });

  it("boots a provisioned admin session from a Google token exchange", async () => {
    const provisionedAdmin = {
      avatarUrl: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      displayName: "Workspace Admin",
      email: "admin@example.com",
      id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
      role: "admin" as const,
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const runtime = createRuntimeMock({
      getCurrentUser: async () => provisionedAdmin,
      loginWithFirebaseToken: async () => ({
        accessToken: "provisioned-google-access-token",
        accessTokenExpiresIn: 900,
        refreshToken: "provisioned-google-refresh-token",
      }),
    });
    const session = createAuthSessionCore({ getAuthRuntime: () => runtime });

    await session.loginWithGoogle();

    expect(session.isAuthenticated.value).toBe(true);
    expect(session.profile.value).toEqual(provisionedAdmin);
    expect(getRefreshToken()).toBe("provisioned-google-refresh-token");
  });

  it("forwards a Google provider ID token only from the Google sign-in result", async () => {
    const loginWithFirebaseToken = vi.fn(async () => newPair);
    const runtime = createRuntimeMock({
      loginWithFirebaseToken,
      signInWithGoogle: async () => ({
        firebaseIdToken: "firebase-google-token",
        googleIdToken: "google-provider-id-token",
      }),
    });
    const session = createAuthSessionCore({ getAuthRuntime: () => runtime });

    await session.loginWithGoogle();

    expect(loginWithFirebaseToken).toHaveBeenCalledWith(
      "firebase-google-token",
      "google-provider-id-token",
    );
  });

  it.each([
    ["Google", (session: ReturnType<typeof createAuthSessionCore>) => session.loginWithGoogle()],
    ["GitHub", (session: ReturnType<typeof createAuthSessionCore>) => session.loginWithGithubSession("handoff-code")],
  ])("clears guest state when the %s exchange fails", async (_provider, login) => {
    setRefreshToken("stale-refresh-token");
    const session = createAuthSessionCore({
      getAuthRuntime: () =>
        createRuntimeMock({
          loginWithFirebaseToken: async () => {
            throw new Error("exchange failed");
          },
          exchangeGithubSession: async () => {
            throw new Error("exchange failed");
          },
        }),
    });
    session.accessToken.value = "stale-access-token";

    await expect(login(session)).rejects.toThrow("exchange failed");

    expect(session.accessToken.value).toBeNull();
    expect(session.profile.value).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(session.bootstrapComplete.value).toBe(true);
  });

  it("runs session-context cleanup when a new app session starts", async () => {
    let cleanupCalls = 0;
    const runtime = createRuntimeMock();
    const session = createAuthSessionCore({
      getAuthRuntime: () => runtime,
      onSessionContextChanged: () => {
        cleanupCalls += 1;
      },
    });

    await session.loginWithEmailPassword("alex@example.com", "password123");

    expect(cleanupCalls).toBe(1);
    expect(session.accessToken.value).toBe("access-token");
  });

  it("establishes a session directly from an approved token pair", async () => {
    let cleanupCalls = 0;
    const runtime = createRuntimeMock();
    const session = createAuthSessionCore({
      getAuthRuntime: () => runtime,
      onSessionContextChanged: () => {
        cleanupCalls += 1;
      },
    });

    await session.establishSessionFromTokenPair({
      accessToken: "registered-access-token",
      accessTokenExpiresIn: 900,
      refreshToken: "registered-refresh-token",
    });

    expect(cleanupCalls).toBe(1);
    expect(session.isAuthenticated.value).toBe(true);
    expect(session.accessToken.value).toBe("registered-access-token");
    expect(getRefreshToken()).toBe("registered-refresh-token");
    expect(session.profile.value?.email).toBe("alexey@example.com");
    expect(session.bootstrapComplete.value).toBe(true);
    expect(session.isSubmitting.value).toBe(false);
  });

  it("clears API and identity sessions on logout", async () => {
    let logoutCalls = 0;
    let identitySignOutCalls = 0;
    let clearCalls = 0;
    setRefreshToken("persisted-refresh-token");
    const runtime = createRuntimeMock({
      logoutSession: async () => {
        logoutCalls += 1;
      },
      signOutIdentityProvider: async () => {
        identitySignOutCalls += 1;
      },
    });
    const session = createAuthSessionCore({
      getAuthRuntime: () => runtime,
      onClearSession: () => {
        clearCalls += 1;
      },
    });

    session.accessToken.value = "current-access-token";

    await session.logout();

    expect(logoutCalls).toBe(1);
    expect(identitySignOutCalls).toBe(1);
    expect(clearCalls).toBe(1);
    expect(session.isAuthenticated.value).toBe(false);
    expect(session.profile.value).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it("refreshes access tokens with single-flight rotation", async () => {
    setRefreshToken("persisted-refresh-token");
    let resolveRefresh!: (_value: {
      accessToken: string;
      accessTokenExpiresIn: number;
      refreshToken: string;
    }) => void;
    const refreshSession = vi.fn(
      () =>
        new Promise<{
          accessToken: string;
          accessTokenExpiresIn: number;
          refreshToken: string;
        }>((resolve) => {
          resolveRefresh = resolve;
        }),
    );
    const session = createAuthSessionCore({
      getAuthRuntime: () => createRuntimeMock({ refreshSession }),
    });
    const first = session.refreshAccessToken();
    const second = session.refreshAccessToken();

    resolveRefresh({
      accessToken: "next-access-token",
      accessTokenExpiresIn: 900,
      refreshToken: "next-refresh-token",
    });

    await expect(Promise.all([first, second])).resolves.toEqual([
      "next-access-token",
      "next-access-token",
    ]);
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(session.accessToken.value).toBe("next-access-token");
    expect(getRefreshToken()).toBe("next-refresh-token");
  });

  it("clears the local session when access-token refresh fails", async () => {
    setRefreshToken("persisted-refresh-token");
    const session = createAuthSessionCore({
      getAuthRuntime: () =>
        createRuntimeMock({
          refreshSession: async () => {
            throw new Error("refresh failed");
          },
        }),
    });

    session.accessToken.value = "stale-access-token";

    await expect(session.refreshAccessToken()).rejects.toThrow("refresh failed");
    expect(session.accessToken.value).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(session.bootstrapComplete.value).toBe(true);
  });

  it("replaces the token pair after a successful workspace switch", async () => {
    setRefreshToken("persisted-refresh-token");
    const switchWorkspace = vi.fn(async () => ({
      accessToken: "switched-access-token",
      accessTokenExpiresIn: 900,
      refreshToken: "switched-refresh-token",
    }));
    const session = createAuthSessionCore({
      getAuthRuntime: () => createRuntimeMock({ switchWorkspace }),
    });

    session.accessToken.value = "current-access-token";

    await expect(
      session.switchWorkspace("018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002"),
    ).resolves.toEqual({
      profileReloaded: true,
      profileReloadError: null,
    });

    expect(switchWorkspace).toHaveBeenCalledWith(
      "current-access-token",
      "persisted-refresh-token",
      "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002",
    );
    expect(session.accessToken.value).toBe("switched-access-token");
    expect(getRefreshToken()).toBe("switched-refresh-token");
    expect(session.profile.value?.email).toBe("alexey@example.com");
  });

  it("keeps the switched session and clears stale profile when profile reload fails", async () => {
    setRefreshToken("persisted-refresh-token");
    const session = createAuthSessionCore({
      getAuthRuntime: () =>
        createRuntimeMock({
          getCurrentUser: async () => {
            throw new Error("profile reload failed");
          },
        }),
    });

    session.accessToken.value = "current-access-token";
    session.profile.value = {
      avatarUrl: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      displayName: "Current User",
      email: "current@example.com",
      id: "current-user-id",
      role: "member",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    await expect(
      session.switchWorkspace("018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002"),
    ).resolves.toMatchObject({
      profileReloaded: false,
    });

    expect(session.accessToken.value).toBe("switched-access-token");
    expect(getRefreshToken()).toBe("switched-refresh-token");
    expect(session.profile.value).toBeNull();
    expect(session.bootstrapComplete.value).toBe(true);
  });

  it("preserves the current session when workspace switching fails", async () => {
    setRefreshToken("persisted-refresh-token");
    const session = createAuthSessionCore({
      getAuthRuntime: () =>
        createRuntimeMock({
          switchWorkspace: async () => {
            throw new Error("switch failed");
          },
        }),
    });

    session.accessToken.value = "current-access-token";
    session.profile.value = {
      avatarUrl: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      displayName: "Current User",
      email: "current@example.com",
      id: "current-user-id",
      role: "member",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    await expect(
      session.switchWorkspace("018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002"),
    ).rejects.toThrow("switch failed");

    expect(session.accessToken.value).toBe("current-access-token");
    expect(getRefreshToken()).toBe("persisted-refresh-token");
    expect(session.profile.value?.email).toBe("current@example.com");
  });
});
