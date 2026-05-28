import {
  createAuthHttpClient,
  createCurrentUserClient,
  createDefaultAuthRuntime,
  type AuthRuntime,
} from "@gitiempo/web-shared/auth";

import { appEnv } from "@/config/env";
import { getFirebaseAuth, hasFirebaseConfig } from "@/lib/firebase";

function createConfiguredAuthRuntime(): AuthRuntime {
  const authClient = createAuthHttpClient({ apiBaseUrl: appEnv.apiBaseUrl });
  const currentUserClient = createCurrentUserClient({ apiBaseUrl: appEnv.apiBaseUrl });

  return createDefaultAuthRuntime({
    authClient,
    currentUserClient,
    getFirebaseAuth,
    hasFirebaseConfig,
  });
}

let authRuntime: AuthRuntime | null = null;

export function getAuthRuntime(): AuthRuntime {
  authRuntime ??= createConfiguredAuthRuntime();

  return authRuntime;
}

export function setAuthRuntimeForTesting(runtime: AuthRuntime): void {
  authRuntime = runtime;
}

export function resetAuthRuntimeForTesting(): void {
  authRuntime = null;
}

export type { AuthRuntime };
