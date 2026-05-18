/* global chrome */

import { FirebaseError, initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  getAuth,
  signInWithEmailAndPassword,
  signInWithCredential,
} from "firebase/auth";

import { getExtensionConfig, hasFirebaseConfig } from "./config";

const extensionConfig = getExtensionConfig();
const firebaseConfig = extensionConfig.firebase;
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

  if (!manifest.permissions?.includes("identity")) {
    throw new Error(
      "Google sign-in is unavailable because the extension manifest is missing the identity permission.",
    );
  }

  const clientId = manifest.oauth2?.client_id?.trim();

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

function createGoogleAuthState(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function buildGoogleAuthUrl({
  clientId,
  redirectUri,
  state,
}: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "token");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");

  return url.toString();
}

function parseGoogleAuthResponse(redirectedTo: string, expectedState: string): string {
  const responseUrl = new URL(redirectedTo);
  const hashParams = new URLSearchParams(responseUrl.hash.replace(/^#/, ""));
  const searchParams = responseUrl.searchParams;
  const returnedState = hashParams.get("state") ?? searchParams.get("state");
  const error = hashParams.get("error") ?? searchParams.get("error");

  if (returnedState !== expectedState) {
    throw new Error("Google sign-in could not be verified. Please try again.");
  }

  if (error) {
    throw new Error(`Google sign-in failed: ${error}`);
  }

  const accessToken = hashParams.get("access_token") ?? searchParams.get("access_token");

  if (!accessToken) {
    throw new Error("Google sign-in did not return an access token.");
  }

  return accessToken;
}

function launchWebAuthFlow(url: string): Promise<string> {
  if (!chrome.identity?.launchWebAuthFlow) {
    throw new Error(
      "Google sign-in is unavailable because the Chrome identity API is not accessible.",
    );
  }

  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      {
        interactive: true,
        url,
      },
      (responseUrl) => {
        const runtimeError = chrome.runtime.lastError;

        if (runtimeError) {
          reject(new Error(runtimeError.message || "Google sign-in was interrupted."));
          return;
        }

        if (!responseUrl) {
          reject(new Error("Google sign-in was cancelled before completion."));
          return;
        }

        resolve(responseUrl);
      },
    );
  });
}

export async function signInWithGoogle(): Promise<string> {
  const state = createGoogleAuthState();
  const responseUrl = await launchWebAuthFlow(
    buildGoogleAuthUrl({
      clientId: getGoogleOAuthClientId(),
      redirectUri: createGoogleAuthRedirectUri(),
      state,
    }),
  );
  const accessToken = parseGoogleAuthResponse(responseUrl, state);
  const credential = await signInWithCredential(
    getFirebaseAuth(),
    GoogleAuthProvider.credential(null, accessToken),
  );

  return credential.user.getIdToken();
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
