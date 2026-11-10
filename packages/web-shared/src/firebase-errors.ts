import { getErrorMessage } from "./feedback";

export function getFirebaseErrorCode(error: unknown): string | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }

  return null;
}

export function getFirebaseAuthErrorMessage(
  error: unknown,
  fallback: string,
  flow?: "reset" | "invite-setup",
): string {
  switch (getFirebaseErrorCode(error)) {
    case "auth/user-not-found":
    case "auth/invalid-email":
      // Firebase raises these for unrecognized and malformed addresses alike;
      // echoing the raw message would reveal whether an account exists.
      return fallback;
    case "auth/too-many-requests":
      return "Too many attempts. Wait a moment, then try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/expired-action-code":
    case "auth/invalid-action-code":
      return flow === "invite-setup"
        ? "This password setup link is invalid, expired, or already used. Go back to your invite and ask an admin for a fresh link if needed."
        : "This password reset link is invalid, expired, or already used. Request a new one to continue.";
    case "auth/weak-password":
      return "Choose a stronger password and try again.";
    case "auth/operation-not-allowed":
      return "Password reset is not available right now. Try again later.";
    default:
      return getErrorMessage(error, fallback);
  }
}