import { ref, type ComputedRef, type Ref } from 'vue';

import { getErrorMessage } from '@gitiempo/web-shared';

import {
  adminMembersClient,
  type AdminMembersClient,
} from '@/services/admin-members-client';
import type { MembersTableRow } from '@/lib/members-table';

interface UseMemberPermissionActionsOptions {
  accessToken: Ref<string | null> | ComputedRef<string | null>;
  client?: Pick<AdminMembersClient, 'updateMemberPermissions'>;
  onError: (message: string, error: unknown, action: string) => void;
  refreshMembers: () => Promise<void>;
}

export function useMemberPermissionActions({
  accessToken,
  client = adminMembersClient,
  onError,
  refreshMembers,
}: UseMemberPermissionActionsOptions) {
  const updatingPermissionMemberId = ref<string | null>(null);

  async function handleUpdateInvoicePermission(
    row: MembersTableRow,
    value: boolean,
  ): Promise<void> {
    if (!accessToken.value) {
      return;
    }

    updatingPermissionMemberId.value = row.member.id;

    try {
      await client.updateMemberPermissions(row.member.id, {
        canViewInvoices: value,
      });

      await refreshMembers();
    } catch (error) {
      onError(
        getErrorMessage(error, 'Failed to update invoice permission'),
        error,
        'update-invoice-permission',
      );
      // The refresh restores the authoritative permission state, which also
      // reverts the toggle the user just flipped.
      await refreshMembers();
    } finally {
      updatingPermissionMemberId.value = null;
    }
  }

  return {
    handleUpdateInvoicePermission,
    updatingPermissionMemberId,
  };
}