import { describe, expect, it } from "vitest";

import { getExtensionConfig } from "./config";

describe("getExtensionConfig", () => {
  it("allows localhost defaults in test mode", () => {
    expect(getExtensionConfig({ MODE: "test" })).toEqual({
      apiBaseUrl: "http://localhost:3000",
      browser: "chrome",
      firebase: {
        apiKey: "test-firebase-api-key",
        authDomain: "test-project.firebaseapp.com",
        projectId: "test-project",
      },
      githubSignInEnabled: true,
      googleOAuthClientId: "test-google-client-id.apps.googleusercontent.com",
      userSpaHomeUrl: "http://localhost:5173",
      userSpaProfileUrl: "http://localhost:5173/profile",
      userSpaUrl: "http://localhost:5173/login",
    });
  });

  it.each([
    "VITE_EXTENSION_API_BASE_URL",
    "VITE_EXTENSION_FIREBASE_API_KEY",
    "VITE_EXTENSION_FIREBASE_AUTH_DOMAIN",
    "VITE_EXTENSION_FIREBASE_PROJECT_ID",
    "VITE_EXTENSION_GOOGLE_CLIENT_ID",
    "VITE_EXTENSION_USER_SPA_URL",
  ])("throws when required production env %s is missing", (missingKey) => {
    const env = {
      MODE: "production",
      VITE_EXTENSION_API_BASE_URL: "https://api.example.com/",
      VITE_EXTENSION_FIREBASE_API_KEY: "firebase-api-key",
      VITE_EXTENSION_FIREBASE_AUTH_DOMAIN: "project.firebaseapp.com",
      VITE_EXTENSION_FIREBASE_PROJECT_ID: "project-id",
      VITE_EXTENSION_GOOGLE_CLIENT_ID: "google-client-id.apps.googleusercontent.com",
      VITE_EXTENSION_USER_SPA_URL: "https://app.example.com/login/",
    } satisfies Record<string, string>;

    delete env[missingKey as keyof typeof env];

    expect(() => getExtensionConfig(env)).toThrow(
      `Missing required extension environment variable: ${missingKey}`,
    );
  });

  it("uses provided production env values", () => {
    expect(
      getExtensionConfig({
        MODE: "production",
        VITE_EXTENSION_API_BASE_URL: "https://api.example.com/",
        VITE_EXTENSION_FIREBASE_API_KEY: "firebase-api-key",
        VITE_EXTENSION_FIREBASE_AUTH_DOMAIN: "project.firebaseapp.com",
        VITE_EXTENSION_FIREBASE_PROJECT_ID: "project-id",
        VITE_EXTENSION_GOOGLE_CLIENT_ID: "google-client-id.apps.googleusercontent.com",
        VITE_EXTENSION_USER_SPA_URL: "https://app.example.com/login/",
      }),
    ).toEqual({
      apiBaseUrl: "https://api.example.com",
      browser: "chrome",
      firebase: {
        apiKey: "firebase-api-key",
        authDomain: "project.firebaseapp.com",
        projectId: "project-id",
      },
      githubSignInEnabled: true,
      googleOAuthClientId: "google-client-id.apps.googleusercontent.com",
      userSpaHomeUrl: "https://app.example.com",
      userSpaProfileUrl: "https://app.example.com/profile",
      userSpaUrl: "https://app.example.com/login",
    });
  });

  describe("userSpaProfileUrl", () => {
    it.each([
      ["http://localhost:5173/login", "http://localhost:5173/profile"],
      ["https://app.example.com/login/", "https://app.example.com/profile"],
      ["https://app.example.com", "https://app.example.com/profile"],
    ])("derives %o into %o", (configured, expected) => {
      const config = getExtensionConfig({
        MODE: "test",
        VITE_EXTENSION_USER_SPA_URL: configured,
      });

      expect(config.userSpaProfileUrl).toBe(expected);
      // Both links the extension renders come off the same origin, so a change to
      // one cannot silently point the other somewhere else.
      expect(config.userSpaProfileUrl.startsWith(config.userSpaHomeUrl)).toBe(true);
    });
  });

  describe("githubSignInEnabled", () => {
    it("is on when the flag is absent", () => {
      expect(
        getExtensionConfig({ MODE: "test" }).githubSignInEnabled,
      ).toBe(true);
    });

    it.each(["false", " false "])("is off for the strict value %o", (value) => {
      expect(
        getExtensionConfig({
          MODE: "test",
          VITE_EXTENSION_GITHUB_SIGNIN_ENABLED: value,
        }).githubSignInEnabled,
      ).toBe(false);
    });

    it.each(["true", "FALSE", "0", "no", ""])(
      "stays on for the non-strict value %o",
      (value) => {
        expect(
          getExtensionConfig({
            MODE: "test",
            VITE_EXTENSION_GITHUB_SIGNIN_ENABLED: value,
          }).githubSignInEnabled,
        ).toBe(true);
      },
    );

    it("leaves the Google and email prerequisites untouched", () => {
      const config = getExtensionConfig({
        MODE: "test",
        VITE_EXTENSION_GITHUB_SIGNIN_ENABLED: "true",
      });

      expect(config.googleOAuthClientId).toBe(
        "test-google-client-id.apps.googleusercontent.com",
      );
      expect(config.firebase).not.toBeNull();
    });
  });
  it("reports the browser the build targeted", () => {
    expect(
      getExtensionConfig({ MODE: "test", VITE_EXTENSION_BROWSER: "firefox" })
        .browser,
    ).toBe("firefox");
    expect(
      getExtensionConfig({ MODE: "test", VITE_EXTENSION_BROWSER: "safari" })
        .browser,
    ).toBe("chrome");
  });
});
