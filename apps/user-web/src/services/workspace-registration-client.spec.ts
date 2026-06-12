import { describe, expect, it, vi } from "vitest";

import { createWorkspaceRegistrationClient } from "./workspace-registration-client";

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("createWorkspaceRegistrationClient", () => {
  it("posts the shared registration payload and parses a token pair", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        accessToken: "access-token",
        accessTokenExpiresIn: 900,
        refreshToken: "refresh-token",
      }),
    );
    const client = createWorkspaceRegistrationClient({
      apiBaseUrl: "https://api.example.test/",
      fetchFn,
    });

    const tokenPair = await client.register({
      email: "owner@example.com",
      fullName: "Owner Name",
      ownerAcknowledgement: true,
      password: "password123",
      workspaceName: "Workspace Alpha",
    });

    expect(tokenPair.accessToken).toBe("access-token");
    expect(fetchFn).toHaveBeenCalledWith(
      "https://api.example.test/auth/register",
      {
        body: JSON.stringify({
          email: "owner@example.com",
          fullName: "Owner Name",
          workspaceName: "Workspace Alpha",
          password: "password123",
          ownerAcknowledgement: true,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      },
    );
  });

  it("surfaces backend registration errors", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse(
        {
          code: "workspace_name_unavailable",
          message: "Workspace name is already in use",
        },
        { status: 409 },
      ),
    );
    const client = createWorkspaceRegistrationClient({ fetchFn });

    await expect(
      client.register({
        email: "owner@example.com",
        fullName: "Owner Name",
        ownerAcknowledgement: true,
        password: "password123",
        workspaceName: "Workspace Alpha",
      }),
    ).rejects.toMatchObject({
      code: "workspace_name_unavailable",
      message: "Workspace name is already in use",
    });
  });
});
