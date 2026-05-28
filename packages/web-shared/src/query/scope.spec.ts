import { describe, expect, it } from "vitest";

import { readAccessTokenServerStateScope } from "./scope";

describe("query server-state scope", () => {
  it("reads non-secret auth and workspace scope from access-token claims", () => {
    const token = [
      "eyJhbGciOiJIUzI1NiJ9",
      "eyJzdWIiOiJ1c2VyLTEiLCJ3b3Jrc3BhY2VJZCI6IndvcmtzcGFjZS0xIiwicm9sZSI6ImFkbWluIn0",
      "signature",
    ].join(".");

    expect(readAccessTokenServerStateScope(token)).toEqual({
      role: "admin",
      userId: "user-1",
      workspaceId: "workspace-1",
    });
  });

  it("returns null scope when the token payload is unavailable", () => {
    expect(readAccessTokenServerStateScope("opaque-token")).toEqual({
      role: null,
      userId: null,
      workspaceId: null,
    });
  });
});
