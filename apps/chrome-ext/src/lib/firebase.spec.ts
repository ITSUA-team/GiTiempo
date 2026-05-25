import { beforeEach, describe, expect, it, vi } from "vitest";

const signInWithCredential = vi.fn();
const signInWithEmailAndPassword = vi.fn();
const getAuth = vi.fn(() => "firebase-auth-instance");
const initializeApp = vi.fn(() => "firebase-app-instance");
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

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: {
    credential: googleCredential,
  },
  getAuth,
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
  hasFirebaseConfig: () => true,
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
            permissions: ["identity", "storage", "tabs"],
          },
      ),
      lastError: undefined,
    },
  });
}

describe("extension firebase auth", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("uses launchWebAuthFlow and exchanges the Google access token through Firebase", async () => {
    setChromeRuntime({
      launchWebAuthFlow: (
        _details: unknown,
        callback: unknown,
      ) => {
        const respond = callback as Function;

        respond(
          "https://extension-id.chromiumapp.org/oauth2#access_token=google-access-token&state=11111111-1111-4111-8111-111111111111",
        );
      },
    });
    vi
      .spyOn(globalThis.crypto, "randomUUID")
      .mockReturnValue("11111111-1111-4111-8111-111111111111");
    signInWithCredential.mockResolvedValue({
      user: { getIdToken: vi.fn(async () => "firebase-id-token") },
    });

    const { signInWithGoogle } = await import("./firebase");

    await expect(signInWithGoogle()).resolves.toBe("firebase-id-token");
    expect(googleCredential).toHaveBeenCalledWith(null, "google-access-token");
    expect(signInWithCredential).toHaveBeenCalledWith(
      "firebase-auth-instance",
      expect.objectContaining({ accessToken: "google-access-token" }),
    );
  });

  it("fails explicitly when the manifest does not expose an OAuth client", async () => {
    setChromeRuntime({
      launchWebAuthFlow: vi.fn(),
      manifest: { permissions: ["identity", "storage", "tabs"] },
    });

    const { signInWithGoogle } = await import("./firebase");

    await expect(signInWithGoogle()).rejects.toThrow(
      "Google sign-in is unavailable because the extension OAuth client is not configured.",
    );
    expect(signInWithCredential).not.toHaveBeenCalled();
  });

  it("fails explicitly when the manifest OAuth client drifts from extension config", async () => {
    setChromeRuntime({
      launchWebAuthFlow: vi.fn(),
      manifest: {
        oauth2: { client_id: "different-client-id.apps.googleusercontent.com" },
        permissions: ["identity", "storage", "tabs"],
      },
    });

    const { signInWithGoogle } = await import("./firebase");

    await expect(signInWithGoogle()).rejects.toThrow(
      "Google sign-in is unavailable because the extension OAuth client configuration is inconsistent.",
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
});
