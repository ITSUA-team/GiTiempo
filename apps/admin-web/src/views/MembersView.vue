<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import type { WorkspaceMemberResponse } from '@gitiempo/shared';
import {
  StatCard,
  SurfaceCard,
  useIsMobileViewport,
} from '@gitiempo/web-shared';

import ManagementPageSkeleton from '@/components/loading/ManagementPageSkeleton.vue';
import MemberEditForm from '@/components/forms/MemberEditForm.vue';
import MemberInviteDialog from '@/components/forms/MemberInviteDialog.vue';
import MembersTable from '@/components/MembersTable.vue';
import PendingInvitationsCard from '@/components/PendingInvitationsCard.vue';
import RequestErrorCard from '@/components/RequestErrorCard.vue';
import { useConfirmation } from '@/composables/feedback/useConfirmation';
import { useToasts } from '@/composables/feedback/useToasts';
import { useMemberAssignmentActions } from '@/composables/members/useMemberAssignmentActions';
import { useMemberRemovalAction } from '@/composables/members/useMemberRemovalAction';
import { usePendingInviteActions } from '@/composables/members/usePendingInviteActions';
import { usePendingInvitesData } from '@/composables/members/usePendingInvitesData';
import { useWorkspaceMembersData } from '@/composables/members/useWorkspaceMembersData';
import { useMembersTableState } from '@/composables/useMembersTableState';
import { deriveMemberManagementStats } from '@/lib/member-management';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const { requireConfirmation } = useConfirmation();
const { errorToast, successToast } = useToasts();
const isMobileViewport = useIsMobileViewport();

const inviteDialogVisible = ref(false);

const accessToken = computed(() => authStore.accessToken);
const currentUserId = computed(() => authStore.profile?.id ?? null);

function notifyMembersError(
  message: string,
  error: unknown,
  action: string,
): void {
  errorToast(message, {
    error,
    logContext: { action, feature: 'members' },
  });
}

const {
  initialLoaded,
  loadError,
  loading,
  loadMembersData,
  members,
  projects,
  refreshMembers,
} = useWorkspaceMembersData({
  accessToken,
  onError: notifyMembersError,
});

const {
  invitesLoadError,
  invitesLoading,
  loadInvites,
  pendingInviteRows,
  refreshPendingInvites,
} = usePendingInvitesData({
  accessToken,
  onError: notifyMembersError,
});

const {
  collapseRow: collapseMemberRow,
  emptyDescription: memberTableEmptyDescription,
  expandedRows: memberTableExpandedRows,
  filters: memberTableFilters,
  lastActiveFilterOptions,
  projectFilterOptions,
  roleFilterOptions,
  rows: memberTableRows,
  setExpandedRows: setMemberTableExpandedRows,
  toggleExpansion: toggleMemberExpansion,
  updateFilters: updateMemberTableFilters,
} = useMembersTableState({
  currentUserId,
  members,
  projects,
});

const memberStats = computed(() =>
  deriveMemberManagementStats({
    invitesLoadError: invitesLoadError.value,
    members: members.value,
    pendingInviteRows: pendingInviteRows.value,
  }),
);

const { handleAssignmentsSubmitted, savingMemberAssignmentId } =
  useMemberAssignmentActions({
    accessToken,
    collapseMemberRow,
    onError: notifyMembersError,
    onSuccess: successToast,
    projects,
    refreshMembers,
  });

const { handleRemoveMember } = useMemberRemovalAction({
  accessToken,
  onError: notifyMembersError,
  onSuccess: successToast,
  refreshMembers,
  requireConfirmation,
});

const {
  cancelingInviteId,
  handleCancelInvite,
  handleInviteCreated,
  handleResendInvite,
  resendingInviteId,
} = usePendingInviteActions({
  accessToken,
  onError: notifyMembersError,
  onSuccess: successToast,
  refreshPendingInvites,
  requireConfirmation,
});

async function fetchAll(): Promise<void> {
  await Promise.all([
    loadMembersData({
      errorAction: 'load-members',
      setError: true,
      setInitialLoaded: true,
    }),
    loadInvites({
      errorAction: 'load-pending-invites',
      setErrorState: true,
    }),
  ]);
}

function handleEditMember(member: WorkspaceMemberResponse): void {
  toggleMemberExpansion(member);
}

onMounted(fetchAll);
</script>

<template>
  <div class="flex flex-col gap-6">
    <template v-if="loading && !initialLoaded">
      <ManagementPageSkeleton variant="members" />
    </template>

    <template v-else-if="loadError && !loading">
      <RequestErrorCard
        title="Failed to load members"
        :message="loadError"
        @retry="fetchAll"
      />
    </template>

    <template v-else>
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Active Members"
          :value="memberStats.activeMembers"
        />
        <StatCard
          label="Pending Invites"
          :value="memberStats.pendingInvites"
        />
        <StatCard
          label="PMs Assigned"
          :value="memberStats.pmsAssigned"
        />
      </div>

      <SurfaceCard padding-class="p-5">
        <MembersTable
          :empty-description="memberTableEmptyDescription"
          :expanded-rows="memberTableExpandedRows"
          :filters="memberTableFilters"
          :is-mobile-viewport="isMobileViewport"
          :last-active-filter-options="lastActiveFilterOptions"
          :loading="loading"
          :project-filter-options="projectFilterOptions"
          :role-filter-options="roleFilterOptions"
          :rows="memberTableRows"
          @edit-member="handleEditMember"
          @invite-member="inviteDialogVisible = true"
          @update:expanded-rows="setMemberTableExpandedRows"
          @update:filters="updateMemberTableFilters"
        >
          <template #row-expansion="{ row }">
            <div
              v-if="memberTableExpandedRows[row.id]"
              class="flex flex-col gap-3"
            >
              <MemberEditForm
                :can-assign-pm="row.canAssignPm"
                :can-remove="row.canManage"
                :member="row.member"
                :projects="projects"
                :saving="savingMemberAssignmentId === row.id"
                @remove="handleRemoveMember(row.member)"
                @save="handleAssignmentsSubmitted(row, $event)"
                @cancelled="collapseMemberRow(row.member)"
              />
            </div>
          </template>
        </MembersTable>
      </SurfaceCard>

      <PendingInvitationsCard
        :canceling-invite-id="cancelingInviteId"
        :error-message="invitesLoadError"
        :loading="invitesLoading"
        :pending-invites="pendingInviteRows"
        :resending-invite-id="resendingInviteId"
        @retry="loadInvites({ errorAction: 'retry-pending-invites', setErrorState: true })"
        @resend="handleResendInvite"
        @cancel="handleCancelInvite"
      />
    </template>

    <MemberInviteDialog
      v-model:visible="inviteDialogVisible"
      @created="handleInviteCreated"
    />
  </div>
</template>
