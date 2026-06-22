import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAuthenticatedApiClient } from "./http";
import { createWorkspaceClient } from "./workspace-client";

const workspaceResponse = {
  createdAt: "2026-05-01T10:00:00.000Z",
  id: "11111111-1111-4111-8111-111111111111",
  name: "GiTiempo Studio",
  updatedAt: "2026-05-01T10:00:00.000Z",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

function createTestApiClient(fetchFn: typeof fetch) {
  return createAuthenticatedApiClient({
    apiBaseUrl: "https://api.example.test",
    fetchFn,
    getToken: () => "access-token",
    onRefreshFailed: vi.fn(),
    refreshAccessToken: async () => "access-token",
  });
}

describe("createWorkspaceClient", () => {
  const fetchFn = vi.fn<typeof fetch>();
  const client = createWorkspaceClient({
    apiClient: createTestApiClient(fetchFn),
  });

  beforeEach(() => {
    fetchFn.mockReset();
  });

  it("gets workspace with auth headers and parses the response", async () => {
    fetchFn.mockResolvedValue(jsonResponse(workspaceResponse));

    const result = await client.getWorkspace();

    expect(fetchFn).toHaveBeenCalledWith(
      "https://api.example.test/workspace",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer access-token",
        }),
        method: "GET",
      }),
    );
    expect(result).toEqual(workspaceResponse);
  });

  it("updates workspace with the expected path, method, and payload", async () => {
    fetchFn.mockResolvedValue(
      jsonResponse({ ...workspaceResponse, name: "Updated Workspace" }),
    );

    const result = await client.updateWorkspace({
      name: "Updated Workspace",
    });

    expect(fetchFn).toHaveBeenCalledWith(
      "https://api.example.test/workspace",
      expect.objectContaining({
        body: JSON.stringify({ name: "Updated Workspace" }),
        headers: expect.objectContaining({
          Authorization: "Bearer access-token",
          "Content-Type": "application/json",
        }),
        method: "PATCH",
      }),
    );
    expect(result.name).toBe("Updated Workspace");
  });

  it("rejects invalid update payloads before sending requests", async () => {
    expect(() => client.updateWorkspace({})).toThrow(
      "At least one field must be provided",
    );
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("surfaces API error messages using repository parsing order", async () => {
    fetchFn.mockResolvedValue(
      jsonResponse({ error: "Admin role required" }, 403),
    );

    await expect(client.getWorkspace()).rejects.toThrow("Admin role required");
  });
});
