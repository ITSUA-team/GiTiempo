import { getErrorMessage } from "../feedback";

/** User-facing messages for the backend GitHub sign-in `?githubError=` codes. */
export const githubCallbackErrorMessages: Record<string, string> = {
  denied: "GitHub sign-in was cancelled.",
  email: "Your GitHub account has no verified primary email to sign in with.",
  state: "GitHub sign-in could not be verified. Please try again.",
  failed: "Something went wrong while signing in with GitHub.",
};

function firstQueryValue(value: unknown): string | null {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : null;
  }

  return typeof value === "string" ? value : null;
}

export interface GithubSignInCallbackHandlers {
  exchange: (code: string) => Promise<void>;
  // Return is intentionally loose so a router navigation (which resolves to a
  // NavigationFailure or undefined) can be passed directly.
  onSuccess: () => void | Promise<unknown>;
  onError: (message: string) => void | Promise<unknown>;
}

/**
 * Completes the backend GitHub sign-in handoff from a callback route's query:
 * surfaces a `?githubError=` message, otherwise exchanges the one-time `?code=`
 * for a session. Shared by the user-web and admin-web callback views.
 */
export async function completeGithubSignInCallback(
  query: { githubError: unknown; code: unknown },
  handlers: GithubSignInCallbackHandlers,
): Promise<void> {
  const githubError = firstQueryValue(query.githubError);
  if (githubError) {
    await handlers.onError(
      githubCallbackErrorMessages[githubError] ??
        githubCallbackErrorMessages.failed,
    );
    return;
  }

  const code = firstQueryValue(query.code);
  if (!code) {
    await handlers.onError(githubCallbackErrorMessages.failed);
    return;
  }

  try {
    await handlers.exchange(code);
    await handlers.onSuccess();
  } catch (error) {
    await handlers.onError(
      getErrorMessage(error, "Could not complete GitHub sign-in."),
    );
  }
}
