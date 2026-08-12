import { getExtensionConfig, type ExtensionBrowser } from "./config";
import { launchWebAuthFlow } from "./web-auth-flow";

/**
 * The indicators the backend puts on its redirect back to the extension. Each
 * gets its own copy: "try again" and "your GitHub account has no verified email"
 * call for different actions from the user, so collapsing them into one message
 * would hide the only actionable part.
 */
const GITHUB_SIGN_IN_ERROR_COPY: Record<string, string> = {
  ambiguous:
    "Your GitHub account matches more than one GiTiempo account. Sign in with your email address instead.",
  denied: "GitHub sign-in was declined. Authorize GiTiempo to continue.",
  email:
    "GitHub has no verified email for your account. Verify one on GitHub, then try again.",
  failed: "GitHub sign-in could not be completed. Please try again in a moment.",
  nomember:
    "No GiTiempo account matches any verified email on your GitHub account. Add your work address at https://github.com/settings/emails and verify it, then try again.",
  state: "GitHub sign-in could not be verified. Please start again.",
};

const GITHUB_SIGN_IN_FALLBACK_ERROR =
  "GitHub sign-in could not be completed. Please try again.";

export interface GithubSignInHandoff {
  code: string;
  verifier: string;
}

/**
 * Lower-case hex, the encoding the backend recomputes and compares against. Both
 * the verifier and its challenge go through here, so the two cannot drift into
 * different encodings and fail the comparison for a reason neither side reports.
 */
function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** 32 random bytes as hex: 64 chars, well inside the contract's bounds. */
export function createVerifier(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toHex(bytes);
}

export async function deriveChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  return toHex(new Uint8Array(digest));
}

export function buildGithubSignInStartUrl(
  apiBaseUrl: string,
  challenge: string,
  browser: ExtensionBrowser,
): string {
  // The extension contributes its target, a challenge and which browser it is,
  // never a destination: where the outcome is delivered is still resolved by the
  // backend from its own configuration. `browser` names one of the destinations
  // the operator configured rather than supplying one, so nothing here can steer
  // where the handoff code is sent. Firefox needs this because its redirect host
  // is derived from the extension id by the browser and cannot be computed
  // server side, so one configured value cannot serve both.
  return `${apiBaseUrl}/auth/github/start?app=extension&challenge=${challenge}&browser=${browser}`;
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
export async function signInWithGithub(): Promise<GithubSignInHandoff> {
  const { apiBaseUrl, browser } = getExtensionConfig();
  // Proof of possession rather than a cookie: Chrome's authorization window does
  // not carry the backend's HttpOnly state cookie through to the callback, so the
  // verifier stays here and is presented when redeeming the handoff code.
  const verifier = createVerifier();
  const challenge = await deriveChallenge(verifier);

  return {
    code: readGithubSignInResult(
      await launchWebAuthFlow(
        buildGithubSignInStartUrl(apiBaseUrl, challenge, browser),
        "GitHub",
      ),
    ),
    verifier,
  };
}
