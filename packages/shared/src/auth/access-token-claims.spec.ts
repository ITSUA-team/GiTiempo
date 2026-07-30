import { describe, expect, it } from "vitest";

import {
  readAccessTokenPayload,
  readAccessTokenStringClaim,
} from "./access-token-claims.js";

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

describe("readAccessTokenPayload", () => {
  it("decodes the payload segment of a valid token", () => {
    const token = makeToken({ sub: "user-1", email: "alexey@example.com" });

    expect(readAccessTokenPayload(token)).toMatchObject({
      sub: "user-1",
      email: "alexey@example.com",
    });
  });

  it("decodes payloads whose base64url length needs padding", () => {
    for (const email of ["a@b.co", "ab@b.co", "abc@b.co", "abcd@b.co"]) {
      expect(readAccessTokenPayload(makeToken({ email }))).toMatchObject({
        email,
      });
    }
  });

  it("returns null for absent or malformed tokens", () => {
    expect(readAccessTokenPayload(null)).toBeNull();
    expect(readAccessTokenPayload(undefined)).toBeNull();
    expect(readAccessTokenPayload("")).toBeNull();
    expect(readAccessTokenPayload("opaque-token")).toBeNull();
    expect(readAccessTokenPayload("header..signature")).toBeNull();
  });

  it("returns null when the payload is not a JSON object", () => {
    expect(
      readAccessTokenPayload(`header.${encodeSegment("plain-string" as never)}.signature`),
    ).toBeNull();
  });
});

describe("readAccessTokenStringClaim", () => {
  it("reads and trims a string claim", () => {
    expect(readAccessTokenStringClaim({ email: "  a@b.co  " }, "email")).toBe(
      "a@b.co",
    );
  });

  it("returns null for missing, blank, or non-string claims", () => {
    expect(readAccessTokenStringClaim({}, "email")).toBeNull();
    expect(readAccessTokenStringClaim({ email: "   " }, "email")).toBeNull();
    expect(readAccessTokenStringClaim({ email: 42 }, "email")).toBeNull();
  });
});
