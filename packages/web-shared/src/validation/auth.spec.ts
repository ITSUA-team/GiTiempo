import { describe, expect, it } from "vitest";

import {
  emailOnlySchema,
  emailPasswordSignInSchema,
  newPasswordSchema,
} from "./auth";

describe("emailOnlySchema", () => {
  it("rejects an empty email", () => {
    const result = emailOnlySchema.safeParse({ email: " " });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "Enter a valid email address.",
    );
  });

  it("rejects a malformed email", () => {
    const result = emailOnlySchema.safeParse({ email: "not-an-email" });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      "Enter a valid email address.",
    );
  });

  it("accepts a valid email and trims surrounding whitespace", () => {
    const result = emailOnlySchema.safeParse({
      email: "  alexey@example.com  ",
    });

    expect(result.success).toBe(true);
    expect(result.data?.email).toBe("alexey@example.com");
  });
});

describe("newPasswordSchema", () => {
  it("rejects a password shorter than 8 characters", () => {
    const result = newPasswordSchema.safeParse({
      password: "short12",
      confirmPassword: "short12",
    });

    expect(result.success).toBe(false);
    const passwordIssue = result.error?.issues.find(
      (issue) => issue.path[0] === "password",
    );
    expect(passwordIssue?.message).toBe(
      "Password must be at least 8 characters.",
    );
  });

  it("rejects a confirmation that does not match the password", () => {
    const result = newPasswordSchema.safeParse({
      password: "password123",
      confirmPassword: "password456",
    });

    expect(result.success).toBe(false);
    const confirmIssue = result.error?.issues.find(
      (issue) => issue.path[0] === "confirmPassword",
    );
    expect(confirmIssue?.message).toBe("Passwords do not match.");
  });

  it("accepts a valid matching password and confirmation", () => {
    const result = newPasswordSchema.safeParse({
      password: "password123",
      confirmPassword: "password123",
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      password: "password123",
      confirmPassword: "password123",
    });
  });
});

describe("emailPasswordSignInSchema", () => {
  it("still accepts the established sign-in input shape", () => {
    const result = emailPasswordSignInSchema.safeParse({
      email: "alexey@example.com",
      password: "password123",
    });

    expect(result.success).toBe(true);
  });
});