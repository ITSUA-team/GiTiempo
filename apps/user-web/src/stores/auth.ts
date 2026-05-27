import { defineStore } from "pinia";
import { computed } from "vue";
import {
  createAuthProfilePresentation,
  createAuthSessionCore,
} from "@gitiempo/web-shared/auth";

import { getAuthRuntime } from "@/services/auth-runtime";

export const useAuthStore = defineStore("auth", () => {
  const session = createAuthSessionCore({ getAuthRuntime });
  const profilePresentation = createAuthProfilePresentation(session.profile, {
    displayNameFallback: "Workspace member",
  });
  const workspaceName = computed(() => "Workspace Alpha");

  return {
    ...session.baseSession,
    ...profilePresentation,
    loginWithFirebaseToken: session.loginWithFirebaseToken,
    updateProfile: session.updateProfile,
    workspaceName,
  };
});
