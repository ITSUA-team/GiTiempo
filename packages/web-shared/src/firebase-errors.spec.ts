import { FirebaseError } from "firebase/app";
import { describe, expect, it } from "vitest";

import {
  getFirebaseAuthErrorMessage,
  getFirebaseErrorCode,
} from "./firebase-errors";

describe("getFirebaseErrorCode", () => {
  it("returns the code of a FirebaseError", () => {
    const error = new FirebaseError("auth/invalid-action-code", "bad code");

    expect(getFirebaseErrorCode(error)).toBe("auth/invalid-action-code");
  });

  it("returns the code of a plain error carrying a string code", () => {
    const error = Object.assign(new Error("failed"), {
      code: "auth/weak-password",
    });

    expect(getFirebaseErrorCode(error)).toBe("auth/weak-password");
  });

  it("returns null for errors without a code", () => {
    expect(getFirebaseErrorCode(new Error("no code"))).toBeNull();
    expect(getFirebaseErrorCode("network down")).toBeNull();
    expect(getFirebaseErrorCode(null)).toBeNull();
    expect(getFirebaseErrorCode(undefined)).toBeNull();
  });

  it("returns null when the code is not a string", () => {
    const error = Object.assign(new Error("bad shape"), { code: 42 });

    expect(getFirebaseErrorCode(error)).toBeNull();
  });
});

describe("getFirebaseAuthErrorMessage", () => {
  const fallback = "Could not send the reset link. Try again in a moment.";

  it("returns the fallback for user-not-found instead of the raw message", () => {
    const error = new FirebaseError(
      "auth/user-not-found",
      "There is no user record corresponding to this identifier.",
    );

    const message = getFirebaseAuthErrorMessage(error, fallback);

    expect(message).toBe(fallback);
    expect(message).not.toContain("user-not-found");
    expect(message).not.toContain("no user record");
  });

  it("returns the fallback for invalid-email instead of the raw message", () => {
    const error = new FirebaseError(
      "auth/invalid-email",
      "The email address is badly formatted.",
    );

    const message = getFirebaseAuthErrorMessage(error, fallback);

    expect(message).toBe(fallback);
    expect(message).not.toContain("invalid-email");
    expect(message).not.toContain("badly formatted");
  });

  it("returns the fallback even when the enumeration-sensitive code rides on a plain error", () => {
    const error = Object.assign(new Error("There is no user record."), {
      code: "auth/user-not-found",
    });

    expect(getFirebaseAuthErrorMessage(error, fallback)).toBe(fallback);
  });

  it("returns neutral copy for too-many-requests", () => {
    const error = new FirebaseError("auth/too-many-requests", "Too many attempts.");

    expect(getFirebaseAuthErrorMessage(error, fallback)).toBe(
      "Too many attempts. Wait a moment, then try again.",
    );
  });

  it("returns neutral copy for network-request-failed", () => {
    const error = new FirebaseError("auth/network-request-failed", "offline");

    expect(getFirebaseAuthErrorMessage(error, fallback)).toBe(
      "Network error. Check your connection and try again.",
    );
  });

  it("returns neutral copy for expired and invalid action codes", () => {
    const expired = new FirebaseError("auth/expired-action-code", "expired");
    const invalid = new FirebaseError("auth/invalid-action-code", "invalid");

    expect(getFirebaseAuthErrorMessage(expired, fallback)).toBe(
      "This password reset link is invalid, expired, or already used. Request a new one to continue.",
    );
    expect(getFirebaseAuthErrorMessage(invalid, fallback)).toBe(
      "This password reset link is invalid, expired, or already used. Request a new one to continue.",
    );
  });

  it("returns invite-setup copy for expired and invalid action codes", () => {
    const expired = new FirebaseError("auth/expired-action-code", "expired");
    const invalid = new FirebaseError("auth/invalid-action-code", "invalid");

    expect(getFirebaseAuthErrorMessage(expired, fallback, "invite-setup")).toBe(
      "This password setup link is invalid, expired, or already used. Go back to your invite and ask an admin for a fresh link if needed.",
    );
    expect(getFirebaseAuthErrorMessage(invalid, fallback, "invite-setup")).toBe(
      "This password setup link is invalid, expired, or already used. Go back to your invite and ask an admin for a fresh link if needed.",
    );
  });

  it("locks the default recovery copy for the reset flow and leaves other codes flow-agnostic", () => {
    const expired = new FirebaseError("auth/expired-action-code", "expired");
    const weak = new FirebaseError("auth/weak-password", "weak");

    expect(getFirebaseAuthErrorMessage(expired, fallback)).toBe(
      "This password reset link is invalid, expired, or already used. Request a new one to continue.",
    );
    expect(getFirebaseAuthErrorMessage(expired, fallback, "reset")).toBe(
      "This password reset link is invalid, expired, or already used. Request a new one to continue.",
    );
    expect(getFirebaseAuthErrorMessage(weak, fallback, "invite-setup")).toBe(
      "Choose a stronger password and try again.",
    );
  });

  it("returns neutral copy for weak-password", () => {
    const error = new FirebaseError("auth/weak-password", "weak");

    expect(getFirebaseAuthErrorMessage(error, fallback)).toBe(
      "Choose a stronger password and try again.",
    );
  });

  it("returns neutral copy for operation-not-allowed", () => {
    const error = new FirebaseError("auth/operation-not-allowed", "disabled");

    expect(getFirebaseAuthErrorMessage(error, fallback)).toBe(
      "Password reset is not available right now. Try again later.",
    );
  });

  it("returns the fallback for values that carry no code", () => {
    expect(getFirebaseAuthErrorMessage(null, fallback)).toBe(fallback);
    expect(getFirebaseAuthErrorMessage(undefined, fallback)).toBe(fallback);
    expect(getFirebaseAuthErrorMessage("network down", fallback)).toBe(fallback);
  });

  it("delegates unmapped codes and plain errors to getErrorMessage", () => {
    const unknownCode = new FirebaseError(
      "auth/internal-error",
      "An internal error has occurred.",
    );

    expect(getFirebaseAuthErrorMessage(unknownCode, fallback)).toBe(
      "An internal error has occurred.",
    );
    expect(getFirebaseAuthErrorMessage(new Error("boom"), fallback)).toBe("boom");
  });
});