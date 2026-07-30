import { afterEach, describe, expect, it, vi } from "vitest";

import { launchWebAuthFlow } from "./web-auth-flow";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("launchWebAuthFlow", () => {
  it("rejects rather than throws when the identity API is absent", async () => {
    vi.stubGlobal("chrome", { identity: undefined, runtime: {} });

    // Asserted through .catch() specifically: a synchronous throw from a
    // Promise-returning function escapes it, and this is the one failure that
    // happens before any user interaction, so a caller must not be able to miss
    // it by handling rejections the ordinary way.
    const caught = await launchWebAuthFlow("https://api.test/start", "GitHub")
      .then(() => null)
      .catch((error: unknown) => error);

    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toContain(
      "GitHub sign-in is unavailable because the Chrome identity API is not accessible.",
    );
  });

  it("names the provider in the copy it surfaces", async () => {
    vi.stubGlobal("chrome", { identity: undefined, runtime: {} });

    await expect(
      launchWebAuthFlow("https://api.test/start", "Google"),
    ).rejects.toThrow(/^Google sign-in is unavailable/);
  });

  it("resolves with the URL Chrome intercepted", async () => {
    vi.stubGlobal("chrome", {
      identity: {
        launchWebAuthFlow: vi.fn(
          (_options: unknown, callback: (url?: string) => void) => {
            callback("https://ext.chromiumapp.org/?code=abc");
          },
        ),
      },
      runtime: {},
    });

    await expect(
      launchWebAuthFlow("https://api.test/start", "GitHub"),
    ).resolves.toBe("https://ext.chromiumapp.org/?code=abc");
  });

  it("reports a closed window as a cancelled attempt", async () => {
    vi.stubGlobal("chrome", {
      identity: {
        launchWebAuthFlow: vi.fn(
          (_options: unknown, callback: (url?: string) => void) => {
            callback(undefined);
          },
        ),
      },
      runtime: {},
    });

    await expect(
      launchWebAuthFlow("https://api.test/start", "GitHub"),
    ).rejects.toThrow(/cancelled before completion/);
  });

  it("surfaces a runtime error over the generic interruption copy", async () => {
    vi.stubGlobal("chrome", {
      identity: {
        launchWebAuthFlow: vi.fn(
          (_options: unknown, callback: (url?: string) => void) => {
            callback(undefined);
          },
        ),
      },
      runtime: { lastError: { message: "Authorization page could not be loaded." } },
    });

    // Chrome's own message is more specific than anything this wrapper could
    // invent, so it wins when present.
    await expect(
      launchWebAuthFlow("https://api.test/start", "GitHub"),
    ).rejects.toThrow("Authorization page could not be loaded.");
  });
});
