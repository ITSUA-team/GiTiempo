import { defineStore } from "pinia";
import { computed } from "vue";
import {
  createAuthProfilePresentation,
  createAuthSessionCore,
  createWorkspaceMembershipSession,
} from "@gitiempo/web-shared/auth";
import { isApiErrorStatus } from "@gitiempo/web-shared/http";

import { queryClient } from "@/query-client";
import { getAuthRuntime } from "@/services/auth-runtime";

function clearAuthenticatedQueryCache(): void {
  queryClient.clear();
}

export const useAuthStore = defineStore("auth", () => {
  let clearWorkspaceMemberships = (): void => undefined;
  let resetWorkspaceContext = (): void => undefined;
  let authorizationRefreshVersion = 0;
  const session = createAuthSessionCore({
    getAuthRuntime,
    onClearSession: () => {
      authorizationRefreshVersion += 1;
      resetWorkspaceContext();
      clearAuthenticatedQueryCache();
    },
    onSessionContextChanged: () => {
      authorizationRefreshVersion += 1;
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

  async function refreshAuthorizationContext(): Promise<boolean> {
    const currentAccessToken = session.baseSession.accessToken.value;
    const refreshVersion = ++authorizationRefreshVersion;

    if (!currentAccessToken) {
      return false;
    }

    const previousProfile = session.baseSession.profile.value;
    const previousMemberships = workspaceSession.workspaceMemberships.value;
    let expectedAccessToken = currentAccessToken;

    async function loadAuthorizationContext(accessToken: string) {
      return Promise.all([
        getAuthRuntime().getCurrentUser(accessToken),
        getAuthRuntime().listCurrentUserWorkspaces(accessToken),
      ]);
    }

    try {
      let context: Awaited<ReturnType<typeof loadAuthorizationContext>>;

      try {
        context = await loadAuthorizationContext(expectedAccessToken);
      } catch (error) {
        if (!isApiErrorStatus(error, [401])) {
          throw error;
        }

        if (
          refreshVersion !== authorizationRefreshVersion ||
          session.baseSession.accessToken.value !== expectedAccessToken
        ) {
          return false;
        }

        expectedAccessToken = await session.baseSession.refreshAccessToken();

        if (
          refreshVersion !== authorizationRefreshVersion ||
          session.baseSession.accessToken.value !== expectedAccessToken
        ) {
          return false;
        }

        context = await loadAuthorizationContext(expectedAccessToken);
      }

      const [profile, membershipsResponse] = context;

      if (
        refreshVersion !== authorizationRefreshVersion ||
        session.baseSession.accessToken.value !== expectedAccessToken
      ) {
        return false;
      }

      const authorizationChanged =
        previousProfile?.id !== profile.id ||
        previousProfile?.role !== profile.role ||
        JSON.stringify(previousMemberships) !==
          JSON.stringify(membershipsResponse.items);

      session.baseSession.profile.value = profile;
      workspaceSession.workspaceMemberships.value = membershipsResponse.items;
      const currentMembership = membershipsResponse.items.find(
        (membership) => membership.isCurrent,
      );
      if (currentMembership) {
        workspaceSession.setWorkspaceName(currentMembership.workspaceName);
      }

      if (authorizationChanged) {
        clearAuthenticatedQueryCache();
      } else {
        await queryClient.invalidateQueries();
      }

      return authorizationChanged;
    } catch {
      if (
        refreshVersion !== authorizationRefreshVersion ||
        session.baseSession.accessToken.value !== expectedAccessToken
      ) {
        return false;
      }

      session.baseSession.profile.value = null;
      clearWorkspaceMemberships();
      clearAuthenticatedQueryCache();
      return true;
    }
  }

  return {
    ...session.baseSession,
    ...profilePresentation,
    hasAlternativeWorkspaces: workspaceSession.hasAlternativeWorkspaces,
    loadWorkspaceMemberships: workspaceSession.loadWorkspaceMemberships,
    refreshAuthorizationContext,
    setWorkspaceName: workspaceSession.setWorkspaceName,
    switchWorkspace: workspaceSession.switchWorkspace,
    switchingWorkspaceId: workspaceSession.switchingWorkspaceId,
    workspaceMemberships: workspaceSession.workspaceMemberships,
    workspaceName,
  };
});
