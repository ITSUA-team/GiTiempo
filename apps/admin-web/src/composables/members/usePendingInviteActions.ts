import { ref, type ComputedRef, type Ref } from 'vue';
import type { WorkspaceInviteResponse } from '@gitiempo/shared';

import {
  adminMembersClient,
  type AdminMembersClient,
} from '@/services/admin-members-client';

interface UsePendingInviteActionsOptions {
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

    resendingInviteId.value = invite.id;

    try {
      await client.resendInvite(invite.id);
      onSuccess(`Invitation resent to ${invite.email}.`);
      await refreshPendingInvites();
    } catch (error) {
      onError(
        getErrorMessage(error, 'Failed to resend invite'),
        error,
        'resend-invite',
      );
    } finally {
      resendingInviteId.value = null;
    }
  }

  function handleCancelInvite(invite: WorkspaceInviteResponse): void {
    requireConfirmation(
      `${invite.email} will lose access to this invitation. This action cannot be undone.`,
      'Cancel invite?',
      'Cancel invite',
      async () => {
        if (!accessToken.value) {
          return;
        }

        cancelingInviteId.value = invite.id;

        try {
          await client.cancelInvite(invite.id);
          onSuccess(`Invitation canceled for ${invite.email}.`);
          await refreshPendingInvites();
        } catch (error) {
          onError(
            getErrorMessage(error, 'Failed to cancel invite'),
            error,
            'cancel-invite',
          );
        } finally {
          cancelingInviteId.value = null;
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
