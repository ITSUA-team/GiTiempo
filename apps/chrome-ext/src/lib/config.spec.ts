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

  it("throws when required production env is missing", () => {
    expect(() => getExtensionConfig({ MODE: "production" })).toThrow(
      "Missing required extension environment variable: VITE_EXTENSION_API_BASE_URL",
    );
  });
});
