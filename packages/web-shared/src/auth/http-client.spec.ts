import { describe, expect, it, vi } from "vitest";

import { createAuthHttpClient } from "./http-client";
import { createCurrentUserClient } from "./current-user-client";

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("createAuthHttpClient", () => {
  it("posts Firebase tokens to the login endpoint and parses token pairs", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        accessToken: "access-token",
        accessTokenExpiresIn: 900,
        refreshToken: "refresh-token",
      }),
    );
    const client = createAuthHttpClient({
      apiBaseUrl: "https://api.example.test/",
      fetchFn,
    });

    const tokenPair = await client.loginWithFirebaseToken("firebase-token");

    expect(tokenPair.accessToken).toBe("access-token");
    expect(fetchFn).toHaveBeenCalledWith("https://api.example.test/auth/login", {
      body: JSON.stringify({ firebaseIdToken: "firebase-token" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
  });

  it("posts refresh tokens to the refresh endpoint", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        accessToken: "access-token-next",
        accessTokenExpiresIn: 900,
        refreshToken: "refresh-token-next",
      }),
    );
    const client = createAuthHttpClient({ fetchFn });

    await expect(client.refreshAuthSession("refresh-token")).resolves.toEqual({
      accessToken: "access-token-next",
      accessTokenExpiresIn: 900,
      refreshToken: "refresh-token-next",
    });
    expect(fetchFn).toHaveBeenCalledWith("/auth/refresh", {
      body: JSON.stringify({ refreshToken: "refresh-token" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
  });

  it("posts logout requests with auth headers and payload", async () => {
    const fetchFn = vi.fn(async () => jsonResponse({}));
    const client = createAuthHttpClient({ fetchFn });

    await client.logoutAuthSession("access-token", "refresh-token");

    expect(fetchFn).toHaveBeenCalledWith("/auth/logout", {
      body: JSON.stringify({ refreshToken: "refresh-token" }),
      headers: {
        Authorization: "Bearer access-token",
        "Content-Type": "application/json",
      },
      method: "POST",
    });
  });

  it("throws response error messages for failed auth requests", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({ message: "Invalid credentials" }, { status: 401 }),
    );
    const client = createAuthHttpClient({ fetchFn });

    await expect(client.loginWithFirebaseToken("firebase-token")).rejects.toThrow(
      "Invalid credentials",
    );
  });

  it("propagates fetch boundary failures", async () => {
    const fetchFn = vi.fn(async () => {
      throw new Error("network down");
    });
    const client = createAuthHttpClient({ fetchFn });

    await expect(client.refreshAuthSession("refresh-token")).rejects.toThrow(
      "network down",
    );
  });
});

describe("createCurrentUserClient", () => {
  it("loads the current user with a bearer token and parses the response", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        avatarUrl: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        displayName: "Alexey Tsukanov",
        email: "alexey@example.com",
        id: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
        role: "member",
        updatedAt: "2026-01-01T00:00:00.000Z",
      }),
    );
    const client = createCurrentUserClient({
      apiBaseUrl: "https://api.example.test",
      fetchFn,
    });

    const user = await client.getCurrentUser("access-token");

    expect(user.email).toBe("alexey@example.com");
    expect(fetchFn).toHaveBeenCalledWith("https://api.example.test/users/me", {
      headers: { Authorization: "Bearer access-token" },
    });
  });

  it("throws API messages for current-user failures", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({ error: "Unauthorized" }, { status: 403 }),
    );
    const client = createCurrentUserClient({ fetchFn });

    await expect(client.getCurrentUser("access-token")).rejects.toThrow(
      "Unauthorized",
    );
  });
});
