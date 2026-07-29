export interface ExtensionConfig {
  apiBaseUrl: string;
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
  } | null;
  googleOAuthClientId: string;
  userSpaUrl: string;
  userSpaHomeUrl: string;
}

interface ExtensionEnv {
  DEV?: boolean;
  MODE?: string;
  VITE_EXTENSION_API_BASE_URL?: string;
  VITE_EXTENSION_FIREBASE_API_KEY?: string;
  VITE_EXTENSION_FIREBASE_AUTH_DOMAIN?: string;
  VITE_EXTENSION_FIREBASE_PROJECT_ID?: string;
  VITE_EXTENSION_GOOGLE_CLIENT_ID?: string;
  VITE_EXTENSION_USER_SPA_URL?: string;
}

export function normalizeUrl(value: string, fallback: string): string {
  const trimmed = value.trim();

  return (trimmed || fallback).replace(/\/$/, "");
}

/**
 * The signed-in SPA URL points at the sign-in route; the extension's "open the
 * app" affordance should land on the app home (dashboard) instead, so we reduce
 * it to its origin. Falls back to the SPA URL if it cannot be parsed.
 */
export function deriveHomeUrl(userSpaUrl: string): string {
  try {
    return new URL(userSpaUrl).origin;
  } catch {
    return userSpaUrl;
  }
}

function isRelaxedEnvironment(env: ExtensionEnv): boolean {
  return env.DEV === true || env.MODE === "test";
}

function getRequiredEnvValue(
  value: string | undefined,
  key: string,
  relaxedFallback: string,
  relaxed: boolean,
): string {
  const trimmed = value?.trim() ?? "";

  if (trimmed) {
    return trimmed;
  }

  if (relaxed) {
    return relaxedFallback;
  }

  throw new Error(`Missing required extension environment variable: ${key}`);
}

export function getExtensionConfig(
  env: ExtensionEnv = import.meta.env,
): ExtensionConfig {
  const relaxed = isRelaxedEnvironment(env);
  const apiBaseUrl = normalizeUrl(
    getRequiredEnvValue(
      env.VITE_EXTENSION_API_BASE_URL,
      "VITE_EXTENSION_API_BASE_URL",
      "http://localhost:3000",
      relaxed,
    ),
    "http://localhost:3000",
  );
  const userSpaUrl = normalizeUrl(
    getRequiredEnvValue(
      env.VITE_EXTENSION_USER_SPA_URL,
      "VITE_EXTENSION_USER_SPA_URL",
      "http://localhost:5173/login",
      relaxed,
    ),
    "http://localhost:5173/login",
  );

  const firebaseApiKey = getRequiredEnvValue(
    env.VITE_EXTENSION_FIREBASE_API_KEY,
    "VITE_EXTENSION_FIREBASE_API_KEY",
    "test-firebase-api-key",
    relaxed,
  );
  const firebaseAuthDomain = getRequiredEnvValue(
    env.VITE_EXTENSION_FIREBASE_AUTH_DOMAIN,
    "VITE_EXTENSION_FIREBASE_AUTH_DOMAIN",
    "test-project.firebaseapp.com",
    relaxed,
  );
  const firebaseProjectId = getRequiredEnvValue(
    env.VITE_EXTENSION_FIREBASE_PROJECT_ID,
    "VITE_EXTENSION_FIREBASE_PROJECT_ID",
    "test-project",
    relaxed,
  );
  const googleOAuthClientId = getRequiredEnvValue(
    env.VITE_EXTENSION_GOOGLE_CLIENT_ID,
    "VITE_EXTENSION_GOOGLE_CLIENT_ID",
    "test-google-client-id.apps.googleusercontent.com",
    relaxed,
  );

  return {
    apiBaseUrl,
    firebase: {
      apiKey: firebaseApiKey,
      authDomain: firebaseAuthDomain,
      projectId: firebaseProjectId,
    },
    googleOAuthClientId,
    userSpaUrl,
    userSpaHomeUrl: deriveHomeUrl(userSpaUrl),
  };
}

export function hasFirebaseConfig(config: ExtensionConfig): boolean {
  return config.firebase !== null;
}
