export interface ExtensionConfig {
  apiBaseUrl: string;
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
  } | null;
  userSpaUrl: string;
}

interface ExtensionEnv {
  DEV?: boolean;
  MODE?: string;
  VITE_EXTENSION_API_BASE_URL?: string;
  VITE_EXTENSION_FIREBASE_API_KEY?: string;
  VITE_EXTENSION_FIREBASE_AUTH_DOMAIN?: string;
  VITE_EXTENSION_FIREBASE_PROJECT_ID?: string;
  VITE_EXTENSION_USER_SPA_URL?: string;
}

export function normalizeUrl(value: string, fallback: string): string {
  const trimmed = value.trim();

  return (trimmed || fallback).replace(/\/$/, "");
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

  return {
    apiBaseUrl,
    firebase: {
      apiKey: firebaseApiKey,
      authDomain: firebaseAuthDomain,
      projectId: firebaseProjectId,
    },
    userSpaUrl,
  };
}

export function hasFirebaseConfig(config: ExtensionConfig): boolean {
  return config.firebase !== null;
}
