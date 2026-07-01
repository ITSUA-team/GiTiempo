import { defineStore } from "pinia";
import { computed } from "vue";
import {
  createAuthProfilePresentation,
  createAuthSessionCore,
  createWorkspaceMembershipSession,
} from "@gitiempo/web-shared/auth";

import { queryClient } from "@/query-client";
import { getAuthRuntime } from "@/services/auth-runtime";

function clearAuthenticatedQueryCache(): void {
  queryClient.clear();
}

export const useAuthStore = defineStore("auth", () => {
  let clearWorkspaceMemberships = (): void => undefined;
  let resetWorkspaceContext = (): void => undefined;
  const session = createAuthSessionCore({
    getAuthRuntime,
    onClearSession: () => {
      resetWorkspaceContext();
      clearAuthenticatedQueryCache();
    },
    onLoginSuccess: () => {
      clearWorkspaceMemberships();
      clearAuthenticatedQueryCache();
    },
  });
  const workspaceSession = createWorkspaceMembershipSession({
    accessToken: session.baseSession.accessToken,
    getAuthRuntime,
    initialWorkspaceName: "Workspace Admin",
    switchWorkspace: session.baseSession.switchWorkspace,
  });
  clearWorkspaceMemberships = workspaceSession.clearWorkspaceMemberships;
  resetWorkspaceContext = workspaceSession.resetWorkspaceContext;
  const profilePresentation = createAuthProfilePresentation(session.profile, {
    displayNameFallback: "Admin User",
  });
  const workspaceName = computed(() => workspaceSession.currentWorkspaceName.value);

  return {
    ...session.baseSession,
    ...profilePresentation,
    hasAlternativeWorkspaces: workspaceSession.hasAlternativeWorkspaces,
    loadWorkspaceMemberships: workspaceSession.loadWorkspaceMemberships,
    setWorkspaceName: workspaceSession.setWorkspaceName,
    switchWorkspace: workspaceSession.switchWorkspace,
    switchingWorkspaceId: workspaceSession.switchingWorkspaceId,
    workspaceMemberships: workspaceSession.workspaceMemberships,
    workspaceName,
  };
});
