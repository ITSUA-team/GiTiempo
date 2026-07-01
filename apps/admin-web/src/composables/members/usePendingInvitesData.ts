import { computed, ref, type ComputedRef, type Ref } from 'vue';
import type { WorkspaceInviteListResponse } from '@gitiempo/shared';

import {
  adminMembersClient,
  type AdminMembersClient,
} from '@/services/admin-members-client';
import { getPendingInviteRows } from '@/lib/member-management';

interface LoadInvitesOptions {
  errorAction: string;
  setErrorState?: boolean;
}

interface UsePendingInvitesDataOptions {
  accessToken: Ref<string | null> | ComputedRef<string | null>;
  client?: Pick<AdminMembersClient, 'listInvites'>;
  onError?: (message: string, error: unknown, action: string) => void;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'An unexpected error occurred';
}

export function usePendingInvitesData({
  accessToken,
  client = adminMembersClient,
  onError,
}: UsePendingInvitesDataOptions) {
  const invites = ref<WorkspaceInviteListResponse>([]);
  const invitesLoading = ref(true);
  const invitesLoadError = ref<string | null>(null);
  const pendingInviteRows = computed(() => getPendingInviteRows(invites.value));

  async function loadInvites({
    errorAction,
    setErrorState = false,
  }: LoadInvitesOptions): Promise<void> {
    if (!accessToken.value) {
      return;
    }

    invitesLoading.value = true;
    if (setErrorState) {
      invitesLoadError.value = null;
    }

    try {
      invites.value = await client.listInvites();
      invitesLoadError.value = null;
    } catch (error) {
      const message = getErrorMessage(error);
      if (setErrorState && invites.value.length === 0) {
        invitesLoadError.value = message;
      }
      onError?.(message, error, errorAction);
    } finally {
      invitesLoading.value = false;
    }
  }

  async function refreshPendingInvites(): Promise<void> {
    await loadInvites({ errorAction: 'refresh-pending-invites' });
  }

  return {
    invites,
    invitesLoadError,
    invitesLoading,
    loadInvites,
    pendingInviteRows,
    refreshPendingInvites,
  };
}
