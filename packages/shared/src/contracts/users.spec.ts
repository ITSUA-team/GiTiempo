import { describe, expect, it } from "vitest";

import {
  currentUserWorkspaceMembershipListResponseSchema,
} from "./users.js";

const validWorkspaceMembershipList = {
  items: [
    {
      workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
      workspaceName: "GiTiempo Studio",
      role: "admin",
      isCurrent: true,
    },
    {
      workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9002",
      workspaceName: "Client Delivery",
      role: "member",
      isCurrent: false,
    },
  ],
};

describe("currentUserWorkspaceMembershipListResponseSchema", () => {
  it("accepts a valid multi-workspace membership payload", () => {
    expect(
      currentUserWorkspaceMembershipListResponseSchema.parse(
        validWorkspaceMembershipList,
      ),
    ).toEqual(validWorkspaceMembershipList);
  });

  it("rejects unknown item keys", () => {
    const result = currentUserWorkspaceMembershipListResponseSchema.safeParse({
      items: [
        {
          ...validWorkspaceMembershipList.items[0],
          joinedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.code).toBe("unrecognized_keys");
  });

  it("rejects unknown roles", () => {
    const result = currentUserWorkspaceMembershipListResponseSchema.safeParse({
      items: [
        {
          ...validWorkspaceMembershipList.items[0],
          role: "owner",
        },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["items", 0, "role"]);
  });

  it("requires exactly one current workspace membership", () => {
    const zeroCurrent = currentUserWorkspaceMembershipListResponseSchema.safeParse(
      {
        items: validWorkspaceMembershipList.items.map((item) => ({
          ...item,
          isCurrent: false,
        })),
      },
    );
    const twoCurrent = currentUserWorkspaceMembershipListResponseSchema.safeParse(
      {
        items: validWorkspaceMembershipList.items.map((item) => ({
          ...item,
          isCurrent: true,
        })),
      },
    );

    expect(zeroCurrent.success).toBe(false);
    expect(zeroCurrent.error?.issues[0]?.path).toEqual(["items"]);
    expect(twoCurrent.success).toBe(false);
    expect(twoCurrent.error?.issues[0]?.path).toEqual(["items"]);
  });
});
