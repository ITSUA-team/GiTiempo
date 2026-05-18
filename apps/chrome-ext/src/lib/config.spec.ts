import { describe, expect, it } from "vitest";

import { getExtensionConfig } from "./config";

describe("getExtensionConfig", () => {
  it("allows localhost defaults in test mode", () => {
    expect(getExtensionConfig({ MODE: "test" })).toEqual({
      apiBaseUrl: "http://localhost:3000",
      firebase: {
        apiKey: "test-firebase-api-key",
        authDomain: "test-project.firebaseapp.com",
        projectId: "test-project",
      },
      userSpaUrl: "http://localhost:5173/login",
    });
  });

  it.each([
    "VITE_EXTENSION_API_BASE_URL",
    "VITE_EXTENSION_FIREBASE_API_KEY",
    "VITE_EXTENSION_FIREBASE_AUTH_DOMAIN",
    "VITE_EXTENSION_FIREBASE_PROJECT_ID",
    "VITE_EXTENSION_USER_SPA_URL",
  ])("throws when required production env %s is missing", (missingKey) => {
    const env = {
      MODE: "production",
      VITE_EXTENSION_API_BASE_URL: "https://api.example.com/",
      VITE_EXTENSION_FIREBASE_API_KEY: "firebase-api-key",
      VITE_EXTENSION_FIREBASE_AUTH_DOMAIN: "project.firebaseapp.com",
      VITE_EXTENSION_FIREBASE_PROJECT_ID: "project-id",
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
        VITE_EXTENSION_USER_SPA_URL: "https://app.example.com/login/",
      }),
    ).toEqual({
      apiBaseUrl: "https://api.example.com",
      firebase: {
        apiKey: "firebase-api-key",
        authDomain: "project.firebaseapp.com",
        projectId: "project-id",
      },
      userSpaUrl: "https://app.example.com/login",
    });
  });
});
