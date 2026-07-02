import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Auth } from "firebase/auth";

import {
  createAuthRuntimeController,
  createDefaultAuthRuntime,
  type AuthRuntime,
} from "./runtime";

const firebaseMocks = vi.hoisted(() => ({
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: class GoogleAuthProvider {
    scopes: string[] = [];

    addScope(scope: string): void {
      this.scopes.push(scope);
    }
  },
  signInWithEmailAndPassword: firebaseMocks.signInWithEmailAndPassword,
  signInWithPopup: firebaseMocks.signInWithPopup,
  signOut: firebaseMocks.signOut,
}));

function createRuntime(overrides?: {
  hasFirebaseConfig?: boolean;
}): AuthRuntime {
  return createDefaultAuthRuntime({
    authClient: {
      loginWithFirebaseToken: async () => ({
        accessToken: "access-token",
        accessTokenExpiresIn: 900,
        refreshToken: "refresh-token",
      }),
      logoutAuthSession: async () => undefined,
      registerWorkspaceOwner: async () => ({
        accessToken: "registered-access-token",
        accessTokenExpiresIn: 900,
        refreshToken: "registered-refresh-token",
      }),
      refreshAuthSession: async () => ({
        accessToken: "access-token-next",
        accessTokenExpiresIn: 900,
        refreshToken: "refresh-token-next",
      }),
      switchWorkspace: async () => ({
        accessToken: "switched-access-token",
        accessTokenExpiresIn: 900,
        refreshToken: "switched-refresh-token",
      }),
    },
    currentUserClient: {
      getCurrentUser: async () => ({
        avatarUrl: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        displayName: "Alexey Tsukanov",
        email: "alexey@example.com",
        id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
        role: "member",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
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
      updateCurrentUser: async () => ({
        avatarUrl: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        displayName: "Alexey Tsukanov",
        email: "alexey@example.com",
        id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
        role: "member",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
    },
    getFirebaseAuth: () => ({}) as Auth,
    hasFirebaseConfig: () => overrides?.hasFirebaseConfig ?? true,
  });
}

describe("createDefaultAuthRuntime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("signs in with email and password and returns the Firebase ID token", async () => {
    firebaseMocks.signInWithEmailAndPassword.mockResolvedValueOnce({
      user: { getIdToken: async () => "email-id-token" },
    });
    const runtime = createRuntime();

    await expect(
      runtime.signInWithEmailPassword("alexey@example.com", "password"),
    ).resolves.toBe("email-id-token");
    expect(firebaseMocks.signInWithEmailAndPassword).toHaveBeenCalledWith(
      {},
      "alexey@example.com",
      "password",
    );
  });

  it("signs in with Google and returns the Firebase ID token", async () => {
    firebaseMocks.signInWithPopup.mockResolvedValueOnce({
      user: { getIdToken: async () => "google-id-token" },
    });
    const runtime = createRuntime();

    await expect(runtime.signInWithGoogle()).resolves.toBe("google-id-token");
    expect(firebaseMocks.signInWithPopup).toHaveBeenCalledOnce();
  });

  it("delegates workspace registration through the shared auth client", async () => {
    const runtime = createRuntime();

    await expect(
      runtime.registerWorkspaceOwner({
        email: "owner@example.com",
        fullName: "Owner Name",
        ownerAcknowledgement: true,
        password: "password123",
        workspaceName: "Workspace Alpha",
      }),
    ).resolves.toEqual({
      accessToken: "registered-access-token",
      accessTokenExpiresIn: 900,
      refreshToken: "registered-refresh-token",
    });
  });

  it("delegates workspace membership loading through the shared current-user client", async () => {
    const runtime = createRuntime();

    await expect(runtime.listCurrentUserWorkspaces("access-token")).resolves.toEqual({
      items: [
        {
          workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
          workspaceName: "GiTiempo Studio",
          role: "member",
          isCurrent: true,
        },
      ],
    });
  });

  it("delegates workspace switching through the shared auth client", async () => {
    const runtime = createRuntime();

    await expect(
      runtime.switchWorkspace(
        "access-token",
        "refresh-token",
        "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002",
      ),
    ).resolves.toEqual({
      accessToken: "switched-access-token",
      accessTokenExpiresIn: 900,
      refreshToken: "switched-refresh-token",
    });
  });

  it("signs out of the identity provider when Firebase is configured", async () => {
    const runtime = createRuntime();

    await runtime.signOutIdentityProvider();

    expect(firebaseMocks.signOut).toHaveBeenCalledWith({});
  });

  it("skips identity-provider sign-out when Firebase is not configured", async () => {
    const runtime = createRuntime({ hasFirebaseConfig: false });

    await runtime.signOutIdentityProvider();

    expect(firebaseMocks.signOut).not.toHaveBeenCalled();
  });

  it("allows auth runtime override and reset for tests", () => {
    const defaultRuntime = createRuntime();
    const overrideRuntime = createRuntime({ hasFirebaseConfig: false });
    const controller = createAuthRuntimeController(defaultRuntime);

    controller.setAuthRuntimeForTesting(overrideRuntime);
    expect(controller.getAuthRuntime()).toBe(overrideRuntime);

    controller.resetAuthRuntimeForTesting();
    expect(controller.getAuthRuntime()).toBe(defaultRuntime);
  });
});
