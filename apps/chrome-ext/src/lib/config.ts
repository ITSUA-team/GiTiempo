export interface ExtensionConfig {
  apiBaseUrl: string;
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
  } | null;
  userSpaUrl: string;
}

export function normalizeUrl(value: string, fallback: string): string {
  const trimmed = value.trim();

  return (trimmed || fallback).replace(/\/$/, "");
}

export function getExtensionConfig(
  env: {
    VITE_EXTENSION_API_BASE_URL?: string;
    VITE_EXTENSION_FIREBASE_API_KEY?: string;
    VITE_EXTENSION_FIREBASE_AUTH_DOMAIN?: string;
    VITE_EXTENSION_FIREBASE_PROJECT_ID?: string;
    VITE_EXTENSION_USER_SPA_URL?: string;
  } = import.meta.env,
): ExtensionConfig {
  const apiBaseUrl = normalizeUrl(
    env.VITE_EXTENSION_API_BASE_URL ?? "",
    "http://localhost:3000",
  );
  const userSpaUrl = normalizeUrl(
    env.VITE_EXTENSION_USER_SPA_URL ?? "",
    "http://localhost:5173/login",
  );

  const firebaseApiKey = env.VITE_EXTENSION_FIREBASE_API_KEY?.trim() ?? "";
  const firebaseAuthDomain =
    env.VITE_EXTENSION_FIREBASE_AUTH_DOMAIN?.trim() ?? "";
  const firebaseProjectId =
    env.VITE_EXTENSION_FIREBASE_PROJECT_ID?.trim() ?? "";

  return {
    apiBaseUrl,
    firebase:
      firebaseApiKey && firebaseAuthDomain && firebaseProjectId
        ? {
            apiKey: firebaseApiKey,
            authDomain: firebaseAuthDomain,
            projectId: firebaseProjectId,
          }
        : null,
    userSpaUrl,
  };
}

export function hasFirebaseConfig(config: ExtensionConfig): boolean {
  return config.firebase !== null;
}
