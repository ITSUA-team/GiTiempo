import { describe, expect, it, vi } from "vitest";

import { createWorkspaceInvitesClient } from "./workspace-invites-client";

function jsonResponse(body: unknown, init: { status?: number } = {}): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function noContentResponse(init: { status?: number } = {}): Response {
  return new Response(null, {
    status: 204,
    ...init,
  });
}

describe("createWorkspaceInvitesClient", () => {
  it("posts the invite token and firebase token to the accept endpoint", async () => {
    const fetchFn = vi.fn(async () => noContentResponse());
    const client = createWorkspaceInvitesClient({
      apiBaseUrl: "https://api.example.test/",
      fetchFn,
    });

    await client.acceptInvite({
      firebaseIdToken: "firebase-id-token",
      token: "invite-token",
    });

    expect(fetchFn).toHaveBeenCalledWith(
      "https://api.example.test/invites/accept",
      {
        body: JSON.stringify({
          token: "invite-token",
          firebaseIdToken: "firebase-id-token",
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      },
    );
  });

  it("surfaces backend error messages for failed acceptance", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({ message: "Invite has expired" }, { status: 410 }),
    );
    const client = createWorkspaceInvitesClient({ fetchFn });

    await expect(
      client.acceptInvite({
        firebaseIdToken: "firebase-id-token",
        token: "invite-token",
      }),
    ).rejects.toThrow("Invite has expired");
  });
});
