import { defineStore } from "pinia";
import { computed } from "vue";
import { createAuthSessionCore } from "@gitiempo/web-shared/auth";

import { getAuthRuntime } from "@/services/auth-runtime";

export const useAuthStore = defineStore("auth", () => {
  const session = createAuthSessionCore({ getAuthRuntime });
  const displayName = computed(
    () => session.profile.value?.displayName ?? "Workspace member",
  );
  const workspaceName = computed(() => "Workspace Alpha");
  const userInitials = computed(() => {
    const source =
      session.profile.value?.displayName?.trim() ||
      session.profile.value?.email ||
      displayName.value;
    const parts = source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase());

    return parts.join("") || "GT";
  });

  return {
    accessToken: session.accessToken,
    bootstrapComplete: session.bootstrapComplete,
    bootstrapSession: session.bootstrapSession,
    displayName,
    isAuthenticated: session.isAuthenticated,
    isBootstrapping: session.isBootstrapping,
    isSubmitting: session.isSubmitting,
    loginWithFirebaseToken: session.loginWithFirebaseToken,
    loginWithEmailPassword: session.loginWithEmailPassword,
    loginWithGoogle: session.loginWithGoogle,
    logout: session.logout,
    profile: session.profile,
    refreshAccessToken: session.refreshAccessToken,
    updateProfile: session.updateProfile,
    userInitials,
    workspaceName,
  };
});
