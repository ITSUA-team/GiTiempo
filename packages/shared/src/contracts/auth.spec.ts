import { describe, expect, it } from "vitest";

import {
  registerRequestSchema,
  registrationErrorCodeSchema,
  switchWorkspaceRequestSchema,
} from "./auth.js";

const validRegisterRequest = {
  email: "owner@example.com",
  fullName: "Owner Person",
  workspaceName: "Acme Studio",
  password: "password123",
  ownerAcknowledgement: true,
};

describe("registerRequestSchema", () => {
  it("accepts a valid first-owner registration payload", () => {
    const result = registerRequestSchema.parse(validRegisterRequest);

    expect(result).toEqual(validRegisterRequest);
  });

  it("rejects invalid email addresses", () => {
    const result = registerRequestSchema.safeParse({
      ...validRegisterRequest,
      email: "not-an-email",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["email"]);
  });

  it("rejects blank required text fields", () => {
    const result = registerRequestSchema.safeParse({
      ...validRegisterRequest,
      fullName: "   ",
      workspaceName: "",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.path)).toEqual([
      ["fullName"],
      ["workspaceName"],
    ]);
  });

  it("rejects weak passwords", () => {
    const result = registerRequestSchema.safeParse({
      ...validRegisterRequest,
      password: "short",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["password"]);
  });

  it("requires owner acknowledgement to be true", () => {
    const result = registerRequestSchema.safeParse({
      ...validRegisterRequest,
      ownerAcknowledgement: false,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["ownerAcknowledgement"]);
  });

  it("rejects unknown payload keys", () => {
    const result = registerRequestSchema.safeParse({
      ...validRegisterRequest,
      role: "admin",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.code).toBe("unrecognized_keys");
  });
});

describe("registrationErrorCodeSchema", () => {
  it("accepts each stable registration error identifier", () => {
    expect(registrationErrorCodeSchema.parse("duplicate_email")).toBe(
      "duplicate_email",
    );
    expect(registrationErrorCodeSchema.parse("weak_password")).toBe(
      "weak_password",
    );
    expect(
      registrationErrorCodeSchema.parse("invalid_workspace_name"),
    ).toBe("invalid_workspace_name");
    expect(
      registrationErrorCodeSchema.parse("workspace_name_unavailable"),
    ).toBe("workspace_name_unavailable");
    expect(registrationErrorCodeSchema.parse("rate_limited")).toBe(
      "rate_limited",
    );
    expect(
      registrationErrorCodeSchema.parse("registration_service_unavailable"),
    ).toBe("registration_service_unavailable");
  });

  it("rejects unknown registration error identifiers", () => {
    const result = registrationErrorCodeSchema.safeParse("firebase/email-taken");

    expect(result.success).toBe(false);
  });
});

describe("switchWorkspaceRequestSchema", () => {
  it("accepts a strict workspace switch payload", () => {
    const payload = {
      refreshToken: "current-refresh-token",
      workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
    };

    expect(switchWorkspaceRequestSchema.parse(payload)).toEqual(payload);
  });

  it("rejects invalid workspace identifiers", () => {
    const result = switchWorkspaceRequestSchema.safeParse({
      refreshToken: "current-refresh-token",
      workspaceId: "workspace-1",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["workspaceId"]);
  });

  it("requires the current refresh token", () => {
    const result = switchWorkspaceRequestSchema.safeParse({
      workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["refreshToken"]);
  });

  it("rejects unknown payload keys", () => {
    const result = switchWorkspaceRequestSchema.safeParse({
      refreshToken: "current-refresh-token",
      workspaceId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
      workspaceName: "Acme Studio",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.code).toBe("unrecognized_keys");
  });
});
