import { getExtensionConfig } from "./config";
import { launchWebAuthFlow } from "./web-auth-flow";

/**
 * The indicators the backend puts on its redirect back to the extension. Each
 * gets its own copy: "try again" and "your GitHub account has no verified email"
 * call for different actions from the user, so collapsing them into one message
 * would hide the only actionable part.
 */
const GITHUB_SIGN_IN_ERROR_COPY: Record<string, string> = {
  denied: "GitHub sign-in was declined. Authorize GiTiempo to continue.",
  email:
    "GitHub has no verified primary email for your account. Verify one on GitHub, then try again.",
  failed: "GitHub sign-in could not be completed. Please try again in a moment.",
  state: "GitHub sign-in could not be verified. Please start again.",
};

const GITHUB_SIGN_IN_FALLBACK_ERROR =
  "GitHub sign-in could not be completed. Please try again.";

export function buildGithubSignInStartUrl(apiBaseUrl: string): string {
  // The extension contributes only its target. Where the outcome is delivered is
  // resolved by the backend from its own configuration, so nothing here can
  // influence the destination the handoff code is sent to.
  return `${apiBaseUrl}/auth/github/start?app=extension`;
}

/**
 * Reads the backend's outcome off the URL Chrome intercepted. A handoff code
 * means success; an error indicator is mapped to recoverable copy. Anything else
 * means the flow returned somewhere unexpected, which is treated as a failure
 * rather than silently retried.
 */
export function readGithubSignInResult(redirectedTo: string): string {
  const url = new URL(redirectedTo);
  const error = url.searchParams.get("githubError");

  if (error) {
    throw new Error(GITHUB_SIGN_IN_ERROR_COPY[error] ?? GITHUB_SIGN_IN_FALLBACK_ERROR);
  }

  const code = url.searchParams.get("code");

  if (!code) {
    throw new Error(GITHUB_SIGN_IN_FALLBACK_ERROR);
  }

  return code;
}

/**
 * Runs backend GitHub sign-in and returns the one-time handoff code to exchange
 * for a session. Firebase is not involved: the backend owns this flow end to end
 * and mints the same token pair the Firebase paths produce.
 */
export async function signInWithGithub(): Promise<string> {
  const { apiBaseUrl } = getExtensionConfig();

  return readGithubSignInResult(
    await launchWebAuthFlow(buildGithubSignInStartUrl(apiBaseUrl), "GitHub"),
  );
}
