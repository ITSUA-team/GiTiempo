import { ref, type ComputedRef, type Ref } from 'vue';
import type { WorkspaceInviteResponse } from '@gitiempo/shared';

import {
  adminMembersClient,
  type AdminMembersClient,
} from '@/services/admin-members-client';

interface UsePendingInviteActionsOptions {
  getVisit?: () => number;
  accessToken: Ref<string | null> | ComputedRef<string | null>;
  client?: Pick<AdminMembersClient, 'cancelInvite' | 'resendInvite'>;
  onError: (message: string, error: unknown, action: string) => void;
  onSuccess: (message: string) => void;
  refreshPendingInvites: () => Promise<void>;
  requireConfirmation: (
    message: string,
    header: string,
    acceptLabel: string,
    accept: () => void,
  ) => void;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function usePendingInviteActions({
  accessToken,
  getVisit = () => 0,
  client = adminMembersClient,
  onError,
  onSuccess,
  refreshPendingInvites,
  requireConfirmation,
}: UsePendingInviteActionsOptions) {
  const resendingInviteId = ref<string | null>(null);
  const cancelingInviteId = ref<string | null>(null);

  function handleInviteCreated(): void {
    void refreshPendingInvites();
  }

  async function handleResendInvite(invite: WorkspaceInviteResponse): Promise<void> {
    if (!accessToken.value) {
      return;
    }

    const visit = getVisit();
    resendingInviteId.value = invite.id;

    try {
      await client.resendInvite(invite.id);
      if (visit !== getVisit()) return;
      onSuccess(`Invitation resent to ${invite.email}.`);
      await refreshPendingInvites();
      if (visit !== getVisit()) return;
    } catch (error) {
      if (visit !== getVisit()) return;
      onError(
        getErrorMessage(error, 'Failed to resend invite'),
        error,
        'resend-invite',
      );
    } finally {
      if (visit === getVisit()) resendingInviteId.value = null;
    }
  }

  function handleCancelInvite(invite: WorkspaceInviteResponse): void {
    const visit = getVisit();
    requireConfirmation(
      `${invite.email} will lose access to this invitation. This action cannot be undone.`,
      'Cancel invite?',
      'Cancel invite',
      async () => {
        if (visit !== getVisit() || !accessToken.value) {
          return;
        }

        cancelingInviteId.value = invite.id;

        try {
          await client.cancelInvite(invite.id);
          if (visit !== getVisit()) return;
          await refreshPendingInvites();
          if (visit !== getVisit()) return;
        } catch (error) {
          if (visit !== getVisit()) return;
          onError(
            getErrorMessage(error, 'Failed to cancel invite'),
            error,
            'cancel-invite',
          );
        } finally {
          if (visit === getVisit()) cancelingInviteId.value = null;
        }
      },
    );
  }

  return {
    cancelingInviteId,
    handleCancelInvite,
    handleInviteCreated,
    handleResendInvite,
    resendingInviteId,
  };
}
