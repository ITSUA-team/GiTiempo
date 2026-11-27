import { watch } from 'vue';
import { useRouter } from 'vue-router';
import type { WorkspaceMemberResponse, WorkspaceRole } from '@gitiempo/shared';
import { getErrorMessage } from '@gitiempo/web-shared';
import { isApiErrorStatus } from '@gitiempo/web-shared/http';
import { routeNames } from '@/constants/routes';
import { getAdminServerStateScope } from '@/lib/server-state-scope';
import { adminMembersClient } from '@/services/admin-members-client';
import { useAuthStore } from '@/stores/auth';

interface Options {
  getVisit: () => number;
  onError: (message: string, error: unknown, action: string) => void;
}

export function useMemberRoleActions({ getVisit, onError }: Options) {
  const auth = useAuthStore();
  const router = useRouter();

  async function saveRole(
    member: WorkspaceMemberResponse,
    role: WorkspaceRole,
  ): Promise<WorkspaceMemberResponse | undefined> {
    const scope = () => getAdminServerStateScope(auth.accessToken);
    const { workspaceId, userId, role: actorRole } = scope();
    if (
      !workspaceId || !userId || actorRole !== 'admin' || auth.profile?.role !== 'admin' ||
      auth.profile.id !== userId || workspaceId !== member.workspaceId ||
      role === member.role
    ) return;

    const self = member.userId === userId;
    const visit = getVisit();
    let sameSession = true;
    const stopWatching = watch(
      [() => scope().workspaceId, () => scope().userId, () => Boolean(auth.accessToken)],
      () => { sameSession = false; },
      { flush: 'sync' },
    );
    try {
      let updated: WorkspaceMemberResponse | undefined;
      try {
        updated = await adminMembersClient.updateMemberRole(member.id, { role });
      } catch (error) {
        if (!sameSession) return;
        if (visit === getVisit()) {
          onError(getErrorMessage(error, 'Failed to update member role'), error, 'update-member-role');
        }
        // An interrupted response can arrive after the server has committed a self-demotion.
        if (!self || isApiErrorStatus(error, [400, 401, 403, 404, 409, 422])) return;
      }
      if (!sameSession) return;
      if (self) {
        const outcome = await auth.reconcileOwnRoleChange({ userId, workspaceId }, role);
        if (outcome === 'restricted' && sameSession) {
          await router.replace({ name: routeNames.forbidden });
        } else if (outcome === 'unavailable' && (!auth.isAuthenticated || sameSession)) {
          await router.replace({ name: auth.isAuthenticated ? routeNames.forbidden : routeNames.login });
        }
      } else if (visit === getVisit()) {
        return updated;
      }
    } finally {
      stopWatching();
    }
  }

  return { saveRole };
}
