import { defineStore } from "pinia";
import { computed, shallowRef } from "vue";
import { createAuthSessionCore } from "@gitiempo/web-shared/auth";

import { getAuthRuntime } from "@/services/auth-runtime";

export const useAuthStore = defineStore("auth", () => {
  const currentWorkspaceName = shallowRef("Workspace Admin");
  const session = createAuthSessionCore({
    getAuthRuntime,
    onClearSession: () => {
      currentWorkspaceName.value = "Workspace Admin";
    },
  });
  const displayName = computed(() => session.profile.value?.displayName ?? "Admin User");
  const workspaceName = computed(() => currentWorkspaceName.value);
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

  function setWorkspaceName(name: string): void {
    currentWorkspaceName.value = name;
  }

  return {
    accessToken: session.accessToken,
    bootstrapComplete: session.bootstrapComplete,
    bootstrapSession: session.bootstrapSession,
    displayName,
    isAuthenticated: session.isAuthenticated,
    isBootstrapping: session.isBootstrapping,
    isSubmitting: session.isSubmitting,
    loginWithEmailPassword: session.loginWithEmailPassword,
    loginWithGoogle: session.loginWithGoogle,
    logout: session.logout,
    profile: session.profile,
    setWorkspaceName,
    userInitials,
    workspaceName,
  };
});
