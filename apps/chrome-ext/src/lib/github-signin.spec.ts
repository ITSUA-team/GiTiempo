import { describe, expect, it } from "vitest";

import {
  buildGithubSignInStartUrl,
  createVerifier,
  deriveChallenge,
  readGithubSignInResult,
} from "./github-signin";

const CHALLENGE = "a".repeat(64);

describe("buildGithubSignInStartUrl", () => {
  it("targets the backend start endpoint as the extension, carrying the challenge", () => {
    const url = new URL(
      buildGithubSignInStartUrl("https://api.example.test", CHALLENGE, "chrome"),
    );

    expect(url.origin + url.pathname).toBe(
      "https://api.example.test/auth/github/start",
    );
    expect(url.searchParams.get("app")).toBe("extension");
    expect(url.searchParams.get("challenge")).toBe(CHALLENGE);
  });

  it("contributes nothing that could steer the destination", () => {
    const url = new URL(
      buildGithubSignInStartUrl("https://api.example.test", CHALLENGE, "chrome"),
    );

    // The destination is resolved by the backend from its own configuration. If
    // the extension could name it, anyone reaching the start endpoint could have
    // a handoff code delivered to a host they control.
    expect([...url.searchParams.keys()].sort()).toEqual([
      "app",
      "browser",
      "challenge",
    ]);
    expect(url.searchParams.get("browser")).toBe("chrome");
    for (const value of url.searchParams.values()) {
      expect(value).not.toMatch(/^[a-z]+:|\/\//);
    }
  });
});

describe("proof of possession", () => {
  it("mints a fresh 64-char hex verifier each time", () => {
    const first = createVerifier();
    const second = createVerifier();

    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(second).not.toBe(first);
  });

  it("derives the challenge as the hex SHA-256 of the verifier", async () => {
    // The backend recomputes exactly this and compares in constant time, so the
    // encoding has to match on both sides.
    expect(await deriveChallenge("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(await deriveChallenge(createVerifier())).toMatch(/^[0-9a-f]{64}$/);
  });

  it("keeps the verifier out of the URL the browser sees", async () => {
    const verifier = createVerifier();
    const url = buildGithubSignInStartUrl(
      "https://api.example.test",
      await deriveChallenge(verifier),
      "chrome",
    );

    expect(url).not.toContain(verifier);
  });
});

describe("readGithubSignInResult", () => {
  const EXT = "https://abcdef.chromiumapp.org/";

  it("returns the handoff code", () => {
    expect(readGithubSignInResult(`${EXT}?code=abc123`)).toBe("abc123");
  });

  it.each([
    ["ambiguous", "more than one GiTiempo account"],
    ["denied", "declined"],
    ["email", "verified email"],
    ["failed", "try again"],
    ["nomember", "github.com/settings/emails"],
    ["state", "verified"],
  ])("maps the %o indicator to copy naming the cause", (indicator, fragment) => {
    expect(() =>
      readGithubSignInResult(`${EXT}?githubError=${indicator}`),
    ).toThrow(new RegExp(fragment, "i"));
  });

  it("gives each indicator its own message", () => {
    const messages = [
      "ambiguous",
      "denied",
      "email",
      "failed",
      "nomember",
      "state",
    ].map((indicator) => {
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
