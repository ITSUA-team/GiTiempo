import type { UserResponse } from "@gitiempo/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearRefreshToken,
  getRefreshToken,
  setRefreshToken,
} from "../session-storage";
import { createAuthSessionCore } from "./session-core";
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
      updatedAt: "2026-01-02T00:00:00.000Z",
    }),
    ...overrides,
  };
}

describe("createAuthSessionCore", () => {
  beforeEach(() => {
    clearRefreshToken();
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
    // eslint-disable-next-line no-unused-vars
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
});
