import type { WorkspaceRole } from "@gitiempo/shared";
import { readAccessTokenServerStateScope } from "@gitiempo/web-shared/query";
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
  let roleRenewal: symbol | null = null;
  const session = createAuthSessionCore({
    getAuthRuntime,
    onClearSession: () => {
      roleRenewal = null;
      authorizationRefreshVersion += 1;
      resetWorkspaceContext();
      clearAuthenticatedQueryCache();
    },
    onSessionContextChanged: () => {
      roleRenewal = null;
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

  async function loadAuthorizationContext(accessToken: string) {
    return Promise.all([
      getAuthRuntime().getCurrentUser(accessToken),
      getAuthRuntime().listCurrentUserWorkspaces(accessToken),
    ]);
  }

  function setAuthorizationContext(
    [profile, membershipsResponse]: Awaited<ReturnType<typeof loadAuthorizationContext>>,
  ): void {
    session.baseSession.profile.value = profile;
    workspaceSession.workspaceMemberships.value = membershipsResponse.items;
    const currentMembership = membershipsResponse.items.find(
      (membership) => membership.isCurrent,
    );
    if (currentMembership) {
      workspaceSession.setWorkspaceName(currentMembership.workspaceName);
    }
  }

  async function reconcileOwnRoleChange(
    expected: { userId: string; workspaceId: string },
    expectedRole?: WorkspaceRole,
  ): Promise<"admin" | "restricted" | "unavailable" | "superseded"> {
    const scope = readAccessTokenServerStateScope(session.accessToken.value);
    if (
      scope.userId !== expected.userId ||
      scope.workspaceId !== expected.workspaceId
    ) {
      return "superseded";
    }

    const renewal = Symbol();
    roleRenewal = renewal;
    authorizationRefreshVersion += 1;
    session.profile.value = null;
    clearWorkspaceMemberships();
    clearAuthenticatedQueryCache();

    try {
      // A rotation already in flight when the mutation committed can still carry the old role.
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const token = await session.refreshAccessToken();
        if (roleRenewal !== renewal) return "superseded";
        const renewed = readAccessTokenServerStateScope(token);
        if (renewed.userId !== expected.userId || renewed.workspaceId !== expected.workspaceId) {
          break;
        }

        const context = await loadAuthorizationContext(token);
        if (roleRenewal !== renewal) return "superseded";
        const [profile, memberships] = context;
        const membership = memberships.items.find((item) => item.isCurrent);
        if (profile.id !== expected.userId || membership?.workspaceId !== expected.workspaceId) {
          break;
        }

        if (
          profile.role === renewed.role &&
          membership.role === renewed.role &&
          (expectedRole === undefined || renewed.role === expectedRole)
        ) {
          setAuthorizationContext(context);
          return profile.role === "admin" ? "admin" : "restricted";
        }
      }
      session.clearSession();
      return "unavailable";
    } catch {
      if (roleRenewal !== renewal && session.accessToken.value) return "superseded";
      session.clearSession();
      return "unavailable";
    } finally {
      if (roleRenewal === renewal) roleRenewal = null;
    }
  }

  async function refreshAuthorizationContext(): Promise<boolean> {
    if (roleRenewal) return false;
    const currentAccessToken = session.baseSession.accessToken.value;
    const refreshVersion = ++authorizationRefreshVersion;

    if (!currentAccessToken) {
      return false;
    }

    const previousProfile = session.baseSession.profile.value;
    const previousMemberships = workspaceSession.workspaceMemberships.value;
    let expectedAccessToken = currentAccessToken;

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
        previousProfile?.canViewInvoices !== profile.canViewInvoices ||
        JSON.stringify(previousMemberships) !==
          JSON.stringify(membershipsResponse.items);

      setAuthorizationContext(context);

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
    reconcileOwnRoleChange,
    refreshAuthorizationContext,
    setWorkspaceName: workspaceSession.setWorkspaceName,
    switchWorkspace: workspaceSession.switchWorkspace,
    switchingWorkspaceId: workspaceSession.switchingWorkspaceId,
    workspaceMemberships: workspaceSession.workspaceMemberships,
    workspaceName,
  };
});
