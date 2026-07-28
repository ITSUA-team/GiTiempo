/** User-facing messages for the backend GitHub sign-in `?githubError=` codes. */
export const githubCallbackErrorMessages: Record<string, string> = {
  denied: "GitHub sign-in was cancelled.",
  email: "Your GitHub account has no verified primary email to sign in with.",
  state: "GitHub sign-in could not be verified. Please try again.",
  failed: "Something went wrong while signing in with GitHub.",
};

// Empty and non-string query values count as absent, so a bare `?githubError=`
// is treated as no error rather than an unknown one.
function firstQueryValue(value: unknown): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

/** A known `githubError` code, or `failed` for anything unrecognized. */
function normalizeGithubErrorCode(code: string): string {
  return code in githubCallbackErrorMessages ? code : "failed";
}

/**
 * Resolves a login page's `?githubError=` query value into a user-facing
 * message, or null when there is no error to show. Shared so both login views
 * decode the backend's error indicator identically.
 */
export function resolveGithubSignInError(value: unknown): string | null {
  const code = firstQueryValue(value);
  if (code === null) return null;
  return githubCallbackErrorMessages[normalizeGithubErrorCode(code)];
}

export interface GithubSignInCallbackHandlers {
  exchange: (code: string) => Promise<void>;
  // Return is intentionally loose so a router navigation (which resolves to a
  // NavigationFailure or undefined) can be passed directly.
  onSuccess: () => void | Promise<unknown>;
  /**
   * Called with a `githubError` code to carry to the login page (which decodes
   * it with `resolveGithubSignInError`), so a transient callback view never has
   * to own the message — writing it locally and navigating away would lose it.
   */
  onError: (githubError: string) => void | Promise<unknown>;
}

/**
 * Completes the backend GitHub sign-in handoff from a callback route's query:
 * on a `?githubError=` (or any failure) it hands the login page an error code,
 * otherwise it exchanges the one-time `?code=` for a session. Shared by the
 * user-web and admin-web callback views.
 */
export async function completeGithubSignInCallback(
  query: { githubError: unknown; code: unknown },
  handlers: GithubSignInCallbackHandlers,
): Promise<void> {
  const githubError = firstQueryValue(query.githubError);
  if (githubError !== null) {
    await handlers.onError(normalizeGithubErrorCode(githubError));
    return;
  }

  const code = firstQueryValue(query.code);
  if (code === null) {
    await handlers.onError("failed");
    return;
  }

  try {
    await handlers.exchange(code);
    await handlers.onSuccess();
  } catch {
    await handlers.onError("failed");
  }
}
