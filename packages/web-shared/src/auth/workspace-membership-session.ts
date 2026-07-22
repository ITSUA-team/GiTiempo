import type { CurrentUserWorkspaceMembershipResponse } from "@gitiempo/shared";
import { computed, ref, type Ref } from "vue";

import type { AuthRuntime } from "./runtime";
import type { WorkspaceSwitchSessionResult } from "./session-core";

export type WorkspaceSwitchResult = WorkspaceSwitchSessionResult &
  (
    | {
      membershipsReloaded: true;
      reloadError: null;
    }
    | {
      membershipsReloaded: false;
      reloadError: unknown;
    }
  );

interface CreateWorkspaceMembershipSessionOptions {
  accessToken: Ref<string | null>;
  getAuthRuntime(): Pick<AuthRuntime, "listCurrentUserWorkspaces">;
  initialWorkspaceName: string;
   
  switchWorkspace: (
    workspaceId: string,
  ) => Promise<WorkspaceSwitchSessionResult>;
}

export function createWorkspaceMembershipSession({
  accessToken,
  getAuthRuntime,
  initialWorkspaceName,
  switchWorkspace: switchWorkspaceSession,
}: CreateWorkspaceMembershipSessionOptions) {
  const currentWorkspaceName = ref(initialWorkspaceName);
  const workspaceMemberships = ref<CurrentUserWorkspaceMembershipResponse[]>([]);
  const switchingWorkspaceId = ref<string | null>(null);
  const hasAlternativeWorkspaces = computed(() =>
    workspaceMemberships.value.some((membership) => !membership.isCurrent),
  );

  function clearWorkspaceMemberships(): void {
    workspaceMemberships.value = [];
  }

  function resetWorkspaceContext(): void {
    currentWorkspaceName.value = initialWorkspaceName;
    workspaceMemberships.value = [];
    switchingWorkspaceId.value = null;
  }

  function setWorkspaceName(name: string): void {
    currentWorkspaceName.value = name;
  }

  async function loadWorkspaceMemberships(): Promise<
    CurrentUserWorkspaceMembershipResponse[]
  > {
    const currentAccessToken = accessToken.value;

    if (!currentAccessToken) {
      workspaceMemberships.value = [];
      return [];
    }

    const response = await getAuthRuntime().listCurrentUserWorkspaces(
      currentAccessToken,
    );

    workspaceMemberships.value = response.items;
    currentWorkspaceName.value =
      response.items.find((membership) => membership.isCurrent)?.workspaceName ??
      currentWorkspaceName.value;

    return response.items;
  }

  async function switchWorkspace(
    workspaceId: string,
  ): Promise<WorkspaceSwitchResult> {
    switchingWorkspaceId.value = workspaceId;

    try {
      const sessionResult = await switchWorkspaceSession(workspaceId);

      try {
        await loadWorkspaceMemberships();

        return {
          ...sessionResult,
          membershipsReloaded: true,
          reloadError: null,
        };
      } catch (reloadError) {
        return {
          ...sessionResult,
          membershipsReloaded: false,
          reloadError,
        };
      }
    } finally {
      switchingWorkspaceId.value = null;
    }
  }

  return {
    clearWorkspaceMemberships,
    currentWorkspaceName,
    hasAlternativeWorkspaces,
    loadWorkspaceMemberships,
    resetWorkspaceContext,
    setWorkspaceName,
    switchWorkspace,
    switchingWorkspaceId,
    workspaceMemberships,
  };
}
