import { defineStore } from "pinia";
import { computed, ref } from "vue";
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
  const currentWorkspaceName = ref("Workspace Admin");
  const session = createAuthSessionCore({
    getAuthRuntime,
    onClearSession: () => {
      currentWorkspaceName.value = "Workspace Admin";
      clearAuthenticatedQueryCache();
    },
    onLoginSuccess: clearAuthenticatedQueryCache,
  });
  const profilePresentation = createAuthProfilePresentation(session.profile, {
    displayNameFallback: "Admin User",
  });
  const workspaceName = computed(() => currentWorkspaceName.value);

  function setWorkspaceName(name: string): void {
    currentWorkspaceName.value = name;
  }

  return {
    ...session.baseSession,
    ...profilePresentation,
    setWorkspaceName,
    workspaceName,
  };
});
