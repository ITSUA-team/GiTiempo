import { describe, expect, it } from "vitest";

import {
  buildGithubSignInStartUrl,
  readGithubSignInResult,
} from "./github-signin";

describe("buildGithubSignInStartUrl", () => {
  it("targets the backend start endpoint as the extension", () => {
    const url = new URL(buildGithubSignInStartUrl("https://api.example.test"));

    expect(url.origin + url.pathname).toBe(
      "https://api.example.test/auth/github/start",
    );
    expect(url.searchParams.get("app")).toBe("extension");
  });

  it("contributes nothing that could steer the destination", () => {
    const url = new URL(buildGithubSignInStartUrl("https://api.example.test"));

    // The destination is resolved by the backend from its own configuration. If
    // the extension could name it, anyone reaching the start endpoint could have
    // a handoff code delivered to a host they control.
    expect([...url.searchParams.keys()]).toEqual(["app"]);
  });
});

describe("readGithubSignInResult", () => {
  const EXT = "https://abcdef.chromiumapp.org/";

  it("returns the handoff code", () => {
    expect(readGithubSignInResult(`${EXT}?code=abc123`)).toBe("abc123");
  });

  it.each([
    ["denied", "declined"],
    ["email", "verified primary email"],
    ["failed", "try again"],
    ["state", "verified"],
  ])("maps the %o indicator to copy naming the cause", (indicator, fragment) => {
    expect(() =>
      readGithubSignInResult(`${EXT}?githubError=${indicator}`),
    ).toThrow(new RegExp(fragment, "i"));
  });

  it("gives each indicator its own message", () => {
    const messages = ["denied", "email", "failed", "state"].map((indicator) => {
      try {
        readGithubSignInResult(`${EXT}?githubError=${indicator}`);
        return "";
      } catch (error) {
        return error instanceof Error ? error.message : "";
      }
    });

    // "Try again" and "your account has no verified email" call for different
    // actions, so collapsing them would hide the only actionable part.
    expect(new Set(messages).size).toBe(messages.length);
  });

  it("treats an unknown indicator as a generic failure rather than success", () => {
    expect(() =>
      readGithubSignInResult(`${EXT}?githubError=something-new`),
    ).toThrow(/could not be completed/i);
  });

  it("rejects a redirect that carries neither a code nor an indicator", () => {
    expect(() => readGithubSignInResult(EXT)).toThrow(/could not be completed/i);
  });

  it("prefers the error indicator over any code present alongside it", () => {
    expect(() =>
      readGithubSignInResult(`${EXT}?githubError=state&code=abc123`),
    ).toThrow();
  });
});
