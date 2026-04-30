import {
  createAuthHttpClient,
  createAuthRuntimeController,
  createCurrentUserClient,
  createDefaultAuthRuntime,
  type AuthRuntime,
} from "@gitiempo/web-shared/auth";

import { getFirebaseAuth, hasFirebaseConfig } from "@/lib/firebase";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const authClient = createAuthHttpClient({ apiBaseUrl });
const currentUserClient = createCurrentUserClient({ apiBaseUrl });
const controller = createAuthRuntimeController(
  createDefaultAuthRuntime({
    authClient,
    currentUserClient,
    getFirebaseAuth,
    hasFirebaseConfig,
  }),
);

export function getAuthRuntime(): AuthRuntime {
  return controller.getAuthRuntime();
}

export function setAuthRuntimeForTesting(runtime: AuthRuntime): void {
  controller.setAuthRuntimeForTesting(runtime);
}

export function resetAuthRuntimeForTesting(): void {
  controller.resetAuthRuntimeForTesting();
}

export type { AuthRuntime };
