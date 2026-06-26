import type { ComputedRef, Ref } from 'vue';
import type { WorkspaceMemberResponse } from '@gitiempo/shared';

import {
  adminMembersClient,
  type AdminMembersClient,
} from '@/services/admin-members-client';
import { getMemberDisplayName } from '@/lib/member-management';

/* eslint-disable no-unused-vars */
interface UseMemberRemovalActionOptions {
  accessToken: Ref<string | null> | ComputedRef<string | null>;
  client?: Pick<AdminMembersClient, 'removeMember'>;
  onError: (message: string, error: unknown, action: string) => void;
  onSuccess: (message: string) => void;
  refreshMembers: () => Promise<void>;
  requireConfirmation: (
    message: string,
    header: string,
    acceptLabel: string,
    accept: () => void,
  ) => void;
}
/* eslint-enable no-unused-vars */

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Failed to remove member';
}

export function useMemberRemovalAction({
  accessToken,
  client = adminMembersClient,
  onError,
  onSuccess,
  refreshMembers,
  requireConfirmation,
}: UseMemberRemovalActionOptions) {
  function handleRemoveMember(member: WorkspaceMemberResponse): void {
    const memberName = getMemberDisplayName(member);

    requireConfirmation(
      `${memberName} will be removed from this workspace. This action cannot be undone.`,
      'Remove member?',
      'Remove',
      async () => {
        if (!accessToken.value) {
          return;
        }

        try {
          await client.removeMember(member.id);
          onSuccess(`${memberName} has been removed.`);
          await refreshMembers();
        } catch (error) {
          onError(getErrorMessage(error), error, 'remove-member');
        }
      },
    );
  }

  return { handleRemoveMember };
}
