import { beforeEach, describe, expect, it, vi } from "vitest";

const signInWithCredential = vi.fn();
const signInWithEmailAndPassword = vi.fn();
const signOut = vi.fn();
const getAuth = vi.fn(() => "firebase-auth-instance");
const initializeApp = vi.fn(() => "firebase-app-instance");
let firebaseConfigured = true;
const googleCredential = vi.fn((_idToken: string | null, accessToken?: string | null) => ({
  accessToken: accessToken ?? null,
  providerId: "google.com",
}));

vi.mock("firebase/app", () => ({
  FirebaseError: class FirebaseError extends Error {
    constructor(code: string, message: string) {
      super(message);
      this.name = code;
    }
  },
  initializeApp,
}));

vi.mock("firebase/auth/web-extension", () => ({
  GoogleAuthProvider: {
    credential: googleCredential,
  },
  getAuth,
  signOut,
  signInWithCredential,
  signInWithEmailAndPassword,
}));

vi.mock("./config", () => ({
  getExtensionConfig: () => ({
    apiBaseUrl: "http://localhost:3000",
    firebase: {
      apiKey: "firebase-api-key",
      authDomain: "gitiempo.firebaseapp.com",
      projectId: "gitiempo",
    },
    googleOAuthClientId: "google-client-id.apps.googleusercontent.com",
    userSpaUrl: "http://localhost:5173/login",
  }),
  hasFirebaseConfig: () => firebaseConfigured,
}));

function setChromeRuntime({
  launchWebAuthFlow,
  manifest,
}: {
  launchWebAuthFlow?: unknown;
  manifest?: Record<string, unknown>;
}) {
  vi.stubGlobal("chrome", {
    identity: {
      getRedirectURL: vi.fn((path?: string) =>
        `https://extension-id.chromiumapp.org/${path ?? ""}`,
      ),
      launchWebAuthFlow,
    },
    runtime: {
      getManifest: vi.fn(
        () =>
          manifest ?? {
            oauth2: { client_id: "google-client-id.apps.googleusercontent.com" },
            permissions: ["identity", "storage"],
          },
      ),
      lastError: undefined,
    },
  });
}

function createIdToken(nonce: string): string {
  const payload = btoa(JSON.stringify({ nonce }))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `header.${payload}.signature`;
}

function stubGoogleRandomValues(): { nonce: string; state: string } {
  const state = "11".repeat(32);
  const nonce = "22".repeat(32);
  vi.spyOn(globalThis.crypto, "getRandomValues")
    .mockImplementationOnce((values) => {
      (values as Uint8Array).fill(0x11);
      return values;
    })
    .mockImplementationOnce((values) => {
      (values as Uint8Array).fill(0x22);
      return values;
    });

  return { nonce, state };
}

describe("extension firebase auth", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    vi.clearAllMocks();
    firebaseConfigured = true;
  });

  it("uses a nonce-bound Google ID token with Firebase and returns both proofs", async () => {
    const { nonce, state } = stubGoogleRandomValues();
    setChromeRuntime({
      launchWebAuthFlow: (details: unknown,
        callback: unknown,
      ) => {
        const authUrl = new URL((details as { url: string }).url);
        expect(authUrl.searchParams.get("response_type")).toBe("token id_token");
        expect(authUrl.searchParams.get("scope")).toContain("openid");
        expect(authUrl.searchParams.get("scope")).toContain("email");
        expect(authUrl.searchParams.get("nonce")).toBe(nonce);
        const respond = callback as Function;

        respond(
          `https://extension-id.chromiumapp.org/oauth2#access_token=google-access-token&id_token=${createIdToken(nonce)}&state=${state}&token_type=Bearer&authuser=0&prompt=select_account&iss=https%3A%2F%2Faccounts.google.com`,
        );
      },
    });
    signInWithCredential.mockResolvedValue({
      user: { getIdToken: vi.fn(async () => "firebase-id-token") },
    });

    const { signInWithGoogle } = await import("./firebase");

    await expect(signInWithGoogle()).resolves.toEqual({
      firebaseIdToken: "firebase-id-token",
      googleIdToken: createIdToken(nonce),
    });
    expect(googleCredential).toHaveBeenCalledWith(
      createIdToken(nonce),
      "google-access-token",
    );
    expect(signInWithCredential).toHaveBeenCalledWith(
      "firebase-auth-instance",
      expect.objectContaining({ accessToken: "google-access-token" }),
    );
  });

  it("fails explicitly when the extension has no identity permission", async () => {
    setChromeRuntime({
      launchWebAuthFlow: vi.fn(),
      manifest: { permissions: ["storage"] },
    });

    const { signInWithGoogle } = await import("./firebase");

    await expect(signInWithGoogle()).rejects.toThrow(
      "Google sign-in is unavailable because the extension manifest is missing the identity permission.",
    );
    expect(signInWithCredential).not.toHaveBeenCalled();
  });

  it("reads the OAuth client from config rather than the manifest", async () => {
    const { nonce, state } = stubGoogleRandomValues();
    setChromeRuntime({
      launchWebAuthFlow: vi.fn(
        (_details: unknown, callback: (responseUrl?: string) => void) => {
          callback(
            `https://extension-id.chromiumapp.org/oauth2#access_token=google-access-token&id_token=${createIdToken(nonce)}&state=${state}`,
          );
        },
      ),
      manifest: { permissions: ["identity", "storage"] },
    });
    signInWithCredential.mockResolvedValue({
      user: { getIdToken: vi.fn().mockResolvedValue("firebase-id-token") },
    });

    const { signInWithGoogle } = await import("./firebase");

    await expect(signInWithGoogle()).resolves.toEqual({
      firebaseIdToken: "firebase-id-token",
      googleIdToken: createIdToken(nonce),
    });
  });

  it.each([
    [
      "a mismatched callback path",
      "callback",
      ({ nonce, state }: { nonce: string; state: string }) =>
        `https://extension-id.chromiumapp.org/unexpected#access_token=access&id_token=${createIdToken(nonce)}&state=${state}`,
    ],
    [
      "a duplicate state",
      "duplicate_parameter",
      ({ nonce, state }: { nonce: string; state: string }) =>
        `https://extension-id.chromiumapp.org/oauth2#access_token=access&id_token=${createIdToken(nonce)}&state=${state}&state=${state}`,
    ],
    [
      "a duplicate ID token",
      "duplicate_parameter",
      ({ nonce, state }: { nonce: string; state: string }) =>
        `https://extension-id.chromiumapp.org/oauth2#access_token=access&id_token=${createIdToken(nonce)}&id_token=${createIdToken(nonce)}&state=${state}`,
    ],
    [
      "a duplicate issuer",
      "duplicate_parameter",
      ({ nonce, state }: { nonce: string; state: string }) =>
        `https://extension-id.chromiumapp.org/oauth2#access_token=access&id_token=${createIdToken(nonce)}&state=${state}&iss=https%3A%2F%2Faccounts.google.com&iss=https%3A%2F%2Faccounts.google.com`,
    ],
    [
      "a mismatched state",
      "state",
      ({ nonce }: { nonce: string; state: string }) =>
        `https://extension-id.chromiumapp.org/oauth2#access_token=access&id_token=${createIdToken(nonce)}&state=wrong-state`,
    ],
    [
      "a missing ID token",
      "missing_credentials",
      ({ state }: { nonce: string; state: string }) =>
        `https://extension-id.chromiumapp.org/oauth2#access_token=access&state=${state}`,
    ],
    [
      "a mismatched nonce",
      "nonce",
      ({ state }: { nonce: string; state: string }) =>
        `https://extension-id.chromiumapp.org/oauth2#access_token=access&id_token=${createIdToken("wrong-nonce")}&state=${state}`,
    ],
    [
      "an unexpected issuer",
      "issuer",
      ({ nonce, state }: { nonce: string; state: string }) =>
        `https://extension-id.chromiumapp.org/oauth2#access_token=access&id_token=${createIdToken(nonce)}&state=${state}&iss=https%3A%2F%2Funexpected.example.com`,
    ],
  ])("rejects %s before Firebase credential exchange", async (_reason, expectedReason, createResponse) => {
    const values = stubGoogleRandomValues();
    setChromeRuntime({
      launchWebAuthFlow: (_details: unknown, callback: (responseUrl?: string) => void) => {
        callback(createResponse(values));
      },
    });

    const { signInWithGoogle } = await import("./firebase");

    await expect(signInWithGoogle()).rejects.toThrow(
      `Google sign-in could not be verified (${expectedReason}). Please try again.`,
    );
    expect(signInWithCredential).not.toHaveBeenCalled();
  });

  it("keeps email sign-in inside the popup-owned auth boundary", async () => {
    signInWithEmailAndPassword.mockResolvedValue({
      user: { getIdToken: vi.fn(async () => "firebase-email-token") },
    });

    const { signInWithEmailPassword } = await import("./firebase");

    await expect(
      signInWithEmailPassword("alexey@example.com", "password123"),
    ).resolves.toBe("firebase-email-token");
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      "firebase-auth-instance",
      "alexey@example.com",
      "password123",
    );
  });

  it("clears Firebase extension persistence", async () => {
    const { signOutFromFirebase } = await import("./firebase");

    await signOutFromFirebase();

    expect(signOut).toHaveBeenCalledWith("firebase-auth-instance");
  });

  it("treats a GitHub-only build without Firebase configuration as already signed out", async () => {
    firebaseConfigured = false;

    const { signOutFromFirebase } = await import("./firebase");

    await expect(signOutFromFirebase()).resolves.toBeUndefined();
    expect(signOut).not.toHaveBeenCalled();
  });
});
