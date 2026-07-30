import { describe, expect, it } from "vitest";

import { decodeAccessTokenEmail } from "./token";

function encodeSegment(value: object): string {
  return btoa(JSON.stringify(value))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function makeToken(payload: object): string {
  return [
    encodeSegment({ alg: "HS256", typ: "JWT" }),
    encodeSegment(payload),
    "signature",
  ].join(".");
}

describe("decodeAccessTokenEmail", () => {
  it("reads the email claim from a valid access token", () => {
    const token = makeToken({ sub: "user-1", email: "alexey@example.com" });

    expect(decodeAccessTokenEmail(token)).toBe("alexey@example.com");
  });

  it("trims surrounding whitespace on the email claim", () => {
    const token = makeToken({ sub: "user-1", email: "  alexey@example.com  " });

    expect(decodeAccessTokenEmail(token)).toBe("alexey@example.com");
  });

  it("returns null when the email claim is missing", () => {
    expect(decodeAccessTokenEmail(makeToken({ sub: "user-1" }))).toBeNull();
  });

  it("returns null for a malformed token", () => {
    expect(decodeAccessTokenEmail("not-a-jwt")).toBeNull();
    expect(decodeAccessTokenEmail("")).toBeNull();
    expect(decodeAccessTokenEmail("header..signature")).toBeNull();
  });
});
