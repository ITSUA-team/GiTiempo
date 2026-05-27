import { defineStore } from "pinia";
import { computed, shallowRef } from "vue";
import {
  createAuthProfilePresentation,
  createAuthSessionCore,
} from "@gitiempo/web-shared/auth";

import { getAuthRuntime } from "@/services/auth-runtime";

export const useAuthStore = defineStore("auth", () => {
  const currentWorkspaceName = shallowRef("Workspace Admin");
  const session = createAuthSessionCore({
    getAuthRuntime,
    onClearSession: () => {
      currentWorkspaceName.value = "Workspace Admin";
    },
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
