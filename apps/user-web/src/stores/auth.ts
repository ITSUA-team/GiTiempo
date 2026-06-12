import { defineStore } from "pinia";
import { computed } from "vue";
import {
  createAuthProfilePresentation,
  createAuthSessionCore,
} from "@gitiempo/web-shared/auth";

import { queryClient } from "@/query-client";
import { getAuthRuntime } from "@/services/auth-runtime";

function clearAuthenticatedQueryCache(): void {
  queryClient.clear();
}

export const useAuthStore = defineStore("auth", () => {
  const session = createAuthSessionCore({
    getAuthRuntime,
    onClearSession: clearAuthenticatedQueryCache,
    onLoginSuccess: clearAuthenticatedQueryCache,
  });
  const profilePresentation = createAuthProfilePresentation(session.profile, {
    displayNameFallback: "Workspace member",
  });
  const workspaceName = computed(() => "Workspace Alpha");

  return {
    ...session.baseSession,
    ...profilePresentation,
    establishSessionFromTokenPair: session.establishSessionFromTokenPair,
    loginWithFirebaseToken: session.loginWithFirebaseToken,
    updateProfile: session.updateProfile,
    workspaceName,
  };
});
