/* global chrome */

import { FirebaseError, initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  getAuth,
  signOut,
  signInWithEmailAndPassword,
  signInWithCredential,
} from "firebase/auth/web-extension";

import { getExtensionConfig, hasFirebaseConfig } from "./config";
import { launchWebAuthFlow } from "./web-auth-flow";

const extensionConfig = getExtensionConfig();
const firebaseConfig = extensionConfig.firebase;
const GOOGLE_OIDC_ISSUER = "https://accounts.google.com";
const firebaseApp = hasFirebaseConfig(extensionConfig) && firebaseConfig
  ? initializeApp(firebaseConfig)
  : null;

function getFirebaseAuth() {
  if (!firebaseApp) {
    throw new FirebaseError(
      "auth/missing-config",
      "Firebase Auth is not configured for apps/chrome-ext.",
    );
  }

  return getAuth(firebaseApp);
}

function getGoogleOAuthClientId(): string {
  const manifest = chrome.runtime.getManifest();
  const clientId = extensionConfig.googleOAuthClientId.trim();

  if (!manifest.permissions?.includes("identity")) {
    throw new Error(
      "Google sign-in is unavailable because the extension manifest is missing the identity permission.",
    );
  }

  if (!clientId) {
    throw new Error(
      "Google sign-in is unavailable because the extension OAuth client is not configured.",
    );
  }

  return clientId;
}

function createGoogleAuthRedirectUri(): string {
  const redirectUri = chrome.identity?.getRedirectURL?.("oauth2")?.trim();

  if (!redirectUri) {
    throw new Error(
      "Google sign-in is unavailable because the extension redirect URI could not be resolved.",
    );
  }

  return redirectUri;
}

export type GoogleFirebaseSignInResult = {
  firebaseIdToken: string;
  googleIdToken: string;
};

function createGoogleAuthValue(): string {
  if (typeof crypto === "undefined" || typeof crypto.getRandomValues !== "function") {
    throw new Error("Google sign-in is unavailable because secure random values are not supported.");
  }

  const values = crypto.getRandomValues(new Uint8Array(32));

  return Array.from(values, (value) => value.toString(16).padStart(2, "0")).join("");
}

function buildGoogleAuthUrl({
  clientId,
  nonce,
  redirectUri,
  state,
}: {
  clientId: string;
  nonce: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "token id_token");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("prompt", "select_account");

  return url.toString();
}

type GoogleVerificationFailure =
  | "callback"
  | "duplicate_parameter"
  | "issuer"
  | "missing_credentials"
  | "nonce"
  | "state";

function googleVerificationFailure(reason: GoogleVerificationFailure): Error {
  return new Error(`Google sign-in could not be verified (${reason}). Please try again.`);
}

function assertNoDuplicateSecurityResponseParams(params: URLSearchParams): void {
  for (const key of ["access_token", "error", "id_token", "iss", "state"]) {
    if (params.getAll(key).length > 1) {
      throw googleVerificationFailure("duplicate_parameter");
    }
  }
}

function getIdTokenNonce(idToken: string): string | null {
  const payload = idToken.split(".")[1];

  if (!payload || typeof atob !== "function") {
    return null;
  }

  try {
    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decodedPayload = atob(
      normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, "="),
    );
    const parsedPayload: unknown = JSON.parse(decodedPayload);

    if (!parsedPayload || typeof parsedPayload !== "object") {
      return null;
    }

    const nonce = (parsedPayload as { nonce?: unknown }).nonce;
    return typeof nonce === "string" ? nonce : null;
  } catch {
    return null;
  }
}

function parseGoogleAuthResponse(
  redirectedTo: string,
  expectedRedirectUri: string,
  expectedState: string,
  expectedNonce: string,
): { accessToken: string; idToken: string } {
  let responseUrl: URL;
  let expectedRedirectUrl: URL;

  try {
    responseUrl = new URL(redirectedTo);
    expectedRedirectUrl = new URL(expectedRedirectUri);
  } catch {
    throw googleVerificationFailure("callback");
  }

  if (
    responseUrl.origin !== expectedRedirectUrl.origin ||
    responseUrl.pathname !== expectedRedirectUrl.pathname ||
    responseUrl.search.length > 0
  ) {
    throw googleVerificationFailure("callback");
  }

  const hashParams = new URLSearchParams(responseUrl.hash.replace(/^#/, ""));
  assertNoDuplicateSecurityResponseParams(hashParams);
  const returnedState = hashParams.get("state");
  const issuer = hashParams.get("iss");
  const error = hashParams.get("error");

  if (returnedState !== expectedState) {
    throw googleVerificationFailure("state");
  }

  if (issuer !== null && issuer !== GOOGLE_OIDC_ISSUER) {
    throw googleVerificationFailure("issuer");
  }

  if (error) {
    throw new Error(`Google sign-in failed: ${error}`);
  }

  const accessToken = hashParams.get("access_token");
  const idToken = hashParams.get("id_token");

  if (!accessToken || !idToken) {
    throw googleVerificationFailure("missing_credentials");
  }

  if (getIdTokenNonce(idToken) !== expectedNonce) {
    throw googleVerificationFailure("nonce");
  }

  return { accessToken, idToken };
}

export async function signInWithGoogle(): Promise<GoogleFirebaseSignInResult> {
  let state: string | null = createGoogleAuthValue();
  let nonce: string | null = createGoogleAuthValue();
  const redirectUri = createGoogleAuthRedirectUri();

  try {
    const responseUrl = await launchWebAuthFlow(
      buildGoogleAuthUrl({
        clientId: getGoogleOAuthClientId(),
        nonce,
        redirectUri,
        state,
      }),
      "Google",
    );
    const { accessToken, idToken } = parseGoogleAuthResponse(
      responseUrl,
      redirectUri,
      state,
      nonce,
    );
    const credential = await signInWithCredential(
      getFirebaseAuth(),
      GoogleAuthProvider.credential(idToken, accessToken),
    );

    return {
      firebaseIdToken: await credential.user.getIdToken(),
      googleIdToken: idToken,
    };
  } finally {
    state = null;
    nonce = null;
  }
}

export async function signInWithEmailPassword(
  email: string,
  password: string,
): Promise<string> {
  const credential = await signInWithEmailAndPassword(
    getFirebaseAuth(),
    email,
    password,
  );

  return credential.user.getIdToken();
}

/**
 * Clears Firebase's own IndexedDB-backed extension persistence. GitHub-only
 * sessions and builds without Firebase configuration have nothing to clear and
 * are intentionally treated as already signed out.
 */
export async function signOutFromFirebase(): Promise<void> {
  if (!firebaseApp) {
    return;
  }

  await signOut(getFirebaseAuth());
}
