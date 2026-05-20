import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Auth } from "firebase/auth";

import {
  createAuthRuntimeController,
  createDefaultAuthRuntime,
  type AuthRuntime,
} from "./runtime";

const firebaseMocks = vi.hoisted(() => ({
  createUserWithEmailAndPassword: vi.fn(),
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
  createUserWithEmailAndPassword: firebaseMocks.createUserWithEmailAndPassword,
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
      refreshAuthSession: async () => ({
        accessToken: "access-token-next",
        accessTokenExpiresIn: 900,
        refreshToken: "refresh-token-next",
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

  it("creates an email/password account and returns the Firebase ID token", async () => {
    firebaseMocks.createUserWithEmailAndPassword.mockResolvedValueOnce({
      user: { getIdToken: async () => "created-account-id-token" },
    });
    const runtime = createRuntime();

    await expect(
      runtime.createAccountWithEmailPassword("alexey@example.com", "password123"),
    ).resolves.toBe("created-account-id-token");
    expect(firebaseMocks.createUserWithEmailAndPassword).toHaveBeenCalledWith(
      {},
      "alexey@example.com",
      "password123",
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
